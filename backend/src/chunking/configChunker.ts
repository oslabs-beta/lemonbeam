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
import type { Chunk, ChunkInput } from "../types/chunk.js";

//! ====== noise control constants =====
// Tune these based on real repos; they're a first guess, not gospel.

/** Max number of dependency names to list before summarizing the rest. */
const MAX_DEPENDENCY_NAMES = 60;

/** Max number of package.json script entries to list individually. */
const MAX_SCRIPT_ENTRIES = 30;

/** Max characters kept for raw, un-parsed JS/TS config files (vite, webpack, etc). */
const MAX_RAW_TEXT_CHARS = 4000;

//! ======== config kind detection =======

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

function detectConfigKind(input: ChunkInput): ConfigKind | undefined {
    const name = basename(input.filePath);
    const matched = FILENAME_PATTERNS.find((p) => p.pattern.test(name));
    if (matched) return matched.kind;

    if (input.filePurpose === "config") {
        return input.filePath.endsWith(".json") ? "generic-json" : "generic-code";
    }

    return undefined;
}

//! ====== chunker ========

function canHandleConfig(input: ChunkInput): boolean {
  return detectConfigKind(input) !== undefined;
}

function configChunker(input: ChunkInput): Chunk[] {
    const kind = detectConfigKind(input);
    if (!kind) {
        return [];
    }

    try {
        switch (kind) {
        case "package-json":
            return chunkPackageJson(input);
        case "tsconfig":
            return chunkTsconfig(input);
        case "eslint-json":
            return chunkGenericJsonConfig(input, "eslint config");
        case "prettier-json":
            return chunkGenericJsonConfig(input, "prettier config");
        case "generic-json":
            return chunkGenericJsonConfig(input, "config");
        case "vite":
        case "webpack":
        case "babel":
        case "eslint-js":
        case "prettier-js":
        case "generic-code":
            return [chunkRawConfigText(input, labelFor(kind))];
        }
    } catch (err) {
        // Catches JSON parse errors safely, returning [] to match pipeline expectations
        return [];
    }
}

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

function chunkPackageJson(input: ChunkInput): Chunk[] {
    const data = parseJsoncOrThrow(input.content);
    if (!isRecord(data)) {
        throw new Error("package.json did not parse to an object");
    }

    const chunks: Chunk[] = [];

    const scripts = data["scripts"];
    if (isRecord(scripts)) {
        chunks.push(
        makeChunk(input, "package_scripts", "scripts", formatScripts(scripts)),
        );
    }

    for (const field of ["dependencies", "devDependencies"] as const) {
        const deps = data[field];
        if (isRecord(deps)) {
        chunks.push(
            makeChunk(input, "dependencies", field, formatDependencyNames(deps)),
        );
        }
    }

    const identityLines = (["name", "version", "description", "engines"] as const)
        .filter((key) => key in data)
        .map((key) => `${key}: ${stringifyCompact(data[key])}`);

    if (identityLines.length > 0) {
        chunks.push(
        makeChunk(
            input,
            "tool_config",
            "package metadata",
            identityLines.join("\n"),
        ),
        );
    }

    return chunks;
}

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

function chunkTsconfig(input: ChunkInput): Chunk[] {
    const data = parseJsoncOrThrow(input.content);
    if (!isRecord(data)) {
        throw new Error("tsconfig did not parse to an object");
    }

    const chunks: Chunk[] = [];

    const compilerOptions = data["compilerOptions"];
    if (isRecord(compilerOptions)) {
        chunks.push(
        makeChunk(
            input,
            "compiler_options",
            "compilerOptions",
            stringifyCompact(compilerOptions),
        ),
        );
    }

    const shapeFields = (["extends", "include", "exclude", "references"] as const)
    .filter((key) => key in data)
    .map((key) => `${key}: ${stringifyCompact(data[key])}`);

    if (shapeFields.length > 0) {
        chunks.push(
        makeChunk(
            input,
            "tool_config",
            "project structure",
            shapeFields.join("\n"),
        ),
        );
    }

    return chunks;
}

//! ======== generic JSON config ========

function chunkGenericJsonConfig(input: ChunkInput, label: string): Chunk[] {
    const data = parseJsoncOrThrow(input.content);
    return [makeChunk(input, "tool_config", label, stringifyCompact(data))];
}

//! ========== JS/TS-based configs ======

function chunkRawConfigText(input: ChunkInput, label: string): Chunk {
    const truncated = input.content.length > MAX_RAW_TEXT_CHARS;
    const text = truncated
        ? input.content.slice(0, MAX_RAW_TEXT_CHARS) + "\n... (truncated)"
        : input.content;

    return makeChunk(input, "tool_config", label, text);
}

//! ============ shared helpers ================

function makeChunk(
    input: ChunkInput,
    chunkKind: Chunk["chunkKind"],
    chunkName: string,
    text: string,
    ): Chunk {
    return {
        scanId: input.scanId,
        filePath: input.filePath,
        filePurpose: input.filePurpose,
        language: input.language,
        parser: "config",
        chunkKind,
        chunkName,
        text,
    };
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyCompact(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

export { configChunker, canHandleConfig };