// Repository analyzer coordinator — discover, classify, chunk. NOT the
// whole-scan coordinator; that's pipelineManager.ts, which calls this file
// as one step. Does not talk to GitHub, generate guides, or run cleanup.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { discoverFiles } from "./discoverFiles.js";
import { classifyFile } from "./classifyFile.js";
import { chunkFile } from "../chunking/chunkFile.js";
import type { Chunk, ChunkInput } from "../types/chunk.js";

type SkippedFile = {
    filePath: string;
    reason: string;
};

type ScanResult = {
    chunks: Chunk[];
    skippedFiles: SkippedFile[];
};

async function scanRepository(repoLocalPath: string, scanId: string): Promise<ScanResult> 
{
    const filePaths = await discoverFiles(repoLocalPath);

    const chunks: Chunk[] = [];
    const skippedFiles: SkippedFile[] = [];

    for (const filePath of filePaths) {
        let content: string;
        try {
            content = await readFile(path.join(repoLocalPath, filePath), "utf-8");
        } catch (error) {
            skippedFiles.push({
                filePath,
                reason: error instanceof Error ? error.message : String(error),
            });
            continue;
        }
        const { filePurpose, language } = classifyFile(filePath);

        const chunkInput: ChunkInput = {
            scanId,
            filePath,
            content,
            filePurpose,
            language,
        };
        const result = chunkFile(chunkInput);

        if (!result.ok) {
            skippedFiles.push({ filePath: result.filePath, reason: result.reason });
            continue;
        }

        chunks.push(...result.chunks);
    }
    return { chunks, skippedFiles }
}

export { scanRepository }
export type { ScanResult, SkippedFile }
