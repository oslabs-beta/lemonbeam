// File purpose and language classifier. Called by scan/scanService.ts once
// per file discovered by scan/discoverFiles.ts (step 2 of
// discover -> classify -> chunk).
//
// Determines each file's Language (from its extension) and FilePurpose
// (source, test, docs, config, scripts, types, or unknown) using
// deterministic signals from the file's own path and the repository's
// package.json — not file content. See DECISIONS.md > "Path-Based
// Classification for the MVP, Content-Pattern Signals as a Stretch Goal."
//
// Returns { filePurpose, language } only. scanService.ts assembles the
// full ChunkInput shape (types/chunk.ts) by combining this result with
// scanId, filePath, and the file's content, which it reads separately.

import path from "node:path";
import type { FilePurpose, Language } from "../types/chunk.js";

const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".md": "markdown",
    ".mdx": "markdown",
    ".json": "json",
};

function detectLanguage(filePath: string): Language {
    const extension = path.extname(filePath).toLowerCase();
    return EXTENSION_TO_LANGUAGE[extension] ?? "text";
}

function isTestFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    if (filename.includes(".test.") || filename.includes(".spec.")) {
        return true;
    }

    const segments = filePath.split(path.sep);
    return segments.some(
        (segment) => segment === "test" || segment === "tests" || segment === "__tests__"
    );
}

const CONFIG_FILENAME_PATTERNS: RegExp[] = [
    /^package\.json$/,
    /^tsconfig(\..+)?\.json$/,
    /^\.eslintrc(\..+)?$/,
    /^eslint\.config\.[cm]?[jt]s$/,
    /^\.prettierrc(\..+)?$/,
    /^prettier\.config\.[cm]?[jt]s$/,
    /^\.babelrc(\..+)?$/,
    /^babel\.config\.[cm]?[jt]s$/,
    /^vite\.config\.[cm]?[jt]s$/,
    /^webpack\.config\.[cm]?[jt]s$/,
    /^vitest\.config\.[cm]?[jt]s$/,
    /^jest\.config\.[cm]?[jt]s$/,
    /^\.env(\..+)?$/,
    /^\.gitignore$/,
    /^\.npmrc$/,
];

function isConfigFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    return CONFIG_FILENAME_PATTERNS.some((pattern) => pattern.test(filename));
}

function isTypesFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    if (filename.endsWith(".d.ts") || filename.includes(".types.")) {
        return true;
    }

    const segments = filePath.split(path.sep);
    return segments.some((segment) => segment === "types");
}

function isScriptsFile(filePath: string, packageJson: Record<string, unknown> | null): boolean {
    const segments = filePath.split(path.sep);
    if (segments.some((segment) => segment === "scripts")) {
        return true;
    }

    const scripts = packageJson?.["scripts"];
    if (scripts && typeof scripts === "object") {
        return Object.values(scripts as Record<string, unknown>).some(
            (command) => typeof command === "string" && command.includes(filePath)
        );
    }

    return false;
}

function isDocsFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    if (filename.endsWith(".md") || filename.endsWith(".mdx")) {
        return true;
    }

    const segments = filePath.split(path.sep);
    return segments.some((segment) => segment === "docs");
}

function detectPurpose(
    filePath: string,
    packageJson: Record<string, unknown> | null,
    language: Language
): FilePurpose {
    if (isTestFile(filePath)) return "test";
    if (isConfigFile(filePath)) return "config";
    if (isTypesFile(filePath)) return "types";
    if (isScriptsFile(filePath, packageJson)) return "scripts";
    if (isDocsFile(filePath)) return "docs";
    if (language === "typescript" || language === "javascript") return "source";
    return "unknown";
}

function classifyFile(
    filePath: string,
    allFilePaths: string[],
    packageJson: Record<string, unknown> | null
): { filePurpose: FilePurpose; language: Language } {
    const language = detectLanguage(filePath);
    const filePurpose = detectPurpose(filePath, packageJson, language);
    return { filePurpose, language };
}

export { classifyFile };