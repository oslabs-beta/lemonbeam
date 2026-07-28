// Future guide-section generator.
// This will retrieve evidence from SQLite, call the matching prompt builder, and make the LLM call.
//
// TODO (BYOK):
// - accept an OpenAI client (see utils/openaiClient.ts) built from the
//   request's openaiApiKey — construct it per-request, never as a shared singleton
// - catch OpenAI authentication errors here and rethrow a specific error the
//   route can map to 401 LLM_AUTHENTICATION_FAILED
export {}
