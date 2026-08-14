// Creates one scan's isolated temporary directory — never a shared path.
// For the MVP this only needs to hold the downloaded repository snapshot;
// no SQLite database path is needed since chunk storage is in-memory (see
// DECISIONS.md > "In-Memory Chunk Storage for the MVP, SQLite as a
// Stretch Goal"). Once SQLite storage is built as a stretch goal, this
// directory will also hold that scan's database file (see DATABASE.md >
// "Concurrent Scan Isolation").
//
// Called by pipelineManager.ts, right after it generates the scan ID and
// right before any GitHub request is made (see DECISIONS.md > "Thin
// Routes; `pipelineManager.ts` Sequences the Scan" and ARCHITECTURE.md >
// "Express Backend").
//
// Exports a function that, given a scan ID, creates and returns a
// unique temp directory path (e.g. under the OS temp dir), something like
// /tmp/lemonbeam/{scanId}/, for the downloaded repository snapshot and
// (later, if #8 says yes) that scan's SQLite database file to live in.
import { mkdir } from "node:fs/promises"; 
import { join } from "node:path"; 
import { tmpdir } from "node:os";

type TempWorkspace = { 
    scanDirectory: string; 
    repositoryDirectory: string; 
}; 

async function createTempDirectory(scanId: string): Promise<TempWorkspace> {
    const scanDirectory = join(tmpdir(), "lemonbeam", scanId);
    const repositoryDirectory = join(scanDirectory, "repository");

    await mkdir(repositoryDirectory, { recursive: true }); 

    return {
        scanDirectory,
        repositoryDirectory
    }
}


export { createTempDirectory }; 
export type { TempWorkspace }; 
