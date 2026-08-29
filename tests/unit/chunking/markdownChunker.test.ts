import { describe, it, expect } from "vitest";
import { markdownChunker } from "../../../backend/src/chunking/markdownChunker.ts";
import { estimateTokens } from "../../../backend/src/orchestration/estimateChunkTokens.ts";
import type { ChunkInput } from "../../../backend/src/types/chunk.ts";

const MAX_EXPECTED_MARKDOWN_CHUNK_TOKENS = 500;

function makeInput(content: string): ChunkInput {
  return {
    scanId: "scan_test",
    filePath: "README.md",
    content,
    filePurpose: "docs",
    language: "markdown",
  };
}

function expectChunksUnderTokenCap(
  chunks: ReturnType<typeof markdownChunker>,
): void {
  expect(
    chunks.every(
      (chunk) =>
        estimateTokens(chunk.text) <= MAX_EXPECTED_MARKDOWN_CHUNK_TOKENS,
    ),
  ).toBe(true);
}

// See TESTING.md > Parsing and Chunking > Markdown
describe("markdownChunker", () => {
    it ( "splits a markdown file into chunks at heading boundaries", () => {
        const content = "# Intro\n\nWelcome.\n\n## Install \n\nRun npm install.\n";

        const chunks = markdownChunker(makeInput(content)); 

        expect(chunks).toHaveLength(2);
        expect(chunks[0].chunkName).toBe("Intro"); 
        expect(chunks[1].chunkName).toBe("Install"); 
    });

    it("includes each section's text in its chunk", () => {
        const content = "# Intro\n\nWelcome.\n\n## Install\n\nRun npm install.\n";

        const chunks = markdownChunker(makeInput(content));

        expect(chunks[0].text).toBe("# Intro\n\nWelcome.\n\n"); 
        expect(chunks[1].text).toBe("## Install\n\nRun npm install.\n");
    }); 

    it("records accurate start/end line ranges per chunk", () => {
        const content = "# Intro\n\nWelcome.\n\n## Install\n\nRun npm install.\n";

        const chunks = markdownChunker(makeInput(content));

        expect(chunks[0].startLine).toBe(1);
        expect(chunks[0].endLine).toBe(4);
        expect(chunks[1].startLine).toBe(5);
        expect(chunks[1].endLine).toBe(7);
    });

    it("handles a markdown file with no headings", () => {
        const content = "Intro paragraph.\n\nAnother paragraph.\n";

        const chunks = markdownChunker(makeInput(content));

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toMatchObject({
            scanId: "scan_test",
            filePath: "README.md",
            filePurpose: "docs",
            language: "markdown",
            parser: "markdown",
            chunkKind: "markdown_section",
            startLine: 1,
            endLine: 3,
            text: content,
        });
    });

    it("splits a no-heading markdown file when it exceeds the token cap", () => {
        const paragraph =
            "This paragraph describes project setup, local commands, folder structure, testing expectations, and contributor notes in enough detail to create token pressure without using headings.";

        const content = Array.from({ length: 80 }, () => paragraph).join("\n\n");

        const chunks = markdownChunker(makeInput(content));

        expect(chunks.length).toBeGreaterThan(1);
        expect(
            chunks.every(
            (chunk) =>
                estimateTokens(chunk.text) <= MAX_EXPECTED_MARKDOWN_CHUNK_TOKENS,
            ),
        ).toBe(true);
    });

    it("splits an oversized heading section when it exceeds the token cap", () => {
        const paragraph =
            "This paragraph describes project setup, local commands, folder structure, testing expectations, and contributor notes in enough detail to create token pressure under one heading.";

        const content = `# Usage\n\n${Array.from({ length: 80 }, () => paragraph).join("\n\n")}`;

        const chunks = markdownChunker(makeInput(content));

        expect(chunks.length).toBeGreaterThan(1);
        expectChunksUnderTokenCap(chunks);
        expect(chunks.every((chunk) => chunk.chunkName?.startsWith("Usage"))).toBe(
            true,
        );
    });

    it("preserves line ranges when splitting oversized markdown", () => {
        const paragraph =
            "This paragraph describes setup, running, structure, and testing details with enough repeated content to force multiple markdown chunks.";

        const paragraphs = Array.from({ length: 80 }, () => paragraph);
        const content = `# Usage\n\n${paragraphs.join("\n\n")}`;
        const finalLineNumber = content.split("\n").length;

        const chunks = markdownChunker(makeInput(content));

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks[0].startLine).toBe(1);
        expect(chunks[chunks.length - 1].endLine).toBe(finalLineNumber);

        for (let index = 1; index < chunks.length; index += 1) {
            expect(chunks[index].startLine).toBe(
            (chunks[index - 1].endLine as number) + 1,
            );
        }
    });

    it("splits oversized markdown on paragraph boundaries when possible", () => {
        const paragraphs = Array.from(
            { length: 40 },
            (_, index) =>
            `Paragraph ${index} describes a complete contributor-facing idea about setup, commands, structure, and testing. It should stay together when the markdown chunker splits oversized content.`,
        );

        const content = paragraphs.join("\n\n");

        const chunks = markdownChunker(makeInput(content));

        expect(chunks.length).toBeGreaterThan(1);
        expectChunksUnderTokenCap(chunks);

        for (const paragraph of paragraphs) {
            const chunksContainingParagraph = chunks.filter((chunk) =>
            chunk.text.includes(paragraph),
            );

            expect(chunksContainingParagraph).toHaveLength(1);
        }
    });

    it("splits a single oversized paragraph so no chunk exceeds the token cap", () => {
        const sentence =
            "This long paragraph keeps adding contributor-facing setup and testing details so the markdown chunker has to split within a single paragraph while still staying under the token cap. ";

        const content = sentence.repeat(80);

        const chunks = markdownChunker(makeInput(content));

        expect(chunks.length).toBeGreaterThan(1);
        expectChunksUnderTokenCap(chunks);
        expect(chunks.every((chunk) => chunk.text.trim().length > 0)).toBe(true);
    });
});
