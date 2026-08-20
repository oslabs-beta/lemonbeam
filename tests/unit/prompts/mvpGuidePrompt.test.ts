import { describe, it, expect } from "vitest";
import { buildMvpGuidePrompt } from "../../../backend/src/prompts/mvpGuidePrompt.ts";
import { GUIDE_SECTIONS } from "../../../backend/src/orchestration/guideSections.ts";
import type { Chunk } from "../../../backend/src/types/chunk.ts";

// See TESTING.md > Orchestration: "builds the single general MVP prompt"

function makeChunk(overrides: Partial<Chunk> = {}): Chunk {
    return {
        scanId: "scan_test",
        filePath: "package.json",
        filePurpose: "config",
        language: "json",
        parser: "config",
        chunkKind: "package_scripts",
        text: '{ "scripts": { "dev": "vite" } }',
        ...overrides,
    };
}

describe("buildMvpGuidePrompt", () => {
    it("returns exactly a system message followed by a user message", () => {
        const result = buildMvpGuidePrompt([makeChunk()]);

        expect(result).toHaveLength(2);
        expect(result[0]?.role).toBe("system");
        expect(result[1]?.role).toBe("user");
    });

    it("includes every fixed section title, in order, in the system message", () => {
        const [system] = buildMvpGuidePrompt([makeChunk()]);
        const content = system?.content as string;

        const positions = GUIDE_SECTIONS.map((section) => content.indexOf(section.title));

        expect(positions.every((index) => index !== -1)).toBe(true);
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it("includes the citation format instructions in the system message", () => {
        const [system] = buildMvpGuidePrompt([makeChunk()]);
        const content = system?.content as string;

        expect(content).toContain("[filePath:startLine-endLine]");
    });

    it("cites a chunk with a line range as filePath:startLine-endLine", () => {
        const chunk = makeChunk({ filePath: "package.json", startLine: 6, endLine: 10 });
        const [, user] = buildMvpGuidePrompt([chunk]);
        const content = user?.content as string;

        expect(content).toContain("--- package.json:6-10 ---");
    });

    it("cites a chunk with no line range as the file path alone", () => {
        const chunk = makeChunk({ filePath: "README.md", startLine: undefined, endLine: undefined });
        const [, user] = buildMvpGuidePrompt([chunk]);
        const content = user?.content as string;

        expect(content).toContain("--- README.md ---");
        expect(content).not.toContain("README.md:");
    });

    it("includes the text of every supplied chunk in the user message", () => {
        const chunkA = makeChunk({ filePath: "a.ts", text: "export const a = 1;" });
        const chunkB = makeChunk({ filePath: "b.ts", text: "export const b = 2;" });
        const [, user] = buildMvpGuidePrompt([chunkA, chunkB]);
        const content = user?.content as string;

        expect(content).toContain("export const a = 1;");
        expect(content).toContain("export const b = 2;");
    });

    it("returns an empty user message when no chunks are supplied", () => {
        const [, user] = buildMvpGuidePrompt([]);

        expect(user?.content).toBe("");
    });
});
