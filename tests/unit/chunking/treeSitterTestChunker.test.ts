import { describe, it, expect } from "vitest";
import { chunkWithTreeSitter } from "../../../backend/src/chunking/treeSitterChunker.ts";
import { chunkTestFile } from "../../../backend/src/chunking/treeSitterTestChunker.ts";
import type { ChunkInput } from "../../../backend/src/types/chunk.ts";

// See TESTING.md > Parsing and Chunking > Test-Specific Extraction
describe("treeSitterTestChunker", () => {
    it.todo("extracts test suites (describe blocks) as chunks");
    it.todo("extracts individual test cases (it/test blocks) as chunks");
    it.todo("extracts test hooks (beforeEach, afterEach, etc.) as chunks");
    it.todo("extracts helper functions defined within test files as chunks");

    it("parses large test files that require multiple tree-sitter reads", () => {
        const longLiteral = "x".repeat(20_000);
        const content = `
describe("large file parser", () => {
  it("parses across multiple reads", () => {
    const payload = "${longLiteral}";
    expect(payload.length).toBeGreaterThan(0);
  });
});

function helperFunction() {
  return "ok";
}
`;

        const sourceInput: ChunkInput = {
            scanId: "scan_test",
            filePath: "src/example.test.js",
            content,
            filePurpose: "source",
            language: "javascript",
        };
        const testInput: ChunkInput = {
            ...sourceInput,
            filePurpose: "test",
        };

        expect(sourceInput.content.length).toBeGreaterThan(16 * 1024);

        const sourceChunks = chunkWithTreeSitter(sourceInput);
        expect(sourceChunks.some((chunk) => chunk.chunkName === "helperFunction")).toBe(true);

        const testChunks = chunkTestFile(testInput);
        expect(testChunks.some((chunk) => chunk.chunkKind === "test_suite" && chunk.chunkName === "large file parser")).toBe(true);
        expect(testChunks.some((chunk) => chunk.chunkKind === "test_case" && chunk.chunkName === "parses across multiple reads")).toBe(true);
    });
});
