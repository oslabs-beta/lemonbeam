// Markdown docs chunker.
// This file will split Markdown files by headings so README/docs sections
// like Installation, Usage, and Testing become retrievable chunks.
import type { ChunkInput, Chunk } from '../types/chunk.js'
import { estimateTokens } from '../orchestration/estimateChunkTokens.js'

const MAX_MARKDOWN_CHUNK_TOKENS = 500;

type SourceLine = {
  text: string;
  lineNumber: number;
  startOffset: number;
  endOffset: number;
};

type HeadingIndex = {
    line: SourceLine; 
    index: number; 
}

function markdownChunker(input: ChunkInput): Chunk[] {
    
    const lines = splitSourceLines(input.content);

    if (input.content.trim().length === 0){
        return [];
    }

    const headingIndexes: HeadingIndex[] = []; 
    let inCodeFence = false; 

    lines.forEach((line, index) => {
        const lineText = line.text.trimEnd();

        // Fenced code blocks are only recognized with up to 3 leading spaces.
        if (/^[ ]{0,3}(```|~~~)/.test(lineText)) {
            inCodeFence = !inCodeFence;
            return;
        }

        if (inCodeFence) {
            return;
        }

        if (/^[ ]{0,3}(#{1,6})\s+(.+)$/.test(lineText)) {
            headingIndexes.push({ line, index });
        }
    });
    
    if (headingIndexes.length === 0) {
        return buildMarkdownChunksFromLines(input, lines);
    }

    const chunks: Chunk[] = [];
    
    if (headingIndexes[0].index > 0) {
        const preHeadingLines = lines.slice(0, headingIndexes[0].index);
        chunks.push(...buildMarkdownChunksFromLines(input, preHeadingLines));
    }

    for (const [index, heading] of headingIndexes.entries()) {
        const nextHeading = headingIndexes[index + 1];
        const endIndex = nextHeading ? nextHeading.index - 1 : lines.length - 1;
        const sectionLines = lines.slice(heading.index, endIndex + 1);

        const headingMatch = /^[ ]{0,3}(#{1,6})\s+(.+)$/.exec(
            heading.line.text.trimEnd(),
        );
        const chunkName = headingMatch?.[2]?.replace(/\s+#+\s*$/, "")?.trim();

        chunks.push(...buildMarkdownChunksFromLines(input, sectionLines, chunkName));
    }

    return chunks;

}

function buildMarkdownChunksFromLines(
    input: ChunkInput,
    sourceLines: SourceLine[],
    chunkName?: string,
): Chunk[] {
    const text = sliceSourceLines(input.content, sourceLines);

    if (text.trim().length === 0) {
        return [];
    }

    if (estimateTokens(text) <= MAX_MARKDOWN_CHUNK_TOKENS) {
        return [makeMarkdownChunk(input, sourceLines, chunkName)];
    }

    const chunks: Chunk[] = [];
    const paragraphBlocks = splitIntoParagraphBlocks(sourceLines);
    let currentLines: SourceLine[] = [];

    for (const paragraphBlock of paragraphBlocks) {
        const paragraphText = sliceSourceLines(input.content, paragraphBlock);

        if (estimateTokens(paragraphText) > MAX_MARKDOWN_CHUNK_TOKENS) {
            if (currentLines.length > 0) {
                chunks.push(makeMarkdownChunk(input, currentLines, chunkName));
                currentLines = [];
            }

            chunks.push(...splitOversizedParagraph(input, paragraphBlock, chunkName));
            continue;
        }

        const candidateLines = [...currentLines, ...paragraphBlock];
        const candidateText = sliceSourceLines(input.content, candidateLines);

        if (
            currentLines.length > 0 &&
            estimateTokens(candidateText) > MAX_MARKDOWN_CHUNK_TOKENS
        ) {
            chunks.push(makeMarkdownChunk(input, currentLines, chunkName));
            currentLines = paragraphBlock;
            continue;
        }

        currentLines = candidateLines;
    }

    if (currentLines.length > 0) {
        chunks.push(makeMarkdownChunk(input, currentLines, chunkName));
    }

    return chunks;
}

function splitIntoParagraphBlocks(sourceLines: SourceLine[]): SourceLine[][] {
    const paragraphBlocks: SourceLine[][] = [];
    let currentBlock: SourceLine[] = [];

    for (const line of sourceLines) {
        currentBlock.push(line);

        if (
            line.text.trim().length === 0 &&
            currentBlock.some((blockLine) => blockLine.text.trim().length > 0)
        ) {
            paragraphBlocks.push(currentBlock);
            currentBlock = [];
        }
    }

    if (currentBlock.some((line) => line.text.trim().length > 0)) {
        paragraphBlocks.push(currentBlock);
    }

    return paragraphBlocks;
}

function splitOversizedParagraph(
    input: ChunkInput,
    paragraphLines: SourceLine[],
    chunkName?: string,
): Chunk[] {
    const chunks: Chunk[] = [];
    let currentLines: SourceLine[] = [];

    for (const line of paragraphLines) {
        const lineText = input.content.slice(line.startOffset, line.endOffset);

        if (estimateTokens(lineText) > MAX_MARKDOWN_CHUNK_TOKENS) {
            if (currentLines.length > 0) {
                chunks.push(makeMarkdownChunk(input, currentLines, chunkName));
                currentLines = [];
            }

            chunks.push(...splitOversizedLine(input, line, chunkName));
            continue;
        }

        const candidateLines = [...currentLines, line];
        const candidateText = sliceSourceLines(input.content, candidateLines);

        if (
            currentLines.length > 0 &&
            estimateTokens(candidateText) > MAX_MARKDOWN_CHUNK_TOKENS
        ) {
            chunks.push(makeMarkdownChunk(input, currentLines, chunkName));
            currentLines = [line];
            continue;
        }

        currentLines = candidateLines;
    }

    if (currentLines.length > 0) {
        chunks.push(makeMarkdownChunk(input, currentLines, chunkName));
    }

    return chunks;
}

function splitOversizedLine(
    input: ChunkInput,
    line: SourceLine,
    chunkName?: string,
): Chunk[] {
    const chunks: Chunk[] = [];
    const words = line.text.match(/\S+\s*/g) ?? [];
    let currentText = "";

    for (const word of words) {
        const candidateText = currentText + word;

        if (
            currentText.length > 0 &&
            estimateTokens(candidateText) > MAX_MARKDOWN_CHUNK_TOKENS
        ) {
            chunks.push(makeMarkdownChunkFromText(input, line, currentText, chunkName));
            currentText = word;
            continue;
        }

        currentText = candidateText;
    }

    if (currentText.trim().length > 0) {
        chunks.push(makeMarkdownChunkFromText(input, line, currentText, chunkName));
    }

    return chunks;
}

function makeMarkdownChunkFromText(
    input: ChunkInput,
    line: SourceLine,
    text: string,
    chunkName?: string,
): Chunk {
    return {
        scanId: input.scanId,
        filePath: input.filePath,
        filePurpose: input.filePurpose,
        language: input.language,
        parser: "markdown",
        chunkKind: "markdown_section",
        chunkName,
        startLine: line.lineNumber,
        endLine: line.lineNumber,
        text,
    };
}

function makeMarkdownChunk(
    input: ChunkInput,
    sourceLines: SourceLine[],
    chunkName?: string,
): Chunk {
    const firstLine = sourceLines[0];
    const lastLine = sourceLines[sourceLines.length - 1];

    return {
        scanId: input.scanId,
        filePath: input.filePath,
        filePurpose: input.filePurpose,
        language: input.language,
        parser: "markdown",
        chunkKind: "markdown_section",
        chunkName,
        startLine: firstLine.lineNumber,
        endLine: lastLine.lineNumber,
        text: sliceSourceLines(input.content, sourceLines),
    };
}

function sliceSourceLines(content: string, sourceLines: SourceLine[]): string {
    if (sourceLines.length === 0) {
        return "";
    }

    const firstLine = sourceLines[0];
    const lastLine = sourceLines[sourceLines.length - 1];

    return content.slice(firstLine.startOffset, lastLine.endOffset);
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


export { markdownChunker };