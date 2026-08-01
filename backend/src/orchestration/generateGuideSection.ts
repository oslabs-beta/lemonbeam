// Shared single-generation-call process: retrieve evidence, build the
// matching prompt, make the LLM call, validate citations.
//
// FOR THE MVP: generateGuide.ts calls this ONCE, for the combined task
// covering all five sections (see DECISIONS.md > "One Combined Generation
// Call for the MVP, Five Tasks as a Stretch Goal"). This file's job doesn't
// really change shape for the MVP vs. the stretch goal — it's still "run
// one generation task" — the difference is how many times generateGuide.ts
// calls it (once now, five times in parallel later) and how broad the
// retrieved evidence and prompt are.
//
// TODO:
// - accept an OpenAI client (see utils/openaiClient.ts) built from the
//   request's openaiApiKey — construct it per-request, never as a shared
//   singleton
// - retrieve relevant chunks (via db/chunkStore.ts, once #8 resolves
//   storage) — for the MVP, evidence across all five sections; in the
//   stretch goal, evidence scoped to one section
// - use the matching prompt builder from prompts/ — for the MVP, the one
//   general prompt file; in the stretch goal, the section-specific one
// - catch OpenAI authentication errors here and rethrow a specific error
//   pipelineManager.ts/routes/scans.ts can map to 401
//   LLM_AUTHENTICATION_FAILED
// - return the resulting text, citations, and any uncertainty information
export {}
