// Repository analyzer coordinator — discover, classify, chunk. NOT the
// whole-scan coordinator; that's pipelineManager.ts, which calls this file
// as one step (see DECISIONS.md > "Thin Routes; `pipelineManager.ts`
// Sequences the Scan"). This file does not talk to GitHub, generate guides,
// or run cleanup.
//
// TODO: export a function that, given a downloaded repository's local path
// and the scan ID, does the following for every file:
// 1. call scan/discoverFiles.ts to walk the repo and get back the files
//    worth analyzing, as paths relative to the repo root (already excludes
//    node_modules, .git, build output, binaries, and anything over the
//    MVP's ~1MB per-file cap — see DECISIONS.md > "Repository Size Limits
//    for the MVP")
// 2. for each discovered file path:
//    a. read the file's content from disk (join the repo's local path with
//       the relative file path from step 1)
//    b. call scan/classifyFile.ts — passing only the file's path — to get
//       back { filePurpose, language }. classifyFile.ts does NOT return a
//       ChunkInput; it only returns this one small object.
//    c. assemble the full ChunkInput yourself (see types/chunk.ts):
//       { scanId, filePath, content, filePurpose, language } — combining
//       the scanId argument, the relative filePath from step 1, the content
//       read in 2a, and the filePurpose/language from 2b.
// 3. call chunking/chunkFile.ts (the router) with that ChunkInput to get
//    back a ChunkResult for that file. Confirmed against the merged
//    chunkFile.ts/configChunker.ts, which both consume ChunkInput as-is.
// 4. if a file fails anywhere in steps 2–3 (content read error, or a
//    chunker reporting { ok: false, reason, filePath }), SKIP that file,
//    record { filePath, reason }, and KEEP GOING with the rest of the
//    repo — one bad file must never abort the whole scan (see DECISIONS.md
//    > "Skipped Files Are Not Fatal, and Are Reported")
// 5. return both: all successfully produced chunks (from every ChunkResult
//    with ok: true, flattened into one array), AND the list of
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
