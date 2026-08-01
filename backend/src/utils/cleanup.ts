// Deletes one scan's temporary data: the downloaded repository snapshot,
// this scan's SQLite database file (if #8 decides the MVP uses one) and
// connection, and any other intermediate files — all inside that scan's
// temp directory only (see DATABASE.md > "Cleanup Lifecycle": delete
// /tmp/lemonbeam/scan_a1/, never the shared /tmp/lemonbeam/ parent).
//
// Called by pipelineManager.ts inside a try/finally, so this runs whether
// the scan succeeded or failed at any step (see DECISIONS.md > "Thin
// Routes; `pipelineManager.ts` Sequences the Scan"). Close any open SQLite
// connection before deleting the database file.
export {}
