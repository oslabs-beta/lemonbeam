// SQLite database setup — one isolated database PER SCAN, not one shared
// file. DATABASE.md > "Concurrent Scan Isolation" explicitly says a shared
// path like backend/data/lemonbeam.sqlite is UNSAFE — every scan needs its
// own temp directory + database path (see utils/tempDirectory.ts).
//
// OPEN QUESTION (#8, not yet decided by the team): does the MVP actually
// persist chunks to SQLite this sprint, or keep everything in memory for
// now and build this file in a later sprint? Don't start implementing this
// file until that's resolved — see DECISIONS.md and PROJECT_BRIEF.md >
// "Asynchronous Scan Processing".
//
// TODO (once #8 says yes, build this now): given a scan's unique database
// file path (inside that scan's temp directory), open/create the SQLite
// file, enable `PRAGMA foreign_keys = ON`, and run db/schema.sql against it
// so scan_metadata/files/chunks tables exist before anything is inserted.
// See DATABASE.md > "Proposed MVP Schema" and "Data Insertion Order".
export {}
