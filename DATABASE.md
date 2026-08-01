# LemonBeam Database

## Purpose

This document is the source of truth for LemonBeam’s temporary SQLite data model.

It documents:

- the temporary database lifecycle
- concurrent scan isolation
- the MVP tables
- table columns
- relationships
- constraints
- indexes
- how normalized chunks map into SQLite

Related concepts belong in their owning documents:

- `PROJECT_BRIEF.md` — product scope, guide format, user flow, and stretch goals
- `ARCHITECTURE.md` — system components and how data moves through the pipeline
- `API_CONTRACT.md` — frontend and backend request and response formats
- `DECISIONS.md` — database choices and their reasoning
- `TESTING.md` — database testing strategy and commands
- `backend/src/types/chunk.ts` — executable TypeScript source of truth for the normalized chunk shape
- `backend/src/db/schema.sql` — executable SQLite schema

When the database design changes, update this document and `schema.sql` in the same pull request.

## Database Role

SQLite is a temporary structured workspace between repository analysis and guide generation.

LemonBeam uses it to store:

- the exact repository version being analyzed
- discovered file metadata
- file classifications
- normalized chunks
- source locations needed for citations
- metadata used by rule-based retrieval

The database is not permanent application storage.

## Concurrent Scan Isolation

Every repository submission receives its own:

- unique scan ID
- temporary directory
- downloaded repository snapshot
- SQLite database file
- intermediate processing files

Conceptually:

```text
Person A
-> scan ID: scan_a1
-> /tmp/lemonbeam/scan_a1/repository/
-> /tmp/lemonbeam/scan_a1/lemonbeam.sqlite

Person B
-> scan ID: scan_b2
-> /tmp/lemonbeam/scan_b2/repository/
-> /tmp/lemonbeam/scan_b2/lemonbeam.sqlite
```

Each request reads and writes only inside its own scan directory.

The application must not use shared runtime paths such as:

```text
backend/data/lemonbeam.sqlite
/tmp/lemonbeam/repository/
output/guide.md
```

Shared paths could allow one request to overwrite or read data from another request.

The isolation rule is:

```text
one submission
-> one scan ID
-> one temporary directory
-> one repository snapshot
-> one SQLite database
```

The database itself represents one scan. A scan table containing multiple scan rows is therefore unnecessary.

## MVP Data Model

The MVP uses three tables:

1. `scan_metadata`
2. `files`
3. `chunks`

Their relationship is:

```text
scan_metadata
  one row describing the database

files
  one row per analyzed repository file

files
  1
  |
  | produces
  |
  many
chunks
```

More precisely:

```text
files.id
   |
   +----< chunks.file_id
```

`scan_metadata` is not the parent of each file row. It records which repository version the temporary database represents.

---

# Table: `scan_metadata`

## Purpose

Stores the identity of the scan and the exact repository version represented by this database.

Each temporary database contains exactly one row in this table.

## Columns

| Column | SQLite type | Required | Description |
|---|---|---:|---|
| `id` | `INTEGER` | Yes | Single-row identifier |
| `scan_id` | `TEXT` | Yes | Unique scan identifier assigned by the backend |
| `repository_owner` | `TEXT` | Yes | GitHub user or organization that owns the repository |
| `repository_name` | `TEXT` | Yes | Repository name |
| `repository_url` | `TEXT` | Yes | Canonical public GitHub repository URL |
| `default_branch` | `TEXT` | Yes | Default branch selected for the scan |
| `commit_sha` | `TEXT` | Yes | Exact commit analyzed by LemonBeam |
| `created_at` | `TEXT` | Yes | UTC timestamp for when the database was initialized |

## Constraints

- `id` is always `1`.
- `scan_id` is unique.
- The table contains only one row.
- `commit_sha` identifies the exact repository snapshot downloaded for the scan.
- The repository metadata must match the values returned by `POST /api/scans`.

## Example Row

| id | scan_id | repository_owner | repository_name | default_branch | commit_sha |
|---:|---|---|---|---|---|
| `1` | `scan_a1` | `example` | `project` | `main` | `a84f32c` |

---

# Table: `files`

## Purpose

Stores one row for every repository file LemonBeam chooses to analyze.

Files excluded by ignore or safety rules do not need rows in this table.

Because the database contains only one scan, `files` does not need a `scan_id` column.

## Columns

| Column | SQLite type | Required | Description |
|---|---|---:|---|
| `id` | `INTEGER` | Yes | Internal file identifier |
| `file_path` | `TEXT` | Yes | Repository-relative file path |
| `file_purpose` | `TEXT` | Yes | Deterministic classification assigned to the file |
| `language` | `TEXT` | No | Detected language or structured file type |
| `classification_score` | `REAL` | No | Confidence score produced by classification rules |

## File Purpose Values

The agreed file-purpose categories are:

