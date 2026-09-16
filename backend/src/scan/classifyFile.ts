// File purpose and language classifier.
// Determines each file's Language and FilePurpose from its path only (no file content).

import path from "node:path";
import type { FilePurpose, Language } from "../types/chunk.js";

// Maps file extensions to a Language. Anything not listed falls back to "text".
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

// Looks up the file's extension (case-insensitive) in the map above.
function detectLanguage(filePath: string): Language {
    const extension = path.extname(filePath).toLowerCase();
    return EXTENSION_TO_LANGUAGE[extension] ?? "text";
}

// True if the filename contains ".test." / ".spec.", or if any path
// segment is a test-ish directory (test, tests, __tests__).
function isTestFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    if (filename.includes(".test.") || filename.includes(".spec.")) {
        return true;
    }

    const segments = filePath.split(/[\\/]/);
    return segments.some(
        (segment) => segment === "test" || segment === "tests" || segment === "__tests__"
    );
}

// Filename patterns for known config files (package.json, tsconfig,
// eslint/prettier/babel/vite/webpack/vitest/jest configs, .env, .gitignore, .npmrc).
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

// True if the filename matches any of the config patterns above.
function isConfigFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    return CONFIG_FILENAME_PATTERNS.some((pattern) => pattern.test(filename));
}

// Filename patterns for CI configs and Docker Compose files that always use
// the same name, wherever they live: Travis, GitLab CI, Azure Pipelines, and
// Compose. GitHub Actions and CircleCI aren't here because their filenames
// vary (any *.yml under .github/workflows/, "config.yml" only under
// .circleci/) — those two need their directory checked too, see below.
const CI_COMPOSE_FILENAME_PATTERNS: RegExp[] = [
    /^\.travis\.ya?ml$/,
    /^\.gitlab-ci\.ya?ml$/,
    /^azure-pipelines\.ya?ml$/,
    /^docker-compose(\..+)?\.ya?ml$/,
    /^compose\.ya?ml$/,
];

// True for CI pipeline configs (GitHub Actions, CircleCI, Travis, GitLab CI,
// Azure Pipelines) and Docker Compose files. These are worth classifying as
// config even though they're YAML, not JSON: a CI workflow often documents
// the actual build/test/run commands more reliably than prose docs do.
function isCIOrComposeFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    if (CI_COMPOSE_FILENAME_PATTERNS.some((pattern) => pattern.test(filename))) {
        return true;
    }

    if (!/\.ya?ml$/i.test(filename)) {
        return false;
    }

    const segments = filePath.split(path.sep);
    // GitHub Actions and CircleCI only read their configs from a fixed
    // location at the repository root, not anywhere else in the tree — so
    // this checks the first two path segments specifically, not just
    // whether ".github"/"workflows"/".circleci" appear anywhere in the
    // path (which would also match e.g. a vendored copy of another repo,
    // or a fixture directory that happens to reuse those names).
    // GitHub Actions: any .yml/.yaml file directly under .github/workflows/.
    if (segments[0] === ".github" && segments[1] === "workflows") {
        return true;
    }
    // CircleCI: .circleci/config.yml
    if (segments[0] === ".circleci" && segments.length === 2 && /^config\.ya?ml$/i.test(filename)) {
        return true;
    }

    return false;
}

// True for *.d.ts files, filenames containing ".types.", or files
// living inside a "types" directory.
function isTypesFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    if (filename.endsWith(".d.ts") || filename.includes(".types.")) {
        return true;
    }

    const segments = filePath.split(path.sep);
    return segments.some((segment) => segment === "types");
}

// True if any path segment is a "scripts" directory.
function isScriptsFile(filePath: string): boolean {
    const segments = filePath.split(path.sep);
    return segments.some((segment) => segment === "scripts");
}

// True for markdown files (.md/.mdx) or files inside a "docs" directory.
function isDocsFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    if (filename.endsWith(".md") || filename.endsWith(".mdx")) {
        return true;
    }

    const segments = filePath.split(path.sep);
    return segments.some((segment) => segment === "docs");
}

// Runs the checks above in priority order (test > config > types >
// scripts > docs), then falls back to "source" for JS/TS files or
// "unknown" for everything else.
function detectPurpose(filePath: string, language: Language): FilePurpose {
    if (isTestFile(filePath)) return "test";
    if (isConfigFile(filePath) || isCIOrComposeFile(filePath)) return "config";
    if (isTypesFile(filePath)) return "types";
    if (isScriptsFile(filePath)) return "scripts";
    if (isDocsFile(filePath)) return "docs";
    if (language === "typescript" || language === "javascript") return "source";
    return "unknown";
}

// Public entry point: combines detectLanguage + detectPurpose into the
// result scanService.ts consumes.
function classifyFile(filePath: string): { filePurpose: FilePurpose; language: Language } {
    const language = detectLanguage(filePath);
    const filePurpose = detectPurpose(filePath, language);
    return { filePurpose, language };
}

export { classifyFile };