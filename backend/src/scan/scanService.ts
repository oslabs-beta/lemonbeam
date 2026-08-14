// Repository analyzer coordinator — discover, classify, chunk. NOT the
// whole-scan coordinator; that's pipelineManager.ts, which calls this file
// as one step (see DECISIONS.md > "Thin Routes; `pipelineManager.ts`
// Sequences the Scan"). This file does not talk to GitHub, generate guides,
// or run cleanup.
//
// TODO: export a function that, given a downloaded repository's local path
// and the scan ID, does the following for every file:
// 1. call scan/discoverFiles.ts to walk the repo and get back the files
//    worth analyzing (already excludes node_modules, .git, build output,
//    binaries, and anything over the MVP's ~1MB per-file cap — see
//    DECISIONS.md > "Repository Size Limits for the MVP")
// 1a. before the per-file loop starts, read and parse package.json ONCE —
//    not per file. Reuse that same parsed object, plus the full file list
//    from step 1, on every classifyFile call in step 2 (see DECISIONS.md >
//    "Path-Based Classification for the MVP, Content-Pattern Signals as a
//    Stretch Goal"). Re-reading/re-parsing package.json inside the loop
//    would repeat identical, unchanging work once per discovered file.
// 2. call scan/classifyFile.ts on each discovered file — passing that
//    file's path, the full discovered-file list (for nearby-file checks),
//    and the package.json object from step 1a — to get its filePurpose/
//    language (producing a ChunkInput-shaped object — see types/chunk.ts).
//    Confirmed against the merged chunkFile.ts/configChunker.ts, which both
//    consume ChunkInput as-is.
// 3. call chunking/chunkFile.ts (the router) on each classified file to get
//    back Chunk[] for that file
// 4. if a file's chunker reports failure (e.g. configChunker's
//    { ok: false, reason, filePath }), SKIP that file, record its path and
//    the reason, and KEEP GOING with the rest of the repo — one bad file
//    must never abort the whole scan (see DECISIONS.md > "Skipped Files Are
//    Not Fatal, and Are Reported")
// 5. return both: all successfully produced chunks, AND the list of
//    { filePath, reason } for skipped files — pipelineManager.ts passes the
//    skipped-file list to orchestration/generateGuide.ts so it can build
//    the Uncertainties and Missing Information section
//
// For the MVP, this function does NOT write to SQLite — it returns
// { chunks, skippedFiles } in memory only (see DECISIONS.md > "In-Memory
// Chunk Storage for the MVP, SQLite as a Stretch Goal"). Persisting via
// db/chunkStore.ts is a stretch goal, built alongside "Five Separate
// Section-Generation Tasks" and/or "Asynchronous Scan Processing".
export {}
