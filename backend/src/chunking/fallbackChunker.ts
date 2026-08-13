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

const MAX_FALLBACK_CHUNK_CHARS = 4000; 

function fallbackChunker(input: ChunkInput): Chunk[] {
    if (input.content.trim().length === 0) {
        return []; 
    }

    if (input.content.includes("\0")) {
        return []; 
    }

    const lines = splitSourceLines(input.content);
    const chunks: Chunk[] = []; 
    let blockLines: SourceLine[] = []; 

    for (const line of lines) {
        if (line.text.trim().length === 0) {
            pushBlockChunks(input, chunks, blockLines);
            blockLines = []; 
            continue;
        }

        blockLines.push(line);
    }

    pushBlockChunks(input, chunks, blockLines); 

    
    return chunks; 
}

function pushBlockChunks(
    input: ChunkInput,
    chunks: Chunk[],
    blockLines: SourceLine[]
): void {
    let currentLines: SourceLine[] = [];
    let currentLength = 0; 

    for (const line of blockLines) {
        if (line.text.length > MAX_FALLBACK_CHUNK_CHARS) {
            pushChunkFromLines(input, chunks, currentLines);
            currentLines = [];
            currentLength = 0;
            pushLongLineChunks(input, chunks, line);
            continue;
        }

        if (
            currentLength > 0 &&
            currentLength + line.text.length > MAX_FALLBACK_CHUNK_CHARS
        ) {
            pushChunkFromLines(input, chunks, currentLines);
            currentLines = [];
            currentLength = 0;
        }

        currentLines.push(line); 
        currentLength += line.text.length; 
    }

    pushChunkFromLines(input, chunks, currentLines); 

}

function pushLongLineChunks(
    input: ChunkInput,
    chunks: Chunk[],
    line: SourceLine,
): void {
    let startOffset = line.startOffset;

    while (startOffset < line.endOffset) {
        const endOffset = getChunkEndOffset(
            input.content,
            startOffset,
            line.endOffset,
        );

        chunks.push({
            scanId: input.scanId,
            filePath: input.filePath,
            filePurpose: input.filePurpose,
            language: input.language,
            parser: "fallback",
            chunkKind: "text_block",
            startLine: line.lineNumber,
            endLine: line.lineNumber,
            text: input.content.slice(startOffset, endOffset),
        });

        startOffset = endOffset;
    }
}

function getChunkEndOffset(
    content: string,
    startOffset: number,
    lineEndOffset: number,
): number {
    const endOffset = Math.min(
        startOffset + MAX_FALLBACK_CHUNK_CHARS,
        lineEndOffset,
    );

    if (
        endOffset < lineEndOffset &&
        content[endOffset - 1] === "\r" &&
        content[endOffset] === "\n"
    ) {
        return endOffset + 1;
    }

    return endOffset;
}

function pushChunkFromLines(
    input: ChunkInput,
    chunks: Chunk[],
    lines: SourceLine[]
): void {
    if (lines.length === 0){
        return; 
    }
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];

    chunks.push({
        scanId: input.scanId,
        filePath: input.filePath,
        filePurpose: input.filePurpose,
        language: input.language,
        parser: "fallback",
        chunkKind: "text_block",
        startLine: firstLine.lineNumber,
        endLine: lastLine.lineNumber,
        text: input.content.slice(firstLine.startOffset, lastLine.endOffset),
    });
    
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