```text
source
test
docs
config
scripts
types
unknown
```

Files without sufficient evidence should use `unknown` rather than being forced into another category.

The allowed values in the database, `classifyFile.ts`, and `types/chunk.ts` must remain aligned.

## Constraints

- `id` is an auto-incrementing primary key.
- `file_path` is unique within the database.
- `file_path` is relative to the repository root.
- `classification_score`, when present, is between `0` and `1`.
- Deleting a file deletes its chunks.

## Example Rows

| id | file_path | file_purpose | language | classification_score |
|---:|---|---|---|---:|
| `1` | `README.md` | `docs` | `markdown` | `1.0` |
| `2` | `src/index.ts` | `source` | `typescript` | `0.95` |
| `3` | `src/index.test.ts` | `test` | `typescript` | `1.0` |
| `4` | `package.json` | `config` | `json` | `1.0` |

---

# Table: `chunks`

## Purpose

Stores the normalized evidence units created by LemonBeam’s parsing and chunking strategies.

Guide-section retrieval queries select rows from this table and join them with file metadata from `files`.

## Columns

| Column | SQLite type | Required | Description |
|---|---|---:|---|
| `id` | `INTEGER` | Yes | Internal chunk identifier |
| `file_id` | `INTEGER` | Yes | File that produced the chunk |
| `parser` | `TEXT` | Yes | Parsing or chunking strategy used |
| `chunk_kind` | `TEXT` | Yes | Kind of structure represented by the chunk |
| `chunk_name` | `TEXT` | No | Name of the function, class, heading, script, or other structure |
| `parent_name` | `TEXT` | No | Name of the containing structure when available |
| `start_line` | `INTEGER` | No | First source line included in the chunk |
| `end_line` | `INTEGER` | No | Last source line included in the chunk |
| `start_column` | `INTEGER` | No | First source column when available |
| `end_column` | `INTEGER` | No | Last source column when available |
| `text` | `TEXT` | Yes | Exact repository evidence stored in the chunk |

## Parser Values

The current parser values are:

```text
tree-sitter
markdown
config
fallback
```

These values must remain aligned with `backend/src/types/chunk.ts`.

## Chunk Kinds

`chunk_kind` describes what a chunk represents.

Examples may include:

```text
function
method
class
interface
type
enum
test-suite
test-case
hook
markdown-section
package-scripts
dependencies
compiler-options
config-block
text-block
```

The exact set may grow as chunkers are implemented. Values should be stable, descriptive, and documented when introduced.

## Constraints

- `id` is an auto-incrementing primary key.
- `file_id` references `files.id`.
- `text` cannot be empty.
- When both are present, `end_line` must not be less than `start_line`.
- Deleting a file deletes its chunks.

## Example Rows

| id | file_id | parser | chunk_kind | chunk_name | start_line | end_line |
|---:|---:|---|---|---|---:|---:|
| `1` | `1` | `markdown` | `markdown-section` | `Installation` | `12` | `28` |
| `2` | `2` | `tree-sitter` | `function` | `startServer` | `8` | `24` |
| `3` | `3` | `tree-sitter` | `test-suite` | `scanService` | `5` | `42` |
| `4` | `4` | `config` | `package-scripts` | `scripts` | `6` | `12` |

---

# Normalized Chunk Mapping

The normalized TypeScript chunk shape belongs in:

```text
backend/src/types/chunk.ts
```

The database maps that shape as follows:

| TypeScript field | Database location |
|---|---|
| `scanId` | `scan_metadata.scan_id` |
| `filePath` | `files.file_path` |
| `filePurpose` | `files.file_purpose` |
| `language` | `files.language` |
| `parser` | `chunks.parser` |
| `chunkKind` | `chunks.chunk_kind` |
| `chunkName` | `chunks.chunk_name` |
| `parentName` | `chunks.parent_name` |
| `startLine` | `chunks.start_line` |
| `endLine` | `chunks.end_line` |
| `startColumn` | `chunks.start_column` |
| `endColumn` | `chunks.end_column` |
| `text` | `chunks.text` |

The full TypeScript interface should not be duplicated here. This table documents only how the internal type maps into SQLite.

---

# Proposed MVP Schema

`backend/src/db/schema.sql` should implement the following structure:

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE scan_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  scan_id TEXT NOT NULL UNIQUE,
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  default_branch TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  file_purpose TEXT NOT NULL CHECK (
    file_purpose IN (
      'source',
      'test',
      'docs',
      'config',
      'scripts',
      'types',
      'unknown'
    )
  ),
  language TEXT,
  classification_score REAL CHECK (
    classification_score IS NULL
    OR (
      classification_score >= 0
      AND classification_score <= 1
    )
  )
);

