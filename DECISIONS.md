# LemonBeam Technical Decisions

## Purpose

This document records important project decisions and the reasons behind them.

It owns the **why** behind major product and technical choices.

Implementation details belong in their owning documents:

- `PROJECT_BRIEF.md` — product problem, MVP scope, guide format, user flow, evaluation goals, and stretch features
- `ARCHITECTURE.md` — system components, directory structure, analysis pipeline, and orchestration
- `API_CONTRACT.md` — routes, request and response shapes, status codes, and errors
- `DATABASE.md` — SQLite tables, columns, relationships, indexes, and lifecycle
- `TESTING.md` — testing strategy, tools, commands, and evaluation procedures
- `CONTRIBUTING.md` — Git workflow and contribution practices
- `AGENTS.md` — AI-agent behavior and boundaries

When a decision changes, update this file and the document that owns the affected implementation details.

---

## Web Application as the MVP

### Decision

LemonBeam’s MVP will be a web application.

The user submits a supported public GitHub repository through a React interface and receives a generated guide in the browser.

### Reasons

- A web application provides a clear end-to-end user experience.
- It avoids requiring users to install LemonBeam locally.
- It gives the team one primary delivery path to design, build, and test.
- It keeps the MVP focused within the available project timeline.

### Consequences

- The frontend and backend communicate through an HTTP API.
- Local CLI behavior is not required for the MVP.
- CLI support remains a stretch goal.

---

## CLI as a Stretch Goal

### Decision

A LemonBeam CLI is outside the MVP.

A future CLI may scan a local repository and store generated output in a local `.lemonbeam` directory.

### Reasons

- Supporting both a web application and a CLI would increase scope.
- Local repository handling introduces a separate workflow and additional design questions.
- The team should complete the web experience before adding another interface.

### Consequences

- MVP documentation and implementation should not depend on CLI commands.
- CLI-specific files and workflows should not be introduced into the MVP without a scope change.

---

## Public GitHub Repositories Only

### Decision

The MVP supports public repositories hosted on GitHub.

Private repositories, GitLab, and Bitbucket are outside the MVP.

### Reasons

- Public GitHub repositories can be validated and downloaded without building an authorization system.
- Limiting repository providers reduces integration complexity.
- It avoids handling private repository credentials during the MVP.

### Consequences

- Repository validation is GitHub-specific.
- Private repository support remains a stretch goal.
- Other repository providers require future integration work.

---

## JavaScript and TypeScript Only

### Decision

The MVP supports JavaScript and TypeScript repositories.

### Reasons

- Supporting a smaller language set keeps parsing, classification, and retrieval rules manageable.
- Tree-sitter support can be focused on JavaScript and TypeScript.
- The team can evaluate guide quality within a defined ecosystem.

### Consequences

- Repositories centered on other languages are rejected as unsupported.
- Additional language ecosystems remain stretch goals.

---

## Single-Package Repositories Only

### Decision

The MVP supports single-package repositories and does not support monorepos.

### Reasons

- Monorepos introduce multiple package boundaries, scripts, applications, and configuration contexts.
- Determining which package or application a guide statement applies to would add substantial complexity.
- Single-package repositories provide a clearer unit of analysis for the MVP.

### Consequences

- Repositories with multiple separate applications or package boundaries are rejected as unsupported.
- Monorepo support remains a stretch goal.

---

## GitHub Access Uses a Personal Access Token for Validation Calls

### Decision

