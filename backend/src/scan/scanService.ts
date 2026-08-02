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
// 2. call scan/classifyFile.ts on each discovered file to get its
//    filePurpose/language (producing a ChunkInput-shaped object — see
//    types/chunk.ts)
//    OPEN QUESTION: classifyFile.ts's exact output shape is still being
//    reconciled with configChunker.ts's ClassifiedFile type by the team —
//    don't assume `ChunkInput` is final until that's resolved.
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
