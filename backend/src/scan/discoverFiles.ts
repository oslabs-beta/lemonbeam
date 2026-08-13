// Repo file discovery. Called by scan/scanService.ts (step 1 of its
// discover -> classify -> chunk sequence).

import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";

// Directories we never want to walk into: dependency installs, VCS
// metadata, and generated build output. None of these contain source
// worth analyzing, and node_modules/.git can be huge.
const SKIPPED_DIRECTORY_NAMES = ["node_modules", ".git",
    "dist", "build", ".next", "coverage"];

// Env files can contain secrets (API keys, credentials);
// never read their contents into a scan
const SKIPPED_FILE_NAMES = [".env", ".env.local", ".env.development",
    ".env.production", ".env.test"];

// Per-file cap for the MVP. Oversized files are usually bundled/generated
// output, not useful evidence for a contributor guide.
const MAX_FILE_SIZE_BYTES = 1_000_000;

// dirPath: the directory this call is reading (changes on every recursive call
// as we descend). rootPath: the original folder the walk started from, fixed across
// all recursive calls (defaults to dirPath, so external callers only ever pass
// one argument) - used to compute paths relative to the repo root at the end.
async function discoverFiles(dirPath: string, rootPath: string = dirPath): Promise<string[]> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    const results: string[] = [];

    for (const entry of entries) {
        // Skip all symlinks for the MVP: a symlink can point outside the
        // repository root, or (if it's a directory symlink) form a cycle
        // that would make this recursion loop forever.
        if (entry.isSymbolicLink()) {
            continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        // Directory we've deliberately excluded and will skip without recursing
        if (entry.isDirectory() && SKIPPED_DIRECTORY_NAMES.includes(entry.name)) {
            continue;
        }
        if (entry.isDirectory()) {
            // Recurse into the subdirectory, passing rootPath through unchanged
            // so relative paths stay anchored to the original walk root.
            const nested = await discoverFiles(fullPath, rootPath)
            results.push(...nested)
        } else {
            // Skip anything that isn't a regular file (e.g. sockets, device files)
            if (!entry.isFile()) {
                continue;
            }
            // Env file - could contain secrets, so don't even read it
            if (SKIPPED_FILE_NAMES.includes(entry.name)) {
                continue;
            }
            // Need the size before reading, so skip oversized files without loading
            const fileStats = await stat(fullPath);
            if (fileStats.size > MAX_FILE_SIZE_BYTES) {
                continue;
            }

            // Exclude binary files
            if (await isBinaryFile(fullPath)) {
                continue;
            }
            // Store paths relative to rootPath, not the dirPath of this call
            results.push(path.relative(rootPath, fullPath));
        }
    }
    return results;
}

// readFile() with no encoding argument gives back the file's raw,
// undecoded bytes (a Buffer) instead of converting them to a string.
// Real text essentially never contains a byte with the value 0; binary
// formats (images, archives, compiled output) almost always do — so a
// literal 0 in that raw byte data means "treat this file as binary."
async function isBinaryFile(filePath: string): Promise<boolean> {
    const content = await readFile(filePath);
    return content.includes(0);
}

export { discoverFiles }