The backend uses one shared GitHub personal access token (stored as `GITHUB_TOKEN` in the backend's environment, never committed) when calling GitHub's REST API to validate a repository and resolve its default branch and commit SHA.

Downloading the actual repository snapshot does not use this token, or the REST API at all — it uses the unauthenticated tarball URL `codeload.github.com/{owner}/{repo}/tar.gz/{sha}`.

### Reasons

- GitHub's REST API allows only 60 requests/hour to unauthenticated callers — shared across the whole team while testing, that's easy to hit. A token, even with zero scopes selected, raises this to 5,000 requests/hour.
- Unlike the OpenRouter key, this costs LemonBeam nothing and only ever reads public data, so one shared server-side token is appropriate — this is not a BYOK/per-user credential.
- The download step doesn't need this token at all, since the tarball URL is a plain file download, not a rate-limited API call.

### Consequences

- `GITHUB_TOKEN` is added to `backend/.env.example` as a placeholder; the real value goes only in each developer's own untracked `.env`.
- `github/validateRepository.ts` attaches this token as an `Authorization` header on its GitHub API calls.
- `github/downloadSnapshot.ts` does not use this token.
- This token must never be logged, committed, or exposed in an error response — same rule as the OpenRouter key, though this one is a shared server credential, not a per-request user-supplied one.

---

## Repository Size Limits for the MVP

### Decision

The MVP scan endpoint rejects repositories larger than approximately 25–50MB (measured after ignore rules exclude directories such as `node_modules`, `.git`, and build output) and skips individual files larger than approximately 1MB.

These numbers are a starting point for the MVP, not a permanent ceiling, and may be adjusted once the team has run real repositories through the pipeline.

### Reasons

- Every stage of the analyzer pipeline (download, discovery, classification, chunking, storage) scales roughly linearly with repository size; keeping the MVP's range small keeps these stages fast and predictable.
- `POST /api/scans` is a single synchronous request that blocks until the whole guide is returned (see "Single Scan Endpoint"). A large repository risks the request exceeding whatever timeout the hosting platform enforces, which is a harder failure mode than a slow-but-successful scan.
- Oversized individual files (bundled/minified output, generated code, large data files) are rarely useful evidence for a contributor guide, so skipping them loses little.

### Consequences

- `REPOSITORY_TOO_LARGE` (413) in `API_CONTRACT.md` now has concrete numbers behind it.
- The exact hosting platform for LemonBeam, and its request timeout, has not yet been decided; the size limits above should be revisited once that is known, since the platform's timeout is the real ceiling this range is trying to stay under.
- Supporting larger repositories later depends primarily on moving off a single blocking request (see `PROJECT_BRIEF.md` > "Asynchronous Scan Processing"), not on adopting vector-based retrieval — vector retrieval helps keep per-section evidence smaller and cheaper, but is a separate, optional improvement.

---

## Skip All Symlinks for the MVP

### Decision

`scan/discoverFiles.ts` skips every symlink it encounters while walking a downloaded repository, whether it points to a file or a directory.

### Reasons

- A symlink's target can point anywhere on disk, including outside the repository root (e.g. an absolute path or a `..`-relative path). Following it risks reading and returning content that isn't actually part of the scanned repository.
- A symlinked directory that points back at one of its own ancestors would make the discovery walk recurse forever.
- Distinguishing a "safe" symlink (one whose target stays inside the repository root) from an unsafe one requires resolving the real path and comparing it against the root, plus cycle detection for directories — real complexity for what's expected to be a rare case in most repositories.

### Consequences

- Legitimate in-repo symlinks (e.g. a shared config file symlinked across packages in a monorepo) are silently excluded from analysis for the MVP; the contributor guide may be missing evidence that lived only behind a symlink.
- If this turns out to matter in practice, a future version could resolve symlink targets and include ones that stay within the repository root, with cycle detection for directories.

---

## Default Branch and Exact Commit Identification

### Decision

LemonBeam scans the repository’s default branch and records the exact commit SHA being analyzed before downloading the source snapshot.

### Reasons

- The commit SHA identifies the precise repository version used to generate the guide.
- Citations and claims can be tied to a stable source version.
- The same repository may change after a guide is generated.

### Consequences

- Repository metadata returned with the guide includes the default branch and commit SHA.
- Regenerating a guide after repository changes may produce different evidence and output.

---

## GitHub Integration for Validation and Snapshot Access

### Decision

LemonBeam uses GitHub integration to validate repositories, retrieve repository metadata, identify the default branch and commit SHA, and access the source snapshot.

### Reasons

- GitHub metadata supports validation before downloading a repository.
- The exact repository version can be identified before analysis begins.
- It provides a cleaner web workflow than depending only on a local `git clone` process.

### Consequences

- GitHub-specific behavior belongs in the backend’s GitHub integration area.
- External GitHub failures must be handled by the backend.
- Exact implementation details belong in `ARCHITECTURE.md`.

---

## Multiple Parsing and Chunking Strategies

### Decision

LemonBeam uses different parsing and chunking strategies based on file type.

Tree-sitter is one parsing method, not the universal parser for every file.

### Reasons

- Source code, test code, Markdown, configuration files, and unknown text have different structures.
- A single strategy would not handle every file type well.
- File-appropriate strategies preserve meaning more effectively.

### Consequences

- Supported JavaScript and TypeScript source code uses Tree-sitter.
- Test files (JavaScript/TypeScript) also use Tree-sitter, with added detection of test-specific constructs (`describe`/`it`/`test`/hooks) on top of the same general chunking.
- Markdown uses heading- and section-based chunking.
- Configuration files use structured or rule-based handling.
- Unsupported readable text may use heuristic, regex, fallback chunking, or be skipped.

---

## Skipped Files Are Not Fatal, and Are Reported

### Decision

If a file fails during discovery, classification, or chunking — for example, a chunker cannot parse a malformed config file — LemonBeam skips that file and continues scanning the rest of the repository. One bad file does not abort the scan.

Skipped files are not silently dropped. `scanService.ts` records the file path and the reason it was skipped. `generateGuide.ts` includes that list in the final Uncertainties and Missing Information section, alongside the uncertainty information returned by the five section-generation tasks.

The same principle applies one level up: if a primary guide section cannot be generated (for example, a section task fails or has no usable evidence), LemonBeam still returns the guide with the remaining sections and reports the missing section as an uncertainty, rather than failing the whole guide.

### Reasons

- A single malformed or unusual file should not prevent a contributor from receiving a guide for the rest of an otherwise-analyzable repository.
- Silently dropping a file or a section without any record would contradict LemonBeam's own trust goal: users need to know when a guide is based on incomplete evidence rather than assume it is complete.
- The Uncertainties and Missing Information section already exists to hold "information LemonBeam could not confidently determine," making it the natural place to surface both kinds of gaps.

### Consequences

- `scanService.ts` (or whichever file coordinates chunking) must track skipped files and reasons during a scan, not just the chunks that were successfully produced.
- `generateGuide.ts` must merge the skipped-file list into the Uncertainties section in addition to each section task's own uncertainty results.
- A section task failing outright is treated the same way as a missing citation or unclear evidence: reported as an uncertainty, not a fatal error.
- Reliably keeping a skipped-file list across a whole scan is one more reason to weigh SQLite storage against in-memory-only chunk handling; this remains open until the team resolves that scope question separately.
- The exact data shape for a skipped-file record (path, reason, pipeline stage) is left to whoever implements `scanService.ts`.

---

## File Classification Before Chunking

### Decision

LemonBeam discovers and classifies files before choosing a parsing and chunking strategy.

### Reasons

- The file purpose helps determine which chunker should process the file.
- Source, tests, documentation, configuration, scripts, types, and unknown files need different handling.
- Classification makes later retrieval more predictable.

### Consequences

The analysis order is:

```text
Discover
-> classify
-> choose parser and chunker
-> parse
-> chunk
-> store
```

Files with insufficient evidence remain uncategorized rather than being forced into an incorrect category.

---

## Path-Based Classification for the MVP, Content-Pattern Signals as a Stretch Goal

### Decision

For the MVP, `classifyFile.ts` classifies a file using only signals derived from its path. `scanService.ts` can also pass pre-gathered repository context for future signals (currently unused by the classifier):

- the file's own relative path (directory segments, filename, extension)
- the parsed `package.json` (`scripts`, `dependencies`, `devDependencies`) — intended to be read/parsed once by `scanService.ts`, then passed into every `classifyFile` call
- the full list of discovered file paths from `discoverFiles.ts` — intended for relationship checks like "is there a sibling `Foo.test.ts` next to `Foo.ts`"

`classifyFile.ts` does not read or inspect the content of the file it is classifying. `ARCHITECTURE.md` and `PROJECT_BRIEF.md` previously listed "limited content patterns" as one of the classification signals; this decision formally narrows that for the MVP and defers it below.

### Reasons

- Path, filename, and extension signals alone correctly classify the large majority of real-world repositories, because most projects already follow naming conventions (`*.test.ts`, `docs/`, `tsconfig.json`, a `types/` directory, and so on).
- Content-based signals require every file's content to be available at classify time, not just at chunk time. Today's planned order in `scanService.ts` only reads a file's content once, right before chunking (see `types/chunk.ts`'s `ChunkInput` comment); adding content-based classification would move that read earlier and needs deliberate sequencing, not just new rule code.
- Content-based rules carry real false-positive risk and a bigger test surface than naming rules — for example, a "type-only file" check must not trip on a file that has one `interface` and one helper function, so every content rule needs both a true-positive and a near-miss fixture, not just one fixture per naming convention.
- Keeping `classifyFile.ts` a pure function of `(filePath, allFilePaths, packageJson)` keeps it easy to unit test with plain string/object fixtures, matching `TESTING.md`'s framing of classification as testing "deterministic signals."

