// backend/src/orchestration/budgetChunkPerSection.ts
import { estimateTokens } from "./estimateChunkTokens.js";
import type { Chunk } from "../types/chunk.js";
import { GUIDE_SECTIONS } from "./guideSections.js";
import type { GuideSectionId } from "./guideSections.js";

type SectionBudgets = Record<GuideSectionId, number>;
type ScoreChunkForSections = (chunk: Chunk) => Record<GuideSectionId, number>;

function budgetChunkPerSection(
  chunks: Chunk[],
  budgets: SectionBudgets,
  scoreChunk: ScoreChunkForSections,
): { included: Chunk[]; excluded: Chunk[] } {
  // Precompute each chunk's token cost and per-section scores once, up
  // front, so every section below is working from the same numbers.
  const chunkInfo = chunks.map((chunk) => ({
    chunk,
    tokens: estimateTokens(chunk.text),
    scores: scoreChunk(chunk),
  }));

  // A chunk can be picked independently by more than one section, so we
  // collect the picks in a Set first and figure out included/excluded after
  // every section has had its turn.
  const pickedChunks = new Set<Chunk>();

  for (const { id: section } of GUIDE_SECTIONS) {
    const budget = budgets[section];

    // Candidates: chunks relevant to this section (score > 0), best-scoring
    // first. Ties go to the cheaper chunk, so we get more picks per budget.
    const candidates = chunkInfo
      .filter((info) => info.scores[section] > 0)
      .sort((a, b) => {
        const scoreDifference = b.scores[section] - a.scores[section];
        if (scoreDifference !== 0) return scoreDifference;
        return a.tokens - b.tokens;
      });

    let runningTotal = 0;

    for (const candidate of candidates) {
      // If this candidate doesn't fit, skip it and keep going — do NOT
      // stop early. A smaller, lower-scored chunk further down the list
      // may still fit even after a bigger one didn't.
      if (runningTotal + candidate.tokens <= budget) {
        runningTotal += candidate.tokens;
        pickedChunks.add(candidate.chunk);
      }
    }
  }

  // Now split every input chunk into included/excluded based on whether any
  // section ended up picking it.
  const included: Chunk[] = [];
  const excluded: Chunk[] = [];

  for (const chunk of chunks) {
    if (pickedChunks.has(chunk)) {
      included.push(chunk);
    } else {
      excluded.push(chunk);
    }
  }

  return { included, excluded };
}

export { budgetChunkPerSection };
export type { SectionBudgets, ScoreChunkForSections };