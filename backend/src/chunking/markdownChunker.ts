// Markdown docs chunker.
// This file will split Markdown files by headings so README/docs sections
// like Installation, Usage, and Testing become retrievable chunks.
import type { ChunkInput, Chunk } from '../types/chunk.js'


type SourceLine = {
  text: string;
  lineNumber: number;
  startOffset: number;
  endOffset: number;
};

export function markdownChunker(input: ChunkInput): Chunk[] {
    
    const lines = splitSourceLines(input.content);

    if (input.content.trim().length === 0){
        return [];
    }

    const headingIndexes = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /^(#{1,6})\s+(.+)$/.test(line.text.trimEnd()));
    
    if (headingIndexes.length === 0) {
        return [{
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
        const startSourceLine = lines[heading.index]
        const endSourceLine = nextHeading 
            ? lines[nextHeading.index - 1]
            : lines[lines.length - 1]; 
        const text = input.content.slice(
            startSourceLine.startOffset,
            endSourceLine.endOffset
        );
        const headingMatch = /^(#{1,6})\s+(.+)$/.exec(heading.line.text.trimEnd());
        const chunkName = headingMatch?.[2]?.replace(/\s+#+\s*$/, "").trim()


        return {
            scanId: input.scanId,
            filePath: input.filePath,
            filePurpose: input.filePurpose,
            language: input.language,
            parser: "markdown",
            chunkKind: "markdown_section",
            chunkName,
            startLine: startSourceLine.lineNumber,
            endLine: endSourceLine.lineNumber,
            text,
        };

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