### Consequences

- `classifyFile.ts`'s signature is `classifyFile(filePath: string, allFilePaths: string[], packageJson: Record<string, unknown> | null): { filePurpose: FilePurpose; language: Language }` — no file-content parameter.
- A file whose purpose can only be determined by reading its own content (for example, a `.ts` file containing only `interface`/`type` declarations, not named `*.types.ts` and not sitting in a `types/` directory) will fall back to `unknown` for the MVP rather than being correctly classified as `types`. This is an accepted MVP gap, not a bug.
- `ARCHITECTURE.md` and `PROJECT_BRIEF.md`'s classification signal lists are updated to match (content patterns removed, cross-referenced here).
- `isScriptsFile` in `classifyFile.ts` only checks whether the file lives in a `scripts/` directory. It no longer also checks whether `package.json`'s `scripts` section has a command string that references the file's path (e.g. `"build": "node build.js"` matching a root-level `build.js`). That second check existed briefly during implementation and was removed as unnecessary complexity for the MVP — see "Post-MVP: Restore package.json Script-Command Matching" below.

### Post-MVP: Restore package.json Script-Command Matching

`isScriptsFile` originally also matched a file against `package.json`'s `scripts` section by checking if any script command string contained the file's path — catching files like a root-level `build.js` referenced by `"build": "node build.js"` that aren't inside a `scripts/` directory. This was removed for the MVP: the directory check alone covers the common case (most repositories put build/utility scripts under `scripts/` by convention), and the `package.json`-matching logic added real complexity (optional chaining, a runtime type guard, `Object.values` iteration, substring matching) for a narrow edge case.

