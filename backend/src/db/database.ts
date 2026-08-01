// SQLite database setup — one isolated database PER SCAN, not one shared
// file. DATABASE.md > "Concurrent Scan Isolation" explicitly says a shared
// path like backend/data/lemonbeam.sqlite is UNSAFE — every scan needs its
// own temp directory + database path (see utils/tempDirectory.ts).
//
// NOT BUILT FOR THE MVP — see DECISIONS.md > "In-Memory Chunk Storage for
// the MVP, SQLite as a Stretch Goal". scanService.ts holds chunks in
// memory instead. This file is a stretch goal, built alongside "Five
// Separate Section-Generation Tasks" and/or "Asynchronous Scan
// Processing" (see PROJECT_BRIEF.md).
//
// TODO (stretch goal): given a scan's unique database
// file path (inside that scan's temp directory), open/create the SQLite
// file, enable `PRAGMA foreign_keys = ON`, and run db/schema.sql against it
// so scan_metadata/files/chunks tables exist before anything is inserted.
// See DATABASE.md > "Proposed MVP Schema" and "Data Insertion Order".
export {}
