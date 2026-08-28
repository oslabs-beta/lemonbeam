import { describe, it, expect } from "vitest";
import { chunkWithTreeSitter } from "../../../backend/src/chunking/treeSitterChunker.ts";
import type { ChunkInput } from "../../../backend/src/types/chunk.ts";

// See TESTING.md > Parsing and Chunking > Tree-sitter
describe("treeSitterChunker", () => {
    it.todo("extracts function declarations as chunks");
    it.todo("extracts methods as chunks");
    it.todo("extracts classes as chunks");
    it.todo("extracts arrow functions as chunks");
    it.todo("extracts interfaces as chunks");
    it.todo("extracts type aliases as chunks");
    it.todo("extracts enums as chunks");

    function makeInput(content: string): ChunkInput {
        return {
            scanId: "scan_test",
            filePath: "src/example.ts",
            content,
            filePurpose: "source",
            language: "typescript",
        };
    }

    // OSP-43: chunk-size cap and split behavior
    describe("chunk size cap", () => {
        it("keeps a normal-sized function as a single, unsplit chunk", () => {
            const input = makeInput(`
function greet(name) {
  const message = "Hello, " + name;
  return message;
}
`);

            const chunks = chunkWithTreeSitter(input);

            expect(chunks).toHaveLength(1);
            expect(chunks[0].chunkKind).toBe("function");
            expect(chunks[0].chunkName).toBe("greet");
        });

        it("splits an oversized function into multiple chunks along statement boundaries", () => {
            const statementCount = 30;
            const statements = Array.from(
                { length: statementCount },
                (_, i) => `  const value${i} = "padding to push this function past the token cap number ${i} with extra length here";`,
            );
            const input = makeInput(
                `function bigFunction() {\n${statements.join("\n")}\n}`,
            );

            const chunks = chunkWithTreeSitter(input);

            expect(chunks.length).toBeGreaterThan(1);

            for (const [i, chunk] of chunks.entries()) {
                expect(chunk.chunkKind).toBe("function");
                expect(chunk.chunkName).toBe(`bigFunction (part ${i + 1})`);
            }

            // Split chunks should be contiguous and non-overlapping: each one
            // picks up exactly where the previous one left off, so no
            // statement is dropped, duplicated, or cut mid-statement.
            for (let i = 1; i < chunks.length; i++) {
                expect(chunks[i].startLine).toBe((chunks[i - 1].endLine as number) + 1);
            }

            expect(chunks[0].startLine).toBe(2);
            expect(chunks[chunks.length - 1].endLine).toBe(statementCount + 1);
        });

        it("splits an oversized class into multiple chunks along member boundaries", () => {
            const methodCount = 18;
            const methods = Array.from(
                { length: methodCount },
                (_, i) => `  methodNumber${i}() {\n    return "padding to push this class past the token cap number ${i} with extra length here";\n  }`,
            );
            const input = makeInput(
                `class BigClass {\n${methods.join("\n")}\n}`,
            );

            const chunks = chunkWithTreeSitter(input);
            const classParts = chunks.filter((c) => c.chunkKind === "class");

            expect(classParts.length).toBeGreaterThan(1);

            for (const [i, part] of classParts.entries()) {
                expect(part.chunkName).toBe(`BigClass (part ${i + 1})`);
            }
        });

        it("does not crash on an arrow function with an expression body (no splittable statement body)", () => {
            const input = makeInput(`const double = (x) => x * 2;`);

            expect(() => chunkWithTreeSitter(input)).not.toThrow();

            const chunks = chunkWithTreeSitter(input);
            const arrowChunk = chunks.find((c) => c.chunkKind === "arrow_function");

            expect(arrowChunk).toBeDefined();
            expect(arrowChunk?.chunkName).toBe("double");
        });

        it("splits an oversized arrow function assigned to a const, same as a function declaration would", () => {
            const statementCount = 30;
            const statements = Array.from(
                { length: statementCount },
                (_, i) => `  const value${i} = "padding to push this arrow function past the token cap number ${i} with extra length here";`,
            );
            const input = makeInput(
                `const bigArrow = (x) => {\n${statements.join("\n")}\n};`,
            );

            const chunks = chunkWithTreeSitter(input);

            expect(chunks.length).toBeGreaterThan(1);

            for (const [i, chunk] of chunks.entries()) {
                expect(chunk.chunkKind).toBe("arrow_function");
                expect(chunk.chunkName).toBe(`bigArrow (part ${i + 1})`);
            }
        });
    });
});