If real-world testing post-MVP shows misclassified root-level script files are common enough to matter, this check can be reintroduced. `packageJson` is already threaded through `classifyFile`'s signature for this and other potential signals, so restoring it would only mean adding the check back into `isScriptsFile`, not changing the function signature.

### Stretch Goal: Adding Content-Pattern Signals Later

Building this out later requires more than adding a new rule function. In order:

1. **Make content available at classify time.** `scanService.ts` would need to read each file's content before calling `classifyFile`, not only before calling the chunker. The same content can still be reused for chunking afterward — this doesn't necessarily mean reading a file twice — but the *ordering guarantee* changes, and anything currently assuming classification only needs a path would need to be revisited.
2. **Define the specific "limited" content rules precisely**, for example:
   - Type-only detection: the file contains one or more top-level `interface`/`type` declarations and zero runtime constructs (no `function` declarations, no `class`, no top-level executable statements).
   - Shebang detection: a `#!...` first line, flagging a script even without a `.sh` extension or `scripts/` directory.
   - Test-framework import detection: an `import`/`require` of `vitest`/`jest`/etc., catching a test file that doesn't follow `*.test.*`/`*.spec.*` naming.
3. **Decide signal precedence.** When a content signal and a path signal disagree, does content override, only apply when path is inconclusive, or just nudge a confidence score? This needs an explicit rule, not implicit code ordering.
4. **Build real confidence scoring.** `DATABASE.md` already reserves an optional `classification_score REAL` column (0–1) for this, but nothing currently computes it. Combining multiple signals into an actual score (rather than a path-only decision tree) is what would make that column meaningful instead of permanently empty.
5. **Expand test fixtures.** `tests/unit/scan-and-classification/classifyFile.test.ts` would need true-positive and near-miss fixtures for each new content rule, per "Reasons" above.
6. **Restore the signal in the docs.** Once built, `classifyFile.ts`'s signature, `ARCHITECTURE.md`, and `PROJECT_BRIEF.md` all get updated again to include content patterns as a live MVP signal rather than a deferred one.

---

## Rule-Based Retrieval Instead of Vector Search

### Decision

The MVP retrieves repository evidence using deterministic rules over SQLite metadata rather than vector similarity.

### Reasons

- Rule-based retrieval is explicit and inspectable.
- The team can explain why a chunk was selected for a guide section.
- The same rules applied to the same repository version should select the same evidence.
- It reduces the number of new systems required for the MVP.

### Consequences

- Each guide section requires carefully designed retrieval rules.
- Missing a relevant signal may leave a gap in a section.
- Vector-based retrieval remains a stretch goal for later comparison.

---

## Raw SQL for Retrieval

### Decision

Section-specific retrieval uses raw SQL rather than an ORM or query builder.

### Reasons

- Retrieval is primarily filtering, joining, and ranking structured evidence rather than standard CRUD.
- Raw SQL keeps retrieval logic explicit and reviewable.
- Queries can be inspected and optimized directly.
- It avoids adding an abstraction layer that the MVP does not require.

### Consequences

- Queries should use parameters or prepared statements.
- SQL should remain readable and testable.
- An ORM or query builder should not be added without revisiting this decision.

---

## Isolated Temporary SQLite Database per Scan

### Decision

Each repository scan uses its own isolated temporary SQLite database.

The database and other temporary scan files are deleted after the scan lifecycle is complete.

### Reasons

- Scan data belongs to one repository version and one generation request.
- Isolation prevents evidence from different scans from mixing.
- LemonBeam does not need permanent user history for the MVP.
- SQLite provides structured filtering without requiring a hosted database.

### Consequences

- The application does not use one shared `lemonbeam.sqlite` file for all users.
- Each scan requires a unique workspace and database path.
- Cleanup must remove the repository snapshot, SQLite database, and intermediate files.
- Persistent scan history and caching are outside the MVP.

---

## In-Memory Chunk Storage for the MVP, SQLite as a Stretch Goal

### Decision

For the MVP, `scanService.ts` returns chunks and the skipped-files list as plain in-memory data — passed directly from `pipelineManager.ts` to `orchestration/generateGuide.ts` within the same request. Nothing is written to SQLite. `db/database.ts`, `db/chunkStore.ts`, and `db/schema.sql` are not implemented for the MVP.

Persisting chunks to each scan's SQLite database, as designed in `DATABASE.md`, becomes a stretch goal (see `PROJECT_BRIEF.md` > "SQLite-Backed Evidence Storage"), built alongside "Five Separate Section-Generation Tasks" and/or "Asynchronous Scan Processing".

### Reasons

