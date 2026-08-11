import { readdir, stat, open } from "node:fs/promises";
import path from "node:path";

const SKIPPED_DIRECTORY_NAMES = ["node_modules", ".git", 
    "dist", "build", ".next", "coverage"];

const SKIPPED_FILE_NAMES = [".env", ".env.local", ".env.development", 
    ".env.production", ".env.test"];    

const MAX_FILE_SIZE_BYTES = 1_000_000;    

async function discoverFiles(rootPath: string): Promise<string[]> {
    const entries = await readdir(rootPath, { withFileTypes: true });

    const results: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(rootPath, entry.name);
        
        if(entry.isDirectory() && SKIPPED_DIRECTORY_NAMES.includes(entry.name)) {
            continue;
        }
        if (entry.isDirectory()) {
            const nested = await discoverFiles(fullPath)
            results.push(...nested)
        } else {
            if (SKIPPED_FILE_NAMES.includes(entry.name)) {
                continue;
            }
            const fileStats = await stat(fullPath);
            if (fileStats.size > MAX_FILE_SIZE_BYTES) {
                continue;
            }
            results.push(fullPath);
        }
    }
    return results;
}

// Repo file discovery. Called by scan/scanService.ts (step 1 of its
// discover -> classify -> chunk sequence).
//
// TODO: walk the downloaded repository's local folder and return the files
// worth analyzing:
// - skip node_modules, .git, and generated build output directories
// - skip binary files
// - skip any individual file over ~1MB (see DECISIONS.md > "Repository Size
//   Limits for the MVP")
// - the whole repository (after the ignores above) should already have been
//   confirmed under ~25-50MB by github/validateRepository.ts before
//   download; this file doesn't need to re-check total size, just per-file
//   size
// - never return a path that escapes the repository root
// - return repository-relative paths, not absolute local filesystem paths
//   (see types/chunk.ts > ChunkInput.filePath)
export { discoverFiles }

console.log(await discoverFiles("/Users/kanamianderson/dev/lemonbeam/backend"));