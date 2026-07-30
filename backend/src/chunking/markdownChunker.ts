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

type HeadingIndex = {
    line: SourceLine; 
    index: number; 
}

export function markdownChunker(input: ChunkInput): Chunk[] {
    
    const lines = splitSourceLines(input.content);

    if (input.content.trim().length === 0){
        return [];
    }

    const headingIndexes: HeadingIndex[] = []; 
    let inCodeFence = false; 

    lines.forEach((line, index) => {
        const lineText = line.text.trimEnd();
        const trimmedLine = lineText.trim(); 

        if (/^(```|~~~)/.test(trimmedLine)) {
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

    const chunks: Chunk[] = [];
    
    if (headingIndexes[0].index > 0) {
        const startSourceLine = lines[0]; 
        const endSourceLine = lines[headingIndexes[0].index -1]; 
        const text = input.content.slice(
            startSourceLine.startOffset,
            endSourceLine.endOffset
        );

        if (text.trim().length > 0) {
            chunks.push({
                scanId: input.scanId,
                filePath: input.filePath,
                filePurpose: input.filePurpose,
                language: input.language,
                parser: "markdown",
                chunkKind: "markdown_section", 
                startLine: startSourceLine.lineNumber,
                endLine: endSourceLine.lineNumber,
                text,
            });
        }
    }

    const headingChunks: Chunk[] = headingIndexes.map((heading, index) => {
        const nextHeading = headingIndexes[index + 1]; 
        const startSourceLine = lines[heading.index]
        const endSourceLine = nextHeading 
            ? lines[nextHeading.index - 1]
            : lines[lines.length - 1]; 
        const text = input.content.slice(
            startSourceLine.startOffset,
            endSourceLine.endOffset
        );
        const headingMatch = /^[ ]{0,3}(#{1,6})\s+(.+)$/.exec(heading.line.text.trimEnd());
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

    return [...chunks, ...headingChunks];

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