- SQLite's main value is filtered retrieval — querying "just the config chunks" or "just the test chunks" for one section. The MVP's single combined generation call doesn't filter by section; it wants all the evidence at once, which a plain in-memory list already provides.
- The MVP is one synchronous request, start to finish (see "Single Scan Endpoint"). If the process crashes mid-request, the request fails regardless of whether chunk data was in memory or in SQLite — durability only starts to matter once a scan can outlive a single request, which requires the "Asynchronous Scan Processing" stretch goal.
- A whole repository's chunks, even at the MVP's ~25-50MB size limit, comfortably fit in memory — well under the RAM available on any reasonable dev machine or hosting plan. This is not a capacity risk.
- Skipping SQLite for the MVP removes real build work (`db/database.ts`, `db/chunkStore.ts`, `db/schema.sql`) without losing anything the MVP actually needs, consistent with "One Combined Generation Call for the MVP, Five Tasks as a Stretch Goal."

### Consequences

- `db/database.ts`, `db/chunkStore.ts`, and `db/schema.sql` stay as placeholders for the MVP.
- `scanService.ts` returns `{ chunks, skippedFiles }` directly; `generateGuide.ts` reads from that in-memory value rather than querying a database.
- `DATABASE.md`'s schema remains the agreed design for when SQLite storage is built later — it does not need to be redesigned, only implemented.
- Multiple concurrent scans each hold their own chunk data in the same server process's memory; fine for MVP-scale testing, but a scaling concern to revisit alongside the hosting-platform choice and the async-processing stretch goal.

---

## No User Accounts or Saved Scan History

### Decision

The MVP does not include user accounts or persistent scan history.

### Reasons

- Authentication and persistent user data would expand the project scope.
- The main value of the MVP is repository analysis and guide generation.
- Temporary scan storage is sufficient for the initial workflow.

### Consequences

- Users keep only the guide files they choose to download.
- The application does not provide a dashboard of past scans.
- Account and history features require a future scope decision.

---

## One Combined Generation Call for the MVP, Five Tasks as a Stretch Goal

### Decision

The MVP generates the guide's five primary sections — Project Overview, Setup / Installation, Running Locally, Project Structure, and Testing — through **one combined generation task and one LLM call**, built from a single general prompt and evidence gathered across all five sections.

Splitting this into five independent tasks, each with its own retrieval pass, its own tuned prompt, and its own LLM call, is a stretch goal (see `PROJECT_BRIEF.md` > "Five Separate Section-Generation Tasks"), not an MVP requirement.

### Reasons

- The team has a fixed ten-day window to reach a working end-to-end MVP, followed by a longer polish period. Five separately tuned prompts and five retrieval passes were judged too much to build and test reliably in that window.
- This does not change the frontend/backend API contract — `POST /api/scans` still returns one `guide.markdown` string regardless of how many LLM calls produced it internally.
- Getting one working generation path end to end first is more valuable right now than five partially-tested ones.

### Consequences

- Retrieval must still gather evidence across all five topic areas before the one call, even though it is handed to a single prompt instead of five.
- A single call bundling every section's evidence is one point of latency/cost risk rather than five smaller ones; there is no longer anything to run in parallel for the MVP call.
- If the one MVP call fails (rate limit, malformed output, OpenRouter error), the whole guide generation fails for that scan — there is no partial-success case at the section level the way five independent tasks would allow. This is returned to the frontend using the existing `LLM_SERVICE_ERROR` / `EXTERNAL_SERVICE_ERROR` codes already defined in `API_CONTRACT.md`; no new error code or retry mechanism is required for the MVP.
- Debugging or tuning the single prompt is expected to be harder than tuning five narrow ones, since a change intended to fix one section's output can affect how the others read. This tradeoff was made knowingly to fit the MVP timeline.
- When the five-task stretch goal is built, each task should run **in parallel** (e.g. via `Promise.allSettled`, not `Promise.all`) rather than sequentially, so one failed section does not cancel the other four — consistent with "Skipped Files Are Not Fatal, and Are Reported."

---

## Programmatically Assembled Uncertainty Section

### Decision

The sixth displayed section, **Uncertainties and Missing Information**, is assembled without an extra LLM call.

For the MVP (one combined generation call), it is built from the list of files skipped during discovery, classification, or chunking (see "Skipped Files Are Not Fatal, and Are Reported").

Once the five-separate-task stretch goal is built, this section will also incorporate uncertainty information returned by each of the five tasks, as originally designed.

### Reasons

- The scanning stage is already responsible for identifying evidence gaps (skipped files) regardless of how many generation calls are made.
- Aggregating that list programmatically, rather than asking the model to self-report uncertainty inside a single combined response, keeps this section reliable without adding complexity to the MVP's one prompt.
- Another LLM call would add cost without being necessary.

### Consequences

- The completed guide contains six displayed sections; for the MVP, five come from one combined LLM call and the sixth is assembled programmatically from skipped-file data.
- Uncertainty output should not be silently rewritten into unsupported conclusions.

---

## Section-Specific Prompts (Stretch Goal)

### Decision

The MVP uses one general prompt for all five primary sections. Giving each section its own tuned prompt, while keeping a shared result shape across tasks, is part of the "Five Separate Section-Generation Tasks" stretch goal rather than an MVP requirement.

### Reasons

