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
    if (input.content.trim().length === 0) {
        return []; 
    }

    if (input.content.includes("\0")) {
        return []; 
    }

    const lines = splitSourceLines(input.content);
    const chunks: Chunk[] = []; 

    
    return chunks; 
}

function splitSourceLines(content: string): SourceLine[] {
    const lines: SourceLine[] =[]; 
    let startOffset = 0; 
    let lineNumber = 1; 

    for (let index = 0; index < content.length; index += 1) {
        const character = content[index];
            
        if (character !== "\n" && character !== "\r") {
            continue; 
        }

        let endOffset = index + 1; 

        if (character === "\r" && content[index + 1] === "\n") {
            endOffset = index + 2; 
            index += 1; 
        }

        lines.push({
            text: content.slice(startOffset, endOffset),
            lineNumber,
            startOffset,
            endOffset,
        });

        startOffset = endOffset; 
        lineNumber += 1; 
    }

    if (startOffset < content.length) {
        lines.push({
            text: content.slice(startOffset),
            lineNumber,
            startOffset,
            endOffset: content.length,
        });
    }

    return lines;

}


export { fallbackChunker }
