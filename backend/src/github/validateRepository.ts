// Confirms the submitted repository is scannable, and resolves the exact
// version being analyzed. Called by pipelineManager.ts, right after the
// scan ID/temp directory are created and before any download happens.
//
// TODO: given a repositoryUrl, confirm:
// - it points to a real, public GitHub repository (-> 404
//   REPOSITORY_NOT_FOUND / 403 REPOSITORY_NOT_PUBLIC if not)
// - it's primarily JavaScript/TypeScript (-> 422 UNSUPPORTED_LANGUAGE)
// - it's not a monorepo (-> 422 UNSUPPORTED_MONOREPO)
// - it's within the MVP size limit: roughly 25-50MB total after ignore
//   rules exclude node_modules/.git/build output (-> 413
//   REPOSITORY_TOO_LARGE) — see DECISIONS.md > "Repository Size Limits for
//   the MVP"
// then resolve and return the default branch and the exact commit SHA to
// download (github/downloadSnapshot.ts uses these next).
//
// OPEN QUESTION (#3, not yet decided): whether these validation calls go
// through GitHub's REST API unauthenticated (60/hr per IP limit) or with a
// token for a higher limit. See github/downloadSnapshot.ts for the related
// question about the download step itself.
export {}
