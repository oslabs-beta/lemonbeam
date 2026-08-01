// Creates one scan's isolated temporary directory (and, once #8 is
// resolved, its SQLite database path inside that directory) — never a
// shared path. See DATABASE.md > "Concurrent Scan Isolation".
//
// Called by pipelineManager.ts, right after it generates the scan ID and
// right before any GitHub request is made (see DECISIONS.md > "Thin
// Routes; `pipelineManager.ts` Sequences the Scan" and ARCHITECTURE.md >
// "Express Backend").
//
// TODO: export a function that, given a scan ID, creates and returns a
// unique temp directory path (e.g. under the OS temp dir), something like
// /tmp/lemonbeam/{scanId}/, for the downloaded repository snapshot and
// (later, if #8 says yes) that scan's SQLite database file to live in.
export {}