- Each section ultimately asks a different question of the repository evidence, and a section-specific prompt should produce more precise, better-cited output than one general prompt covering all five — but writing and tuning five prompts was judged too much for the MVP's ten-day window.

### Consequences

- MVP prompt wording lives in one new file in `prompts/`, not five.
- When the stretch goal is built, prompt wording will differ by section, and the orchestration flow will process each section's result through a shared shape, as originally designed.
- The exact prompt text belongs in the prompt source files, not in project documentation, for both the MVP and the stretch-goal versions.

---

## Source-Backed Claims and Citation Validation

### Decision

Generated guide claims must be supported by repository evidence and include citations.

When evidence is missing or unclear, LemonBeam reports uncertainty rather than guessing.

### Reasons

- Users need to verify important setup, running, structure, and testing claims.
- Source-backed output is more trustworthy than unsupported AI explanation.
- Citations make retrieval and generation quality easier to evaluate.

### Consequences

- The LLM receives source evidence selected for its section.
- Returned citations must correspond to repository evidence.
- Unsupported repository facts should not appear as confident claims.

---

## Guide Citation Format: Inline Bracketed File:Line References

### Decision

Guide citations use one fixed inline format: `[filePath:startLine-endLine]`, placed directly after the claim it supports — e.g. "Install dependencies with `npm install` [package.json:6-10]." A claim backed by more than one chunk chains multiple brackets: `[package.json:5-8][vite.config.ts:1-12]`.

For chunks without a line range (some chunkers — e.g. fallback text-block or whole-file config chunks — may not produce one; see `types/chunk.ts`), the citation drops the range and uses the file path alone: `[filePath]`.

### Reasons

- Self-contained per citation, with no cross-referencing or running state (unlike footnote-style formats). This matters once "Five Separate Section-Generation Tasks" (see `PROJECT_BRIEF.md`) splits generation into five independent LLM calls merged afterward — footnote numbering would collide across independently generated sections; this format doesn't.
- Simple for the LLM to produce consistently (one fixed token pattern shown by example in the prompt) and simple for `generateGuideSection.ts` to parse and validate with a single regex, instead of relying on unreliable natural-language citation phrasing.
- Uses `filePath` + line range — properties of the source code itself — rather than a database-generated chunk ID, so it doesn't depend on chunk storage (see "In-Memory Chunk Storage for the MVP, SQLite as a Stretch Goal"). It keeps working unchanged once SQLite chunk IDs exist in the post-MVP sprint; the citation format doesn't need to change when the storage layer does.

### Consequences

- `prompts/mvpGuidePrompt.ts`'s prompt must instruct the model to produce this exact format, with examples.
- `orchestration/generateGuideSection.ts` parses citations out of the returned markdown using this format and validates each one against the chunks it supplied — a citation whose `filePath`/line range doesn't match a real chunk indicates an invented claim (see "Source-Backed Claims and Citation Validation").
- The final `guide.markdown` users see displays these bracketed tokens as-is; the format is intentionally terse and mechanical for reliable parsing, not a polished prose citation style.

---

## User-Supplied OpenRouter API Key (BYOK)

### Decision

LemonBeam requires the user to supply their own OpenRouter API key with each scan request rather than using a shared server-side key or requiring a direct OpenAI key.

The backend uses the supplied key only in memory for that single request. It is never stored, logged, or returned in a response.

For the MVP, the backend routes every request through OpenRouter to a single fixed OpenAI model — there is no user-facing model choice yet. Letting the user pick from a small set of LLM options through OpenRouter is a stretch goal (see `PROJECT_BRIEF.md` > "Multiple LLM Provider Options").

### Reasons

- LemonBeam does not want to bear inference cost for public, unauthenticated usage.
- A shared server-side key has no natural per-user limit and could be exhausted or abused by anonymous traffic.
- Avoiding key storage keeps the MVP free of the encryption-at-rest, rotation, and account-security work a stored-credential model would require.
- Passing the key through per request keeps the existing "No User Accounts or Saved Scan History" decision intact — no key-management UI or database is needed.
- Routing through OpenRouter instead of calling OpenAI directly means the post-MVP model-choice dropdown only needs one BYOK credential and one provider integration, rather than a separate key and integration per LLM provider.

### Alternatives Considered

- **Storing an encrypted key per user account** — rejected. It reintroduces the account and persistence scope explicitly excluded by "No User Accounts or Saved Scan History."
- **Calling OpenAI directly from the frontend** — rejected. It contradicts the "frontend does not call GitHub or the LLM directly" architectural boundary and would remove server-side prompt construction and citation validation.
- **Requiring a direct OpenAI API key instead of an OpenRouter key** — rejected. It would work for the MVP's single fixed model, but would require asking users for a different key (and adding a separate provider integration) once the "Multiple LLM Provider Options" stretch goal adds other models.

### Consequences