CREATE TABLE chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  parser TEXT NOT NULL CHECK (
    parser IN (
      'tree-sitter',
      'markdown',
      'config',
      'fallback'
    )
  ),
  chunk_kind TEXT NOT NULL,
  chunk_name TEXT,
  parent_name TEXT,
  start_line INTEGER,
  end_line INTEGER,
  start_column INTEGER,
  end_column INTEGER,
  text TEXT NOT NULL CHECK (length(text) > 0),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  CHECK (
    start_line IS NULL
    OR end_line IS NULL
    OR end_line >= start_line
  )
);
```

This schema is intentionally small.

New tables should be added only when an agreed MVP requirement cannot be represented by these three tables.

---

# Indexes

Rule-based retrieval commonly filters by file purpose, language, parser, chunk kind, name, and path.

The MVP should include these indexes:

```sql
CREATE INDEX idx_files_purpose
ON files(file_purpose);

CREATE INDEX idx_files_language
ON files(language);

CREATE INDEX idx_chunks_file_id
ON chunks(file_id);

CREATE INDEX idx_chunks_parser
ON chunks(parser);

CREATE INDEX idx_chunks_kind
ON chunks(chunk_kind);

CREATE INDEX idx_chunks_name
ON chunks(chunk_name);
```

The unique constraint on `files.file_path` also creates an index for locating a file within the scan database.

Additional indexes should be added only after retrieval queries demonstrate a need for them.

---

# Retrieval Relationships

A section-generation task retrieves chunk evidence by joining `chunks` to `files`.

Conceptually:

```sql
SELECT
  chunks.id,
  files.file_path,
  files.file_purpose,
  files.language,
  chunks.parser,
  chunks.chunk_kind,
  chunks.chunk_name,
  chunks.parent_name,
  chunks.start_line,
  chunks.end_line,
  chunks.text
FROM chunks
JOIN files ON files.id = chunks.file_id
WHERE files.file_purpose IN (...)
  AND chunks.chunk_kind IN (...);
```

The exact section-specific SQL belongs in the backend implementation rather than this document.

Retrieval must use parameterized queries or prepared statements.

## Citation Source

A chunk row is the smallest stored evidence unit.

The backend may use the chunk’s `id` as the internal source identifier supplied to a section-generation task.

A citation can then be resolved through:

```text
chunk ID
-> chunk text and line range
-> file row
-> repository-relative file path
-> scan_metadata
-> repository URL and commit SHA
```

This allows a generated claim to be connected to the exact repository version and source location that supported it.

The public citation format belongs to the guide-generation implementation and does not require another database table for the MVP.

---

# Data Insertion Order

The expected write order is:

```text
1. generate a unique scan ID
2. create a unique temporary scan directory
3. create the scan-specific SQLite database
4. enable foreign-key enforcement
5. run schema.sql
6. insert one scan_metadata row
7. insert discovered and classified files
8. insert normalized chunks for each file
9. run section-specific retrieval queries
```

File and chunk inserts should use transactions when inserting batches.

If a file fails to produce chunks, its file row may still remain useful for repository-structure analysis.

---

# Connection Isolation

The backend must not use one global SQLite connection for all scans.

Each scan should open a connection to its own database path.

Conceptually:

```text
scan_a1 request
-> connection to /tmp/lemonbeam/scan_a1/lemonbeam.sqlite

scan_b2 request
-> connection to /tmp/lemonbeam/scan_b2/lemonbeam.sqlite
```

Functions that save or retrieve evidence must receive the correct scan-specific database connection or path.

This prevents one request from reading or writing another request’s data.

---

# Cleanup Lifecycle

The temporary database lifecycle is:

```text
generate unique scan ID
-> create scan directory
-> create database
-> initialize schema
-> insert scan metadata
-> insert files
-> insert chunks
-> retrieve evidence
-> generate and return guide
-> close the scan-specific database connection
-> delete only that scan directory
```

Cleanup for one scan must never delete the shared parent directory or another scan’s workspace.

For example:

```text
safe:
delete /tmp/lemonbeam/scan_a1/

unsafe:
delete /tmp/lemonbeam/
```

Cleanup should also run when a scan fails so temporary repository data is not abandoned.

The application must close active SQLite connections before attempting to delete the database file.

---

# Data Not Stored in the MVP

The MVP database does not require permanent tables for:

- users
- authentication
- saved scan history
- cached guides
- vector embeddings
- private repository credentials
- HTML guide output

The current schema also does not require tables for generated guide sections, citations, or uncertainties.

Those values can remain part of the in-memory orchestration result during a scan.

Adding tables for those values should happen only if the implementation develops a clear need and the team updates `DECISIONS.md`, `ARCHITECTURE.md`, and this document.

## Secrets

The database must never store:

- GitHub tokens
- OpenAI API keys
- Anthropic API keys
- environment-variable secrets
- private repository credentials

Repository files and chunk text are temporary scan evidence and must be deleted with the scan workspace.