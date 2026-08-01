// Guide generator. Called by pipelineManager.ts, after scan/scanService.ts
// returns chunks + a skipped-files list.
//
// FOR THE MVP: this is ONE combined generation task, not five. See
// DECISIONS.md > "One Combined Generation Call for the MVP, Five Tasks as a
// Stretch Goal" and ARCHITECTURE.md > "Guide Orchestration".
//
// TODO (MVP):
// 1. retrieve evidence across all five primary sections (not narrowed to
//    one section — see db/chunkStore.ts, once #8 resolves storage)
// 2. build the single general MVP prompt using prompts/mvpGuidePrompt.ts
// 3. make ONE LLM call via utils/openaiClient.ts, using the user-supplied
//    API key passed in from pipelineManager.ts — never a shared
//    server-side key
// 4. validate the returned citations
// 5. assemble the sixth "Uncertainties and Missing Information" section
//    from the skipped-files list passed in from scanService.ts (via
//    pipelineManager.ts) — NOT from a second LLM call
// 6. return the combined guide.markdown, ready for pipelineManager.ts to
//    hand back to routes/scans.ts
//
// If the one call fails outright (rate limit, OpenAI error, malformed
// output), let that failure propagate — the whole scan fails for the MVP,
// there is no partial guide. pipelineManager.ts maps this to
// LLM_SERVICE_ERROR / EXTERNAL_SERVICE_ERROR. No retry logic required.
//
// STRETCH GOAL (not MVP): once "Five Separate Section-Generation Tasks" is
// built, this file instead starts five tasks via
// orchestration/generateGuideSection.ts, running them in PARALLEL (e.g.
// Promise.allSettled, not Promise.all, so one failed section doesn't
// cancel the other four), sorts them into the fixed order, and merges each
// task's own uncertainty output with the skipped-files list.
export {}