- The scan request body includes `openRouterApiKey`. Exact request and error shapes belong in `API_CONTRACT.md`.
- The frontend collects the key through a masked input and must not persist it beyond the active session.
- The backend must never write the key to logs, SQLite, temporary files, or error responses.
- A missing, malformed, or OpenRouter-rejected key returns a specific error so the frontend can prompt the user to fix it, rather than a generic external-service failure.
- A server-side `OPENROUTER_API_KEY` environment variable may remain as a local-development fallback but must not be relied on for hosted/production usage.

---

## Chat Completions API, Not the Responses API

### Decision

`orchestration/generateGuideSection.ts` calls OpenRouter using the Chat Completions API (`client.chat.completions.create({ model, messages })`), not the newer Responses API. `prompts/mvpGuidePrompt.ts` returns a `ChatCompletionMessageParam[]` — a `system` message carrying the fixed instructions (section order, evidence-only rule, citation format, low-confidence marking) and a `user` message carrying the retrieved evidence — rather than a Responses-style `{ instructions, input }` pair.

### Reasons

- Chat Completions is confirmed and extensively documented as OpenRouter's cross-provider gateway — every model across every provider (`anthropic/...`, `google/...`, `openai/...`, etc.) is reachable through it via the `model` field.
- OpenRouter's Responses endpoint (`/api/v1/responses`) could not be confirmed to support non-OpenAI models. Its own documentation ties it specifically to OpenAI compatibility, its one worked example uses an OpenAI model, and it's far less prominently documented than Chat Completions across independent sources.
- The MVP's single fixed model (see "User-Supplied OpenRouter API Key (BYOK)") makes this low-stakes today, but "Multiple LLM Provider Options" (see `PROJECT_BRIEF.md`) — the post-MVP stretch goal that lets users pick between models — most likely means different underlying providers, not three OpenAI models. Choosing Chat Completions now avoids a forced rework of `mvpGuidePrompt.ts`'s return shape if the Responses API turns out not to support non-OpenAI models when that stretch goal is built.
- The Responses API's actual differentiator — server-side conversation state via `previous_response_id` — isn't usable through OpenRouter anyway (its Responses endpoint is stateless-only), and isn't needed here regardless: every guide-generation call is a single one-shot request, not a multi-turn conversation.

### Alternatives Considered

- **Responses API (`instructions` / `input`)** — rejected for the MVP, despite matching the pattern used in the team's prior projects, specifically because of the unconfirmed non-OpenAI model support described above. If OpenRouter's Responses endpoint is later confirmed to fully support the `model` field the same way Chat Completions does, this could be revisited.

### Consequences

- `prompts/mvpGuidePrompt.ts` exports a function returning `ChatCompletionMessageParam[]` (from the `openai` package), not a plain string or an `{ instructions, input }` pair.
- `orchestration/generateGuideSection.ts` passes that array directly to `client.chat.completions.create({ model: MVP_MODEL, messages })` and reads the result from `response.choices[0].message.content`, not `response.output_text`.
- If the stretch-goal model dropdown is ever built against a provider whose OpenRouter support differs meaningfully between the two endpoints, revisit this decision.

---

## Markdown-Only Guide Output for the MVP

### Decision

The MVP returns and supports a Markdown guide.

HTML guide export is a stretch feature.

### Reasons

- Markdown is simple to generate, display, copy, store, and download.
- Supporting multiple output formats adds rendering and consistency work.
- One output format keeps the MVP focused.

### Consequences

- The API returns `guide.markdown`.
- The frontend supports reading, copying, and downloading `guide.md`.
- HTML output is not part of the MVP API contract.

---

## Single Scan Endpoint

### Decision

The MVP uses:

```text
POST /api/scans
```

to submit a repository URL and receive the completed guide.

### Reasons

- The MVP has one primary user action.
- A single route keeps frontend and backend integration straightforward.
- The current workflow does not require a larger public API.

### Consequences

- Exact request, response, status, and error formats belong in `API_CONTRACT.md`.
- Additional endpoints should be added only when a new product requirement requires them.

---

## Thin Routes; `pipelineManager.ts` Sequences the Scan

### Decision

`routes/scans.ts` stays thin: it validates the incoming request and calls one function, in `backend/src/pipelineManager.ts`, then turns that function's result (or error) into the HTTP response defined in `API_CONTRACT.md`.

`pipelineManager.ts` is the file responsible for sequencing an entire scan: GitHub validation, snapshot download, repository analysis (`scanService.ts`), guide generation, and cleanup, in that order. It wraps this sequence in a try/finally so cleanup always runs, whether the scan succeeds or fails at any step.

`pipelineManager.ts` lives at `backend/src/`, alongside `app.ts` and `server.ts`, rather than inside `routes/`, `scan/`, `github/`, or `orchestration/`, because its job is to call across all of them rather than belong to any one.

### Reasons

- `CONTRIBUTING.md` and `ARCHITECTURE.md` already say routes receive and return HTTP data and do not analyze repositories; putting the full sequencing logic inside `routes/scans.ts` would violate that.
- Putting it inside `scanService.ts` instead would blur that file's already-documented scope (discover, classify, chunk) with unrelated concerns (GitHub access, guide generation, cleanup).
- A single, clearly-named coordinating file makes it obvious where "the whole scan, start to finish" is defined, rather than leaving that sequencing implicit or scattered across routes and services.

