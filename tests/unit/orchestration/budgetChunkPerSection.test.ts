// A chunk that scores positively for a section and fits that section's
// token budget ends up in `included`.
//
// See TESTING.md > Orchestration
import { describe, it, expect } from "vitest";
import { selectEvidence } from "../../../backend/src/orchestration/budgetChunkPerSection.ts";
import type { Chunk } from "../../../backend/src/types/chunk.ts";
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

function makeBudgets(overrides: Partial<Record<GuideSectionId, number>> = {}): Record<GuideSectionId, number> {
    return {
        overview: 0,
        setup: 0,
        running: 0,
        structure: 0,
        testing: 0,
        ...overrides,
    };
}

describe("selectEvidence", () => {
    it("includes a chunk that scores positively and fits its section's budget", () => {
        const chunk = makeChunk();
        const budgets = makeBudgets({ overview: 100 });
        const scoreChunk = () => ({ overview: 1, setup: 0, running: 0, structure: 0, testing: 0 });

        const result = selectEvidence([chunk], budgets, scoreChunk);

        expect(result.included).toEqual([chunk]);
        expect(result.excluded).toEqual([]);
    });

    it("excludes a chunk that only scores positively for a section whose budget is too small to fit it", () => {
        const chunk = makeChunk();
        // setup's budget is 0, so nothing can ever fit into it, regardless of
        // the chunk's actual token cost. testing has plenty of room, but this
        // chunk scores 0 for testing, so it's never a candidate there either.
        const budgets = makeBudgets({ setup: 0, testing: 1000 });
        const scoreChunk = () => ({ overview: 0, setup: 1, running: 0, structure: 0, testing: 0 });

        const result = selectEvidence([chunk], budgets, scoreChunk);

        expect(result.included).toEqual([]);
        expect(result.excluded).toEqual([chunk]);
    });
});
