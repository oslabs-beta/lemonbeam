// Placeholder for building a per-request OpenAI client.
// This will eventually construct an OpenAI SDK client using the user-supplied
// API key from the current scan request — never a shared server-side key.
//
// Used by orchestration/generateGuide.ts. For the MVP, that's one client
// used for the single combined generation call; the five-task stretch goal
// would reuse the same client across five parallel calls (see DECISIONS.md
// > "One Combined Generation Call for the MVP, Five Tasks as a Stretch
// Goal").
//
// TODO (BYOK — see DECISIONS.md > "User-Supplied OpenAI API Key (BYOK)"):
// - export a function like getOpenAIClient(apiKey: string) that returns
//   `new OpenAI({ apiKey })`
// - build this client fresh inside each request handler; do NOT create a
//   module-level/shared client and do NOT fall back to process.env.OPENAI_API_KEY
//   except as a local-dev convenience explicitly called out in ARCHITECTURE.md
// - export a way to validate the key against OpenAI itself (e.g. a cheap
//   models.list() call) so we can fail fast with 401 LLM_AUTHENTICATION_FAILED
//   before running the full guide generation pipeline
// - never log the key, never attach it to a thrown Error
export {}
