// Markdown docs chunker.
// This file will split Markdown files by headings so README/docs sections
// like Installation, Usage, and Testing become retrievable chunks.
import type { ChunkInput, Chunk } from '../types/chunk.js'

export function markdownChunker(input: ChunkInput): Chunk[] {
    const lines = input.content.split(/\r?\n/);

    if (input.content.trim().length === 0){
        return [];
    }

    const headingIndexes = lines
        .map((line,index) => ({ line, index }))
        .filter(({ line }) => /^(#{1,6})\s+(.+)$/.test(line));
    
    if (headingIndexes.length === 0) {
        return[{
            scanId: input.scanId,
            filePath: input.filePath,
            filePurpose: input.filePurpose,
            language: input.language,
            parser: "markdown",
            chunkKind: "markdown_section",
            startLine: 1,
            endLine: lines.length,
            text: input.content,
        }];
    }

    return headingIndexes.map((heading, index) => {
        const nextHeading = headingIndexes[index + 1]; 
        const startLine = heading.index + 1; 
        const endLine = nextHeading ? nextHeading.index : lines.length; 
        const sectionLines = lines.slice(heading.index, endLine);
        const headingMatch = /^(#{1,6})\s+(.+)$/.exec(heading.line);
        const chunkName = headingMatch?.[2]?.replace(/\s+#+\s*$/, "").trim()


        return {
            scanId: input.scanId,
            filePath: input.filePath,
            filePurpose: input.filePurpose,
            language: input.language,
            parser: "markdown",
            chunkKind: "markdown_section",
            chunkName,
            startLine,
            endLine,
            text: sectionLines.join("\n"),
        };

    });

}

