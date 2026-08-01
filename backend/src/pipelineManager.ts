// Pipeline manager — the one file that sequences an entire scan, start to finish.
//
// This is the "manager": routes/scans.ts stays thin (it only validates the
// request and formats the HTTP response); this file is what actually calls
// GitHub, the analyzer, guide generation, and cleanup, in order.
//
// See DECISIONS.md > "Thin Routes; `pipelineManager.ts` Sequences the Scan"
// and ARCHITECTURE.md > "Express Backend" / "End-to-End Scan Lifecycle".
//
// TODO: export a function (e.g. runScan(repositoryUrl, openaiApiKey)) that:
//
// 1. generates a unique scan ID
// 2. calls utils/tempDirectory.ts to create this scan's isolated temp
//    directory (before any GitHub request — see DECISIONS.md > scan
//    ID/workspace ownership)
// 3. calls github/validateRepository.ts to confirm the repo exists, is
//    public, is JS/TS, is not a monorepo, and is within the MVP size limit
//    (~25-50MB total after ignore rules — see DECISIONS.md > "Repository
//    Size Limits for the MVP"), then identifies the default branch + commit
//    SHA
// 4. calls github/downloadSnapshot.ts to download the exact snapshot into
//    the scan's temp directory
//    OPEN QUESTION (#3, not yet decided): exact download mechanism — likely
//    the GitHub REST API for validation calls + a separate tarball URL
//    (codeload.github.com) for the actual download, to avoid burning the
//    60/hr unauthenticated REST rate limit on the download itself. Confirm
//    with the team before implementing.
// 5. calls scan/scanService.ts to discover, classify, and chunk the
//    downloaded repository. scanService.ts returns both the produced chunks
//    and a list of skipped files (path + reason) — see DECISIONS.md >
//    "Skipped Files Are Not Fatal, and Are Reported"
//    OPEN QUESTION (#8, not yet decided): do the chunks (and skipped-file
//    list) get stored in this scan's SQLite database (db/database.ts,
//    db/chunkStore.ts), or kept in memory only for the MVP? Resolve this
//    before wiring step 5 up to step 6.
// 6. calls orchestration/generateGuide.ts to generate the guide. For the
//    MVP this is ONE combined LLM call producing all five primary sections
//    (see DECISIONS.md > "One Combined Generation Call for the MVP, Five
//    Tasks as a Stretch Goal"). Pass the skipped-files list from step 5 so
//    generateGuide.ts can assemble the sixth "Uncertainties and Missing
//    Information" section from it (no extra LLM call).
// 7. wraps steps 2–6 in a try/finally block that calls utils/cleanup.ts no
//    matter what happens — success, a thrown error at any step, or an
//    OpenAI failure. Cleanup must run even when the scan fails.
// 8. if the one MVP generation call fails outright (OpenAI error, rate
//    limit, malformed output), the whole scan fails — there is no partial
//    guide for the MVP. Return an error that routes/scans.ts can map to
//    LLM_SERVICE_ERROR / EXTERNAL_SERVICE_ERROR (see API_CONTRACT.md). No
//    retry logic is required for the MVP.
// 9. on success, returns whatever routes/scans.ts needs to build the 200
//    response defined in API_CONTRACT.md: scanId, repository metadata
//    (name, owner, url, defaultBranch, commitSha), and guide.markdown.
//
// This file does not itself talk to Express (no req/res) — routes/scans.ts
// owns that. This file also does not contain GitHub, scanning, chunking, or
// prompt logic itself — it only calls the files that do.
export {}
