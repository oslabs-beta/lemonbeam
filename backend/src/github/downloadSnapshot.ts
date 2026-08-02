// Downloads the exact repository snapshot (default branch + commit SHA
// already identified by github/validateRepository.ts) into this scan's
// temp directory (see utils/tempDirectory.ts), and returns the local
// folder path for scan/scanService.ts to analyze. Called by
// pipelineManager.ts, after validateRepository.ts and before scanService.ts.
//
// Downloads from the unauthenticated tarball URL
// codeload.github.com/{owner}/{repo}/tar.gz/{sha} — NOT the REST API, and
// does NOT use GITHUB_TOKEN. This is a plain file download and isn't
// subject to the REST API's rate limit at all (see DECISIONS.md > "GitHub
// Access Uses a Personal Access Token for Validation Calls").
export {}
