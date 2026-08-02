// Chunk storage helpers — insert/select functions for one scan's SQLite
// database (see db/database.ts).
//
// NOT BUILT FOR THE MVP — same as db/database.ts. See DECISIONS.md >
// "In-Memory Chunk Storage for the MVP, SQLite as a Stretch Goal".
//
// TODO (stretch goal):
// - insert the scan_metadata row, files rows, and chunks rows described in
//   DATABASE.md's "Proposed MVP Schema" (use transactions for batches)
// - use parameterized queries / prepared statements only (see DECISIONS.md
//   > "Raw SQL for Retrieval")
// - for the MVP's one combined generation call, retrieval likely needs
//   evidence across ALL file purposes/chunk kinds in one query (not the
//   narrower per-section queries the five-task stretch goal would use) —
//   see DECISIONS.md > "One Combined Generation Call for the MVP..."
export {}
