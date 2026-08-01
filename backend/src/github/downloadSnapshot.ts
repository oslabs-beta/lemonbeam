// Downloads the exact repository snapshot (default branch + commit SHA
// already identified by github/validateRepository.ts) into this scan's
// temp directory (see utils/tempDirectory.ts), and returns the local
// folder path for scan/scanService.ts to analyze. Called by
// pipelineManager.ts, after validateRepository.ts and before scanService.ts.
//
// OPEN QUESTION (#3, not yet decided by the team): exact download
// mechanism. Two real options were discussed:
// - GitHub's REST API — but unauthenticated calls are capped at 60/hr per
//   IP, and validateRepository.ts already needs some of that budget
// - a plain tarball download from
//   codeload.github.com/{owner}/{repo}/tar.gz/{sha} — no auth, doesn't
//   count against the REST API's rate limit, likely the better fit for
//   JUST the download step
// Confirm with the team which to use (and whether a GitHub token is wanted
// at all) before implementing this file.
export {}
