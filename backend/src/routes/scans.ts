// Scan API routes.
//
// This file stays THIN — see DECISIONS.md > "Thin Routes; `pipelineManager.ts`
// Sequences the Scan". It does NOT itself call GitHub, run analysis, or
// generate the guide. All of that sequencing lives in pipelineManager.ts.
//
// TODO: define POST /api/scans:
// 1. receive { repositoryUrl, openRouterApiKey } from the frontend
// 2. validate the request body with utils/validateScanRequest.ts (reject
//    unknown fields -> 400 INVALID_REQUEST_BODY; missing/invalid URL or key
//    -> the specific 400 codes in API_CONTRACT.md)
// 3. call pipelineManager.ts's exported scan function with the validated
//    repositoryUrl and openRouterApiKey
// 4. turn the result into the HTTP response API_CONTRACT.md defines:
//    - success -> 200 with { scanId, repository, guide.markdown }
//    - GitHub/validation failure -> the matching 4xx from API_CONTRACT.md
//    - LLM call failure (the MVP's one combined call failed) ->
//      401 LLM_AUTHENTICATION_FAILED or 502 LLM_SERVICE_ERROR /
//      EXTERNAL_SERVICE_ERROR, per DECISIONS.md > "One Combined Generation
//      Call for the MVP..."
//    - anything unexpected -> 500 INTERNAL_ERROR
//
//    THIS SPRINT: pipelineManager.ts doesn't call the LLM yet
//    (orchestration/generateGuide.ts doesn't exist). It stops at Group 3's
//    { chunks, skippedFiles }, so there's no guide.markdown to return yet
//    and the LLM-failure codes above don't apply this sprint. Return
//    whatever pipelineManager.ts actually produces this sprint (scanId +
//    repository metadata + that result); wire up guide.markdown and the
//    LLM-failure codes once generateGuide.ts exists next sprint.
//
// TODO (BYOK):
// - openRouterApiKey passes through this route only in memory — never log it,
//   never write it to SQLite, never include it in a response, including
//   error responses
export {}
