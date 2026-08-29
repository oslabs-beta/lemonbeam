// Guide generator. Called by pipelineManager.ts, after scan/scanService.ts
// returns { chunks, skippedFiles }.
//
// Orchestrates turning scanned code into a finished guide. Takes the chunks
// and skipped-file list produced by scanning, gets the five main sections
// written by one LLM call, appends a sixth section listing anything that
// couldn't be analyzed, and hands back the finished markdown.
//
// Everything is done in one LLM call rather than five separate ones (one
// per section) — simpler for the MVP, and it means GUIDE_SECTIONS' fixed
// order isn't checked here; the prompt already tells the model what order
// to write sections in, and this file just trusts that output rather than
// parsing and re-validating it.
//
// Later, this could be split into five parallel calls (one per section) so
// a slow or failing section doesn't hold up the others. That would need
// Promise.allSettled instead of Promise.all, so one failure doesn't wipe
// out the four sections that succeeded.
// list below.

import type { Chunk } from "../types/chunk.js";
import type { SkippedFile } from "../scan/scanService.js";
import { generateGuideSection } from "./generateGuideSection.js";
import { budgetChunkPerSection } from "./budgetChunkPerSection.js";
import { SECTION_BUDGETS } from "./guideSections.js";
import { placeholderScoreChunk } from "./placeholderScoreChunk.js";

// The full guide as one markdown string, ready to hand back to the caller.
type GuideResult = {
    markdown: string;
}

// Builds the sixth section directly from skippedFiles and budget-excluded
// chunks, rather than summarizing either via another LLM call — both are
// already fully known, so generating this programmatically is cheaper and
// deterministic (see DECISIONS.md > "Token-Budgeted, Section-Scored
// Evidence Selection (Token Ceiling Fix)").
function buildUncertaintiesSection(skippedFiles: SkippedFile[], excludedChunks: Chunk[]): string {
  if (skippedFiles.length === 0 && excludedChunks.length === 0) {
    return "## Uncertainties and Missing Information\n\nAll files were scanned successfully — there is nothing to report in this section.";
  }

  const sections = ["## Uncertainties and Missing Information"];

  if (skippedFiles.length > 0) {
    const skippedLines = skippedFiles.map((file) => `- \`${file.filePath}\` — ${file.reason}`);
    sections.push(
      "",
      "The following files could not be analyzed and may be missing from this guide:",
      "",
      ...skippedLines,
    );
  }

  if (excludedChunks.length > 0) {
    const excludedLines = excludedChunks.map((chunk) => {
      const label = chunk.chunkName ? `${chunk.filePath} (${chunk.chunkName})` : chunk.filePath;
      return `- \`${label}\` — excluded from evidence selection (irrelevant or over budget)`;
    });
    sections.push(
      "",
      "The following evidence was found but excluded due to per-section token budgets, and may be missing from this guide:",
      "",
      ...excludedLines,
    );
  }

  return sections.join("\n");
}

// generateGuideSection failures (rate limits, OpenRouter errors,
// malformed output) propagate uncaught. There is no retry and no
// partial result: the guide is either fully generated or the request fails.
async function generateGuide(
    chunks: Chunk[],
    skippedFiles: SkippedFile[],
    openRouterApiKey: string
): Promise<GuideResult> {
    const { included, excluded } = budgetChunkPerSection(chunks, SECTION_BUDGETS, placeholderScoreChunk);

    const { text } = await generateGuideSection({ openRouterApiKey, chunks: included });
    const uncertaintiesSection = buildUncertaintiesSection(skippedFiles, excluded);

    return {
        markdown: `${text}\n\n${uncertaintiesSection}`,
    };
}


export { generateGuide };
export type { GuideResult };