### Consequences

- `routes/scans.ts` contains no GitHub, analysis, or generation logic — only request validation and response formatting.
- Cleanup is guaranteed by `pipelineManager.ts`'s try/finally, not by any individual step remembering to clean up after itself.
- The `backend/` directory structure in `ARCHITECTURE.md` includes `pipelineManager.ts` as a new top-level file.

---

## Strict Request Validation

### Decision

The scan endpoint rejects request fields that are not defined in the API contract.

### Reasons

- The request body is intentionally small.
- Strict validation catches misspelled fields and unexpected input.
- The frontend and backend are both maintained by the LemonBeam team.
- It keeps the API behavior precise.

### Consequences

- Unexpected fields return `400 Bad Request`.
- The backend uses the `INVALID_REQUEST_BODY` error code for unsupported request fields.
- Validation behavior must match `API_CONTRACT.md`.

---

## Documentation Ownership

### Decision

Each project concept has one owning document.

Other documents should reference that source of truth rather than repeat the same details.

### Reasons

- Repeated information can become inconsistent.
- Changes should be made in one place.
- Clear ownership makes documentation easier to maintain.

### Consequences

- `PROJECT_BRIEF.md` owns product scope and guide format.
- `ARCHITECTURE.md` owns system structure and component responsibilities.
- `API_CONTRACT.md` owns frontend/backend communication.
- `DATABASE.md` owns the SQLite design.
- `TESTING.md` owns testing and evaluation procedures.
- `CONTRIBUTING.md` owns contribution practices.
- `AGENTS.md` owns AI-agent behavior.
- This file owns the reasons behind major decisions.

---

## Vitest as the Test Runner; Root-Level Test Directory

### Decision

Vitest is the test runner for the whole repository, covering both `backend` and `frontend`. It's installed as a single root-level dependency and configured via a root `vitest.config.ts`, rather than as separate per-package test setups.

Tests live in one root-level `tests/` directory, organized by test level (`unit/`, `integration/`, `api-and-frontend/`, `guide-evaluation/`) rather than split into top-level `backend/`/`frontend/` folders, matching the categories already described in `TESTING.md` > "Test Organization." Subfolders and test files are added as the code they cover is implemented, not scaffolded in advance for unbuilt features.

### Reasons

- The frontend already runs on Vite; Vitest reuses its config and transform pipeline natively, avoiding a separate TypeScript/JSX test setup.
- Both `backend/package.json` and `frontend/package.json` are pure ESM (`"type": "module"`). Vitest is ESM-native; Jest's ESM support requires extra configuration that adds friction for this stack.
- One tool serves TypeScript unit tests, mocking, Express route/API tests, React component tests (via Vitest's `jsdom`/`happy-dom` environment with React Testing Library), and coverage reporting, reducing what the team has to maintain and learn.
- `TESTING.md`'s own "Test Organization" section already groups tests by responsibility/level rather than by package — e.g. "API and Frontend Tests" is one combined category — so a single shared root directory matches the structure that was already documented, rather than introducing a new one.
- Creating empty placeholder folders for untested, unimplemented code (e.g. `classifyFile.ts`, orchestration, SQLite storage) would be misleading and wouldn't persist in git anyway, since git doesn't track empty directories.

### Consequences

- `package.json` (root) gains `vitest` as a devDependency and `test` / `test:watch` scripts; root `package.json` also now declares `"type": "module"`.
- `TESTING.md`'s "Testing Tools," "Test Organization," and "Open Testing Decisions" sections are updated to reflect this decision.
- Remaining open testing decisions (browser/e2e tooling, coverage-in-CI, guide-evaluation scoring) are unaffected and still need the team's input.

---

## Human-Led Implementation

### Decision

Human contributors are the primary implementors and decision-makers.

AI agents assist by explaining, teaching, reviewing, debugging, and suggesting solutions unless a maintainer explicitly asks for direct edits.

### Reasons

- The team should understand and own the code it produces.
- Agent assistance should improve learning and decision quality.
- Silent implementation can hide complexity and weaken shared understanding.

### Consequences

- Agent behavior is defined in `AGENTS.md`.
- Agents should not invent unapproved architecture or scope.
- Humans approve implementation and project changes.

---

## Stretch Features Follow the MVP

### Decision

Stretch features should be considered after the MVP works end to end.

Current stretch features include:

- CLI
- MCP integration
- vector-based retrieval
- monorepo support
- additional programming languages
- private repository support
- guide regeneration
- HTML guide export

### Reasons

- The team has a limited development timeline.
- Completing one coherent workflow is more valuable than partially building many features.
- Stretch work should not destabilize core scanning and guide generation.

### Consequences

- Stretch features should not appear as MVP requirements.
- Moving a stretch feature into the MVP requires an explicit scope decision and documentation update.