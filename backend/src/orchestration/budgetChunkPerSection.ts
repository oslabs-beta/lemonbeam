// backend/src/orchestration/selectEvidence.ts
import type { Chunk } from "../types/chunk.js";
import type { GuideSectionId } from "./guideSections.js";

type SectionBudgets = Record<GuideSectionId, number>;
type ScoreChunkForSections = (chunk: Chunk) => Record<GuideSectionId, number>;

function selectEvidence(
  chunks: Chunk[],
  budgets: SectionBudgets,
  scoreChunk: ScoreChunkForSections,
): { included: Chunk[]; excluded: Chunk[] } {
const included: Chunk[] = [];
  const excluded: Chunk[] = [];

  for (const chunk of chunks) {
    const scores = scoreChunk(chunk);
    const isRelevantSomewhere = Object.values(scores).some((score) => 
    score > 0);

    if (isRelevantSomewhere) {
      included.push(chunk);
    } else {
      excluded.push(chunk);
    }
  }


  return { included, excluded }; // stub — every test should fail against this
}

export { selectEvidence };
export type { SectionBudgets, ScoreChunkForSections };