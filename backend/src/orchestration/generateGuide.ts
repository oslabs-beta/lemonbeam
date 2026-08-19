import type { Chunk } from "../types/chunk";
import type { SkippedFile } from "../scan/scanService";
import { generateGuideSection } from "./generateGuideSection";

type GuideResult = {
    markdown: string;
}

function buildUncertaintiesSection(skippedFiles: SkippedFile[]): string {
  if (skippedFiles.length === 0) {
    return "## Uncertainties and Missing Information\n\nAll files were scanned successfully — there is nothing to report in this section.";
  }

  const lines = skippedFiles.map((file) => `- \`${file.filePath}\` — ${file.reason}`);

  return [
    "## Uncertainties and Missing Information",
    "",
    "The following files could not be analyzed and may be missing from this guide:",
    "",
    ...lines,
  ].join("\n");
}

async function generateGuide(
    chunks: Chunk[],
    skippedFiles: SkippedFile[],
    openRouterApiKey: string
): Promise<GuideResult> {
    const { text } = await generateGuideSection({ openRouterApiKey, chunks });
    const uncertaintiesSection = buildUncertaintiesSection(skippedFiles);

    return {
        markdown: `${text}\n\n${uncertaintiesSection}`,
    };
}


export { generateGuide };
export type { GuideResult };

// Guide generator. Called by pipelineManager.ts, after scan/scanService.ts
// returns { chunks, skippedFiles }.
//
// FOR THE MVP: this is ONE combined generation task, not five (see
// DECISIONS.md > "One Combined Generation Call for the MVP, Five Tasks as a
// Stretch Goal").
//
// This file does NOT retrieve evidence, build the prompt, call the LLM, or
// validate citations — that's orchestration/generateGuideSection.ts's job
// (separate task). This file only orchestrates that single call and
// assembles the final result:
//
// 1. take the in-memory { chunks, skippedFiles } passed in from
//    pipelineManager.ts (scanService.ts's output) — for the MVP this is a
//    plain value, not a SQLite query (see DECISIONS.md > "In-Memory Chunk
//    Storage for the MVP, SQLite as a Stretch Goal")
// 2. call generateGuideSection.ts ONCE for the MVP's combined task
// 3. use guideSections.ts's fixed order to place the returned text into
//    the five-section structure (open question: whether/how this file
//    validates the returned markdown's section order against
//    GUIDE_SECTIONS, or just trusts the single LLM call already produced
//    them in order per the prompt's instructions — not decided yet)
// 4. assemble the sixth "Uncertainties and Missing Information" section
//    from the skipped-files list passed in — built programmatically, NOT a
//    second LLM call (see PROJECT_BRIEF.md > "Fixed Guide Format" > section 6)
// 5. return the combined guide.markdown for pipelineManager.ts to hand
//    back to routes/scans.ts
//
// If generateGuideSection.ts's call fails outright (rate limit, OpenRouter
// error, malformed output), let that failure propagate — the whole scan
// fails for the MVP, there is no partial guide. pipelineManager.ts maps
// this to LLM_SERVICE_ERROR / EXTERNAL_SERVICE_ERROR. No retry logic
// required.
//
// Not in scope here: orchestration/generateGuideSection.ts and
// orchestration/guideSections.ts (separate tasks, this file depends on
// both), and pipelineManager.ts calling this file (separate task, depends
// on this one).
//
// STRETCH GOAL (not MVP): once "Five Separate Section-Generation Tasks" is
// built, this file instead starts five tasks via
// orchestration/generateGuideSection.ts, running them in PARALLEL (e.g.
// Promise.allSettled, not Promise.all, so one failed section doesn't
// cancel the other four), sorts them into the fixed order, and merges each
// task's own uncertainty output with the skipped-files list.
