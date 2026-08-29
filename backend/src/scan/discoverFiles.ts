// Repo file discovery. Called by scan/scanService.ts (step 1 of its
// discover -> classify -> chunk sequence).

import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";

// Directories we never want to walk into: dependency installs, VCS
// metadata, generated build/cache output, editor/OS folders, and i18n
// data dumps. None of these contain source worth analyzing, and several
// (node_modules, .git, .yarn) can be huge (see DECISIONS.md > "Exclude
// Low-Value Files from Guide Generation").
const SKIPPED_DIRECTORY_NAMES = [
    "node_modules", ".git",
    "dist", "build", ".next", "coverage",
    ".turbo", ".cache", ".parcel-cache", ".nyc_output", ".docusaurus",
    ".vercel", ".netlify", "storybook-static", ".yarn",
    ".vscode", ".idea",
    "locales", "locale", "i18n", "translations",
];

// Env files can contain secrets (API keys, credentials), so never read
// their contents into a scan. Lockfiles and OS cruft are large and common
// enough to meaningfully inflate token usage while adding near-zero value
// as guide evidence.
const SKIPPED_FILE_NAMES = [
    ".env", ".env.local", ".env.development", ".env.production", ".env.test",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
    ".DS_Store",
];

// Yarn's Plug'n'Play output files vary by name (.pnp.cjs, .pnp.loader.mjs,
// .pnp.data.json, ...) but always share this prefix — a fixed exact-name
// list would miss variants.
const SKIPPED_FILE_PREFIXES = [".pnp."];

// Pure media/decoration assets (logos, screenshots, banners, icons):
// near-zero value as guide evidence. Checked by extension rather than
// relying solely on isBinaryFile's content sniff below, since that also
// catches text-based formats like SVG that a null-byte sniff wouldn't,
// and avoids an unnecessary stat+read for files already known to be media.
const SKIPPED_FILE_EXTENSIONS = [
    ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".bmp", ".avif",
];

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
            // Env file, lockfile, or OS cruft - could contain secrets or
            // adds near-zero value, so don't even read it
            if (SKIPPED_FILE_NAMES.includes(entry.name)) {
                continue;
            }
            if (SKIPPED_FILE_PREFIXES.some((prefix) => entry.name.startsWith(prefix))) {
                continue;
            }
            if (SKIPPED_FILE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
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
