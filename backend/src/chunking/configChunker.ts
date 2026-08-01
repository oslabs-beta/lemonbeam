// Config/rule-based chunker.

// Extracts high-signal info from common config files (package.json, tsconfig*.json, eslint/prettier configs).
 // JS/TS configs and .env* files are currently indexed as bounded raw text rather than being parsed into fields.

// Design goal: extract SIGNAL, not a mirror of the file. A repo with 300
// dependencies or a 2000-line webpack config shouldn't flood the index
// with noise - so we cap list lengths and truncate raw text below
//
// Contract: this module never throws out to its caller. Every chunk()
// call either returns { ok: true, chunks } or { ok: false, reason, filePath }.
// That lets chunkFile.ts degrade gracefully instead of crashing the whole
// repository scan if one config file is malformed.

import { basename } from "node:path";
import { parse as parseJsonc, type ParseError } from "jsonc-parser"; 
import type { Chunk, FilePurpose, Language} from "../types/chunk.js";

// Define the missing types directly in the file to unblock development
export type ClassifiedFile = {
    scanId: string;
    filePath: string;
    purpose: FilePurpose;
    language: Language;
    extension: string;
    content: string;
};

// This pattern is widely used for robust error handling
export type ChunkResult = 
    | { ok: true; chunks: Chunk[] }
    | { ok: false; reason: string; filePath: string };

// This serves as a contract or blueprint for all chunking modules
export interface Chunker {
    name: string;
    canHandle(file: ClassifiedFile): boolean;
    chunk(file: ClassifiedFile): ChunkResult;
}

//! ====== noise control constants =====
// Tune these based on real repos; they're a first guess, not gospel.

/** Max number of dependency names to list before summarizing the rest. */
const MAX_DEPENDENCY_NAMES = 60;

/** Max number of package.json script entries to list individually. */
const MAX_SCRIPT_ENTRIES = 30;

/** Max characters kept for raw, un-parsed JS/TS config files (vite, webpack, etc). */
const MAX_RAW_TEXT_CHARS = 4000;

//! ======== config kind detection =======

/**
 * The specific "flavor" of config file we've matched by filename.
 * Distinguishing these lets us apply per-format parsing logic below
 * instead of treating every config file the same way.
 */

type ConfigKind =
    | "package-json"
    | "tsconfig"
    | "vite"
    | "webpack"
    | "babel"
    | "eslint-json"
    | "eslint-js"
    | "prettier-json"
    | "prettier-js"
    | "generic-json"
    | "generic-code";

/**
 * Filename patterns used to identify each known config kind.
 * Order doesn't matter here (each pattern is specific enough not to
 * collide), unlike the CHUNKERS array order in chunkFile.ts.
 */

const FILENAME_PATTERNS: ReadonlyArray<{
    kind: Exclude<ConfigKind, "generic-json" | "generic-code">;
    pattern: RegExp;
    }> = [
    { kind: "package-json", pattern: /^package\.json$/ },
    { kind: "tsconfig", pattern: /^tsconfig(\..+)?\.json$/ },
    { kind: "vite", pattern: /^vite\.config\.[cm]?[jt]s$/ },
    { kind: "webpack", pattern: /^webpack\.config\.[cm]?[jt]s$/ },
    {
        kind: "babel",
        pattern: /^babel\.config\.[cm]?[jt]s$|^\.babelrc(\.json)?$/,
    },
    { kind: "eslint-json", pattern: /^\.eslintrc(\.json)?$/ },
    {
        kind: "eslint-js",
        pattern: /^\.eslintrc\.[cm]?js$|^eslint\.config\.[cm]?[jt]s$/,
    },
    { kind: "prettier-json", pattern: /^\.prettierrc(\.json)?$/ },
    {
        kind: "prettier-js",
        pattern: /^\.prettierrc\.[cm]?js$|^prettier\.config\.[cm]?[jt]s$/,
    },
];

/**
 * Figure out which config format we're dealing with, based on filename
 * first, and the scanner's own classification as a fallback.
 *
 * @returns undefined means "not a config file we recognize"
 */

function detectConfigKind(file: ClassifiedFile): ConfigKind | undefined {
    const name = basename(file.filePath);
    const matched = FILENAME_PATTERNS.find((p) => p.pattern.test(name));
    if (matched) return matched.kind;

    // Fallback: the scanner (classifyFile.ts) already decided this file's
    // purpose is "config", but its filename doesn't match anything we know
    // by name (custom tool, unusual naming convention, etc). We still claim
    // it here rather than letting it fall through to the source chunker,
    // since a raw-text config chunk is more useful than none at all.

    if (file.purpose === "config") {
        return file.extension === ".json" ? "generic-json" : "generic-code";
    }

    return undefined;
}

//! ====== chunker ========

/**
 * The exported chunker object. Implements the shared Chunker interface
 * (canHandle + chunk) so chunkFile.ts can call it without knowing
 * anything about config-file internals.
 */

