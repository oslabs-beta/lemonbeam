// Chunk storage helpers — insert/select functions for one scan's SQLite
// database (see db/database.ts).
//
// OPEN QUESTION (#8, not yet decided): same as db/database.ts — don't start
// implementing this until the team confirms the MVP actually stores chunks
// in SQLite rather than keeping them in memory.
//
// TODO (once #8 says yes):
// - insert the scan_metadata row, files rows, and chunks rows described in
//   DATABASE.md's "Proposed MVP Schema" (use transactions for batches)
// - use parameterized queries / prepared statements only (see DECISIONS.md
//   > "Raw SQL for Retrieval")
// - for the MVP's one combined generation call, retrieval likely needs
//   evidence across ALL file purposes/chunk kinds in one query (not the
//   narrower per-section queries the five-task stretch goal would use) —
//   see DECISIONS.md > "One Combined Generation Call for the MVP..."
export {}
