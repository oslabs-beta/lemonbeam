// A test-file chunk scores positively for testing and zero for every other
// section.
//
// A config chunk carrying package_scripts scores positively for more than
// one section at once (setup, running, and testing) — proving a chunk can
// be legitimately relevant to multiple sections rather than bucketed into
// just one (see OSP-50: package.json supports Setup, Running, and Testing).
//
// See TESTING.md > Orchestration
import { describe, it, expect } from "vitest";
import { scoreChunk } from "../../../backend/src/orchestration/scoreChunk.ts";
import type { Chunk, FilePurpose, ChunkKind } from "../../../backend/src/types/chunk.ts";
import type { GuideSectionId } from "../../../backend/src/orchestration/guideSections.ts";

function makeChunk(overrides: Partial<Chunk> = {}): Chunk {
    return {
        scanId: "scan_test",
        filePath: "src/example.ts",
        filePurpose: "source",
        language: "typescript",
        parser: "tree-sitter",
        chunkKind: "function",
        chunkName: "example",
        text: "function example() {}",
        ...overrides,
    };
}

describe("scoreChunk", () => {
    it("scores a test-file chunk positively for testing and zero for every other section", () => {
        const chunk = makeChunk({
            filePath: "src/example.test.ts",
            filePurpose: "test",
            chunkKind: "test_case",
            chunkName: "does the thing",
        });

        const scores = scoreChunk(chunk);

        expect(scores.testing).toBeGreaterThan(0);
        expect(scores.overview).toBe(0);
        expect(scores.setup).toBe(0);
        expect(scores.running).toBe(0);
        expect(scores.structure).toBe(0);
    });

    it("scores a package.json scripts chunk positively for setup, running, and testing at once", () => {
        const chunk = makeChunk({
            filePath: "package.json",
            filePurpose: "config",
            chunkKind: "package_scripts",
            chunkName: "scripts",
            text: '{ "scripts": { "dev": "vite", "test": "vitest" } }',
        });

        const scores = scoreChunk(chunk);

        expect(scores.setup).toBeGreaterThan(0);
        expect(scores.running).toBeGreaterThan(0);
        expect(scores.testing).toBeGreaterThan(0);
    });

    it("returns a defined score for every section, for every FilePurpose/chunkKind combination", () => {
        // Every value from chunk.ts's FilePurpose and ChunkKind unions,
        // kept in sync by hand since TypeScript can't enumerate a union
        // type at runtime. If those unions grow, this list needs to grow
        // with them, or new combinations go unchecked.
        const filePurposes: FilePurpose[] = ["source", "test", "docs", "config", "scripts", "types", "unknown"];
        const chunkKinds: ChunkKind[] = [
            "function", "class", "method", "constructor", "arrow_function",
            "type", "interface", "enum",
            "test_suite", "test_case", "test_hook",
            "markdown_section",
            "package_scripts", "dependencies", "compiler_options", "tool_config",
            "text_block", "unknown",
        ];
        const sectionIds: GuideSectionId[] = ["overview", "setup", "running", "structure", "testing"];

        for (const filePurpose of filePurposes) {
            for (const chunkKind of chunkKinds) {
                const scores = scoreChunk(makeChunk({ filePurpose, chunkKind }));

                for (const sectionId of sectionIds) {
                    const score = scores[sectionId];
                    const label = `${filePurpose}/${chunkKind} → ${sectionId}`;
                    expect(typeof score, label).toBe("number");
                    expect(Number.isNaN(score), label).toBe(false);
                }
            }
        }
    });

    it("scores Markdown sections differently based on heading text, not filePurpose alone", () => {
        const installSection = makeChunk({
            filePath: "README.md",
            filePurpose: "docs",
            chunkKind: "markdown_section",
            chunkName: "Installation",
            text: "Run npm install to set up dependencies.",
        });
        const testingSection = makeChunk({
            filePath: "README.md",
            filePurpose: "docs",
            chunkKind: "markdown_section",
            chunkName: "Testing",
            text: "Run npm test to run the test suite.",
        });

        const installScores = scoreChunk(installSection);
        const testingScores = scoreChunk(testingSection);

        expect(installScores.setup).toBeGreaterThan(0);
        expect(installScores.testing).toBe(0);

        expect(testingScores.testing).toBeGreaterThan(0);
        expect(testingScores.setup).toBe(0);

        // Same filePurpose and chunkKind throughout for both chunks — only
        // the heading text differs, and yet the two score differently.
        // Proves scoring isn't keyed off filePurpose: "docs" alone.
        expect(installScores).not.toEqual(testingScores);
    });
});