const configChunker: Chunker = {
    name: "configChunker",

    /**
     * Cheap check: does this file look like a config file we can parse?
     * Called by the router BEFORE chunk() — chunk() assumes this already
     * returned true.
     */

    canHandle(file: ClassifiedFile): boolean {
        return detectConfigKind(file) !== undefined;
    },

    /**
     * Actually parse the file and produce chunks. Wrapped in try/catch so a
     * malformed config file (bad JSON, unexpected shape) can't crash the
     * whole scan — it just reports failure back to the router instead.
     */

    chunk(file: ClassifiedFile): ChunkResult {
        const kind = detectConfigKind(file);
        if (!kind) {
        // Defensive: shouldn't happen if canHandle() was checked first, but
        // we don't want to silently assume the caller behaved correctly.
        return {
            ok: false,
            reason: "not a recognized config file",
            filePath: file.filePath,
        };
    }

    try {
        switch (kind) {
            case "package-json":
            return { ok: true, chunks: chunkPackageJson(file) };
            case "tsconfig":
            return { ok: true, chunks: chunkTsconfig(file) };
            case "eslint-json":
            return {
                ok: true,
                chunks: chunkGenericJsonConfig(file, "eslint config"),
            };
            case "prettier-json":
            return {
                ok: true,
                chunks: chunkGenericJsonConfig(file, "prettier config"),
            };
            case "generic-json":
            return { ok: true, chunks: chunkGenericJsonConfig(file, "config") };
            // These formats are plain JS/TS modules (e.g. `export default
            // defineConfig({...})`), not JSON — we can't safely parse them
            // without a real JS/TS AST (tree-sitter's job elsewhere in the
            // pipeline), so we just index the raw, bounded text instead.
            case "vite":
            case "webpack":
            case "babel":
            case "eslint-js":
            case "prettier-js":
            case "generic-code":
            return {
                ok: true,
                chunks: [chunkRawConfigText(file, labelFor(kind))],
            };
        }
        } catch (err) {
        // Catches JSON parse errors, unexpected shapes thrown from the
        // chunkXxx() helpers below, etc. Never let this bubble up.
        return {
            ok: false,
            reason: err instanceof Error ? err.message : String(err),
            filePath: file.filePath,
        };
        }
    },
};

/** Human-readable label used as the chunkName for raw-text (non-JSON) configs. */

function labelFor(kind: ConfigKind): string {
    switch (kind) {
        case "vite":
        return "vite config";
        case "webpack":
        return "webpack config";
        case "babel":
        return "babel config";
        case "eslint-js":
        return "eslint config";
        case "prettier-js":
        return "prettier config";
        default:
        return "config";
    }
}

//! ====== package.json ======

/**
 * Split package.json into separate chunks for scripts, dependencies,
 * devDependencies, and basic package identity — rather than one giant
 * JSON blob — so retrieval can target e.g. "how do I run this project"
 * (scripts) independently from "what libraries does it use" (dependencies).
 */

function chunkPackageJson(file: ClassifiedFile): Chunk[] {
    const data = parseJsoncOrThrow(file.content);
    if (!isRecord(data)) {
        throw new Error("package.json did not parse to an object");
    }

    const chunks: Chunk[] = [];

    const scripts = data["scripts"];
    if (isRecord(scripts)) {
        chunks.push(
        makeChunk(file, "package_scripts", "scripts", formatScripts(scripts)),
        );
    }

    for (const field of ["dependencies", "devDependencies"] as const) {
        const deps = data[field];
        if (isRecord(deps)) {
        chunks.push(
            makeChunk(file, "dependencies", field, formatDependencyNames(deps)),
        );
        }
    }

  // Light identity metadata (name/version/description/engines) — small
  // and genuinely useful for a guide ("what is this project, what Node
  // version does it target"), without pulling in the rest of the manifest
  // (e.g. we deliberately skip "author", "license", "repository" here —
  // low retrieval value for a starter guide).

    const identityLines = (["name", "version", "description", "engines"] as const)
        .filter((key) => key in data)
        .map((key) => `${key}: ${stringifyCompact(data[key])}`);

    if (identityLines.length > 0) {
        chunks.push(
        makeChunk(
            file,
            "tool_config",
            "package metadata",
            identityLines.join("\n"),
        ),
        );
    }

    return chunks;
}

/**
 * Format the `scripts` object as readable "name: command" lines, capped
 * so a package.json with 100 scripts doesn't dominate the index.
 */

function formatScripts(scripts: Record<string, unknown>): string {
    const entries = Object.entries(scripts).slice(0, MAX_SCRIPT_ENTRIES);
    const lines = entries.map(([name, cmd]) => `${name}: ${String(cmd)}`);
    if (Object.keys(scripts).length > MAX_SCRIPT_ENTRIES) {
        lines.push(
        `... (${Object.keys(scripts).length - MAX_SCRIPT_ENTRIES} more scripts omitted)`,
        );
    }
    return lines.join("\n");
}

