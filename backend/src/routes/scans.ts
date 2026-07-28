// Scan API routes.
// This file will define POST /api/scans: receive { repositoryUrl, openaiApiKey }
// from the frontend, validate the body, and call the scan service to run the
// backend workflow.
//
// TODO (BYOK):
// - validate the request body with utils/validateScanRequest.ts
// - hold openaiApiKey in memory only for this request — never log it,
//   never write it to SQLite, never include it in a response
// - pass openaiApiKey down into orchestration/generateGuide.ts
// - catch OpenAI auth failures and respond 401 LLM_AUTHENTICATION_FAILED
//   (see API_CONTRACT.md and DECISIONS.md > BYOK)
export {}
