// Deletes one scan's temporary data: the downloaded repository snapshot
// and any other intermediate files, all inside that scan's temp directory
// only (see DATABASE.md > "Cleanup Lifecycle": delete
// /tmp/lemonbeam/scan_a1/, never the shared /tmp/lemonbeam/ parent). For
// the MVP there is no SQLite database file to close/delete, since chunk
// storage is in-memory (see DECISIONS.md > "In-Memory Chunk Storage for
// the MVP, SQLite as a Stretch Goal"). Once SQLite storage is built as a
// stretch goal, this file will also need to close that connection and
// delete the database file.
//
// Called by pipelineManager.ts inside a try/finally, so this runs whether
// the scan succeeded or failed at any step (see DECISIONS.md > "Thin
// Routes; `pipelineManager.ts` Sequences the Scan"). Close any open SQLite
// connection before deleting the database file.

import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, resolve, sep } from "node:path";

async function cleanupTempDirectory(scanDirectory: string): Promise<void> {
    const lemonbeamTempRoot = resolve(tmpdir(), "lemonbeam");
    const targetDirectory = resolve(scanDirectory); 
    const relativePath = relative(lemonbeamTempRoot, targetDirectory);

    if (
        relativePath === "" ||
        relativePath === ".." ||
        relativePath.startsWith(`..${sep}`)
    ) {
        throw new Error("Refusing to clean up directory outside the scan temp workspace");
    }

    await rm(targetDirectory, {
        recursive: true,
        force: true,
    });
}
export { cleanupTempDirectory };
