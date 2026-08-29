// A chunk that scores positively for a section and fits that section's
// token budget ends up in `included`.
//
// See TESTING.md > Orchestration
import { describe, it, expect } from "vitest";
import { budgetChunkPerSection } from "../../../backend/src/orchestration/budgetChunkPerSection.ts";
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

describe("budgetChunkPerSection", () => {
    it("includes a chunk that scores positively and fits its section's budget", () => {
        const chunk = makeChunk();
        const budgets = makeBudgets({ overview: 100 });
        const scoreChunk = () => ({ overview: 1, setup: 0, running: 0, structure: 0, testing: 0 });

        const result = budgetChunkPerSection([chunk], budgets, scoreChunk);

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

        const result = budgetChunkPerSection([chunk], budgets, scoreChunk);

        expect(result.included).toEqual([]);
        expect(result.excluded).toEqual([chunk]);
    });

    it("does not stop early: a cheaper, lower-scored chunk still fits after a pricier, higher-scored chunk didn't", () => {
        // ~300 tokens - too big for a 50-token budget on its own.
        const expensiveChunk = makeChunk({ chunkName: "expensive", text: "const value = 1;\n".repeat(50) });
        // ~1 token - comfortably fits in whatever budget is left.
        const cheapChunk = makeChunk({ chunkName: "cheap", text: "x" });

        const budgets = makeBudgets({ setup: 50 });
        // expensiveChunk scores higher, so it's tried first; cheapChunk is
        // the fallback once expensiveChunk is skipped for not fitting.
        const scoreChunk = (chunk: Chunk) => ({
            overview: 0,
            setup: chunk.chunkName === "expensive" ? 2 : 1,
            running: 0,
            structure: 0,
            testing: 0,
        });

        const result = budgetChunkPerSection([expensiveChunk, cheapChunk], budgets, scoreChunk);

        expect(result.included).toEqual([cheapChunk]);
        expect(result.excluded).toEqual([expensiveChunk]);
    });

    it("includes a chunk picked independently by two sections exactly once", () => {
        const chunk = makeChunk();
        const budgets = makeBudgets({ overview: 1000, setup: 1000 });
        const scoreChunk = () => ({ overview: 1, setup: 1, running: 0, structure: 0, testing: 0 });

        const result = budgetChunkPerSection([chunk], budgets, scoreChunk);

        expect(result.included).toEqual([chunk]);
        expect(result.excluded).toEqual([]);
    });

    it("fills a section's budget across multiple competing chunks, stopping once nothing else fits", () => {
        // 2, 5, and 9 tokens respectively - all score equally, so they're
        // tried cheapest-first. small + medium = 7, which fits in a budget
        // of 10; adding large on top would be 16, which doesn't.
        const smallChunk = makeChunk({ chunkName: "small", text: "zq" });
        const mediumChunk = makeChunk({ chunkName: "medium", text: "zq wk pr fh" });
        const largeChunk = makeChunk({ chunkName: "large", text: "zq wk pr fh xt lm bd nc" });

        const budgets = makeBudgets({ structure: 10 });
        const scoreChunk = () => ({ overview: 0, setup: 0, running: 0, structure: 1, testing: 0 });

        const result = budgetChunkPerSection([largeChunk, smallChunk, mediumChunk], budgets, scoreChunk);

        // Order shouldn't matter for which chunks get picked, only their
        // cost and the remaining budget - small and medium fit (7 total),
        // large alone would blow the 10-token budget.
        expect(result.included).toEqual([smallChunk, mediumChunk]);
        expect(result.excluded).toEqual([largeChunk]);
    });
});
