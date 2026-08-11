// Placeholder for validating the POST /api/scans request body.
// This will eventually check repositoryUrl and openRouterApiKey before any
// repository download or LLM call happens. See API_CONTRACT.md for the
// exact request shape and error codes.
//
// Called directly by routes/scans.ts, before it calls pipelineManager.ts —
// this is the one piece of request-shape validation that stays in routes/
// (see DECISIONS.md > "Thin Routes; `pipelineManager.ts` Sequences the
// Scan").
//
// TODO:
// - reject unknown fields -> 400 INVALID_REQUEST_BODY
// - require repositoryUrl -> 400 MISSING_REPOSITORY_URL / INVALID_REPOSITORY_URL
// - require openRouterApiKey as a non-empty string matching the expected
//   OpenRouter key format -> 400 MISSING_OPENROUTER_API_KEY / INVALID_OPENROUTER_API_KEY
// - never log or persist openRouterApiKey, even inside validation error messages
export {}
