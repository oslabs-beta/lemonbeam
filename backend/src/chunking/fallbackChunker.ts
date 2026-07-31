// Fallback chunker.
// This file will handle files that do not fit the other chunkers by either
// skipping them or splitting small readable text files into simple line chunks.
import type { ChunkInput, Chunk } from "../types/chunk.js";

type SourceLine = {
    text: string; 
    lineNumber: number; 
    startOffset: number; 
    endOffset: number;
};

function fallbackChunker(input: ChunkInput): Chunk[] {
    if() {
        return []; 
    }

    if() {
        return []; 
    }

    const lines = splitSourceLines(input.content);
    const chunks: Chunk[] = []; 
}

function splitSourceLines(content: string): SourceLine[] {

}


export { fallbackChunker }
