// Chunking router.
// This file will choose the correct chunker for a classified file and return


import type { ChunkInput, Chunk } from "../types/chunk.js";
import { configChunker, canHandleConfig } from "./configChunker.js";
import { markdownChunker } from "./markdownChunker.js";
import { chunkWithTreeSitter } from "./treeSitterChunker.js";
import { chunkTestFile } from "./treeSitterTestChunker.js";
import { fallbackChunker } from "./fallbackChunker.js";

export type ChunkResult =
    | { ok: true; chunks: Chunk[] }
    | { ok: false; reason: string; filePath: string };

type ChunkerEntry = {
    canHandle: (input: ChunkInput) => boolean;
    chunk: (input: ChunkInput) => Chunk[];
};

const chunkers: ChunkerEntry[] = [
    {
        canHandle: canHandleConfig,
        chunk: configChunker,
    },
    {
        canHandle: (input) => input.language === "markdown",
        chunk: markdownChunker,
    },
    {
        canHandle: (input) =>
        input.filePurpose === "test" &&
        (input.language === "typescript" || input.language === "javascript"),
        chunk: chunkTestFile,
    },
    {
        canHandle: (input) =>
        input.language === "typescript" || input.language === "javascript",
        chunk: chunkWithTreeSitter,
    },
    {
        canHandle: () => true, // Fallback catches everything else
        chunk: fallbackChunker,
    },
];

function chunkFile(file: ChunkInput): ChunkResult {
  // Since the fallback chunker matches everything, a chunker is always found.
    const matchingChunker = chunkers.find((c) => c.canHandle(file))!;

    try {
        const chunks = matchingChunker.chunk(file);
        return {
        ok: true,
        chunks,
        };
    } catch (error) {
        return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        filePath: file.filePath,
        };
    }
}

export { chunkFile };