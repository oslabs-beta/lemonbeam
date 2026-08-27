// Repository analyzer coordinator — discover, classify, chunk. NOT the
// whole-scan coordinator; that's pipelineManager.ts, which calls this file
// as one step. Does not talk to GitHub, generate guides, or run cleanup.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { discoverFiles } from "./discoverFiles.js";
import { classifyFile } from "./classifyFile.js";
import { chunkFile } from "../chunking/chunkFile.js";
import type { Chunk, ChunkInput } from "../types/chunk.js";

// One file that failed to become chunks, and why. pipelineManager.ts passes
// a list of these to orchestration/generateGuide.ts, which folds them into
// the guide's "Uncertainties and Missing Information" section (see
// DECISIONS.md > "Skipped Files Are Not Fatal, and Are Reported").
type SkippedFile = {
    filePath: string;
    reason: string;
};

// scanRepository's return shape. In memory only for the MVP — no SQLite
// write happens here (see DECISIONS.md > "In-Memory Chunk Storage for the
// MVP, SQLite as a Stretch Goal").
type ScanResult = {
    chunks: Chunk[];
    skippedFiles: SkippedFile[];
};

async function scanRepository(repoLocalPath: string, scanId: string): Promise<ScanResult>
{
    const filePaths = await discoverFiles(repoLocalPath);

    // Process all files in parallel using Promise.all
    const results = await Promise.all(
        filePaths.map(async (filePath): Promise<{ chunks: Chunk[]; skipped?: SkippedFile }> => {
            // A read failure (permissions, a file that vanished between
            // discovery and now, bad encoding) skips just this file instead of
            // aborting the whole scan — one bad file must never take down an
            // otherwise-analyzable repository.
            let content: string;
            try {
                content = await readFile(path.join(repoLocalPath, filePath), "utf-8");
            } catch (error) {
                return {
                    chunks: [],
                    skipped: {
                        filePath,
                        reason: error instanceof Error ? error.message : String(error),
                    },
                };
            }

            // No try/catch needed here: classifyFile only inspects the path
            // string (no disk I/O), so it can't throw.
            const { filePurpose, language } = classifyFile(filePath);

            // filePath stays repo-relative here (as returned by discoverFiles),
            // not the absolute path used to read it above — chunks must cite
            // paths a user can find in their own copy of the repo, not this
            // machine's local filesystem layout.
            const chunkInput: ChunkInput = {
                scanId,
                filePath,
                content,
                filePurpose,
                language,
            };

            // chunkFile never throws to its caller — it always returns a
            // ChunkResult, so the only branch needed here is ok/not-ok, not a
            // try/catch.
            const result = chunkFile(chunkInput);

            if (!result.ok) {
                return {
                    chunks: [],
                    skipped: { filePath: result.filePath, reason: result.reason },
                };
            }

            return { chunks: result.chunks };
        })
    );

    // Aggregate results from parallel execution
    const chunks: Chunk[] = [];
    const skippedFiles: SkippedFile[] = [];

    for (const res of results) {
        if (res.skipped) {
            skippedFiles.push(res.skipped);
        }
        if (res.chunks.length > 0) {
            chunks.push(...res.chunks);
        }
    }

    return { chunks, skippedFiles }
}

export { scanRepository }
export type { ScanResult, SkippedFile }