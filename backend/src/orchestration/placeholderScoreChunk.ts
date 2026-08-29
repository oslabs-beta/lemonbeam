// Throwaway placeholder for ScoreChunkForSections until the real rule-based
// scoring rubric lands (see OSP-50, scoreChunkForSections.ts). Exists only so
// budgetChunkPerSection.ts has something to score chunks with in real guide
// generation. Swap the import in generateGuide.ts for scoreChunkForSections
// once OSP-50 ships — no change to budgetChunkPerSection.ts itself.
import type { Chunk } from "../types/chunk.js";
import type { GuideSectionId } from "./guideSections.js";
import type { ScoreChunkForSections } from "./budgetChunkPerSection.js";

const placeholderScoreChunk: ScoreChunkForSections = (chunk: Chunk) => {
    const scores: Record<GuideSectionId, number> = {
        overview: 0,
        setup: 0,
        running: 0,
        structure: 0,
        testing: 0,
    };

    if (chunk.filePurpose === "test") {
        scores.testing = 1;
    } else if (chunk.filePurpose === "config") {
        scores.setup = 1;
        scores.running = 1;
    }

    return scores;
};

export { placeholderScoreChunk };