/**
 * Format dependency NAMES ONLY (no version numbers) as a comma-separated
 * list, capped at MAX_DEPENDENCY_NAMES. Versions are deliberately dropped
 * — they change constantly and add noise without helping "what does this
 * project use" retrieval.
 */

function formatDependencyNames(deps: Record<string, unknown>): string {
    const names = Object.keys(deps).sort();
    const shown = names.slice(0, MAX_DEPENDENCY_NAMES);
    let text = shown.join(", ");
    if (names.length > MAX_DEPENDENCY_NAMES) {
        text += `, ... (${names.length - MAX_DEPENDENCY_NAMES} more omitted)`;
    }
    return text;
}

//! ========= tsconfig.json ========

/**
 * Split tsconfig.json into a compilerOptions chunk and a "project
 * structure" chunk (extends/include/exclude/references grouped together,
 * since individually they're low-signal but combined they explain how
 * the project is laid out — e.g. a monorepo using project references).
 */

function chunkTsconfig(file: ClassifiedFile): Chunk[] {
    const data = parseJsoncOrThrow(file.content);
    if (!isRecord(data)) {
        throw new Error("tsconfig did not parse to an object");
    }

    const chunks: Chunk[] = [];

    const compilerOptions = data["compilerOptions"];
    if (isRecord(compilerOptions)) {
        chunks.push(
        makeChunk(
            file,
            "compiler_options",
            "compilerOptions",
            stringifyCompact(compilerOptions),
        ),
        );
    }

  // Project shape: what's included, excluded, extended, or referenced.
  // Grouped together since each individually is low-signal, but the
  // combination tells you how the project is structured.

    const shapeFields = (["extends", "include", "exclude", "references"] as const)
        .filter((key) => key in data)
        .map((key) => `${key}: ${stringifyCompact(data[key])}`);

    if (shapeFields.length > 0) {
        chunks.push(
        makeChunk(
            file,
            "tool_config",
            "project structure",
            shapeFields.join("\n"),
        ),
        );
    }

    return chunks;
}

//! ======== generic JSON config (eslintrc, prettierrc, unknowns) ========

/**
 * Handles small, flat JSON config files (eslintrc, prettierrc, or any
 * unrecognized JSON config) as a single chunk. These are usually short
 * enough that splitting further (like package.json/tsconfig) isn't worth
 * the added complexity.
 *
 * @param label human-readable chunk name, e.g. "eslint config"
 */

function chunkGenericJsonConfig(file: ClassifiedFile, label: string): Chunk[] {
    const data = parseJsoncOrThrow(file.content);
    return [makeChunk(file, "tool_config", label, stringifyCompact(data))];
}

//! ========== JS/TS-based configs (vite, webpack, babel, flat eslint, etc) ======

/**
 * For config files written as executable JS/TS (not JSON), we can't
 * safely extract structured fields with regex/JSON.parse — that would
 * need real AST parsing (tree-sitter's territory). Instead we index the
 * raw file text, truncated to a max length so a huge webpack config
 * doesn't blow out the index.
 */

function chunkRawConfigText(file: ClassifiedFile, label: string): Chunk {
    const truncated = file.content.length > MAX_RAW_TEXT_CHARS;
    const text = truncated
        ? file.content.slice(0, MAX_RAW_TEXT_CHARS) + "\n... (truncated)"
        : file.content;

    return makeChunk(file, "tool_config", label, text);
}

//! ============ shared helpers ================

/**
 * Build a Chunk object with the fields common to every chunk this file
 * produces (scanId, filePath, purpose, language, parser="config").
 * Centralizing this avoids repeating the same object shape everywhere
 * above and keeps the Chunk contract in one place.
 */

function makeChunk(
    file: ClassifiedFile,
    chunkKind: Chunk["chunkKind"],
    chunkName: string,
    text: string,
    ): Chunk {
    return {
        scanId: file.scanId,
        filePath: file.filePath,
        filePurpose: file.purpose,
        language: file.language,
        parser: "config",
        chunkKind,
        chunkName,
        text,
    };
}

/**
 * Parse JSON/JSONC content, throwing a descriptive error on failure
 * instead of returning a partial/garbage result. jsonc-parser is used
 * instead of JSON.parse because tsconfig.json (and often eslintrc/
 * prettierrc in practice) legally contain comments and trailing commas,
 * which JSON.parse would reject outright.
 */

function parseJsoncOrThrow(content: string): unknown {
    const errors: ParseError[] = [];
    const result = parseJsonc(content, errors, { allowTrailingComma: true });
    if (errors.length > 0) {
        throw new Error(
        `invalid JSON/JSONC: found ${errors.length} syntax error(s) at offset ${errors[0].offset}`,
        );
    }
    return result;
}

/**
 * Type guard: is this a plain object (not null, not an array)?
 * Used to safely narrow `unknown` JSON values before indexing into them.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pretty-print a JSON value with 2-space indentation, for embedding
 * structured data (compilerOptions, generic config objects) into chunk
 * text in a readable way.
 */

function stringifyCompact(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

export { configChunker };