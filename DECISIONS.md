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

- Source code, Markdown, configuration files, and unknown text have different structures.
- A single strategy would not handle every file type well.
- File-appropriate strategies preserve meaning more effectively.

### Consequences

- Supported JavaScript and TypeScript code uses Tree-sitter.
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

## Five Primary Tasks and Five LLM Calls

### Decision

LemonBeam generates five primary guide sections through five independent generation tasks and five LLM calls.

The sections are:

1. Project Overview
2. Setup / Installation
3. Running Locally
4. Project Structure
5. Testing

### Reasons

- Each section needs different evidence and a different prompt focus.
- Bounded tasks are easier to test and debug than one large generation request.
- One weak retrieval result should not derail the entire guide.
- Five sections cover the core contributor-onboarding needs while controlling cost and complexity.

### Consequences

- Each task performs section-specific retrieval.
- Each task uses its matching prompt.
- Each task returns section text, citations, and uncertainty information.
- The orchestration layer combines the completed results.

---

## Programmatically Assembled Uncertainty Section

### Decision

The sixth displayed section, **Uncertainties and Missing Information**, is assembled from uncertainty information returned by the five primary section tasks.

It does not use a sixth LLM call.

### Reasons

- The primary tasks are already responsible for identifying evidence gaps.
- Aggregating their uncertainty results preserves those reports directly.
- Another LLM call would add cost without being necessary.
- Programmatic assembly makes the origin of uncertainty items clearer.

### Consequences

- The completed guide contains six displayed sections.
- Only five sections are LLM-generated.
- Uncertainty output should not be silently rewritten into unsupported conclusions.

---

## Section-Specific Prompts with a Shared Result Shape

### Decision

Each primary guide task uses a section-specific prompt, while all tasks return results in a consistent shape.

### Reasons

- Each section asks different questions of the repository evidence.
- A common result shape allows the orchestration code to handle every task consistently.
- Shared citation and uncertainty fields simplify validation and assembly.

### Consequences

- Prompt wording differs by section.
- The orchestration flow can process each section result through the same shared steps.
- The exact prompt text belongs in the prompt source files, not in project documentation.

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

## User-Supplied OpenAI API Key (BYOK)

### Decision

LemonBeam requires the user to supply their own OpenAI API key with each scan request rather than using a shared server-side key.

The backend uses the supplied key only in memory for that single request. It is never stored, logged, or returned in a response.

### Reasons

- LemonBeam does not want to bear inference cost for public, unauthenticated usage.
- A shared server-side key has no natural per-user limit and could be exhausted or abused by anonymous traffic.
- Avoiding key storage keeps the MVP free of the encryption-at-rest, rotation, and account-security work a stored-credential model would require.
- Passing the key through per request keeps the existing "No User Accounts or Saved Scan History" decision intact — no key-management UI or database is needed.

### Alternatives Considered

- **Storing an encrypted key per user account** — rejected. It reintroduces the account and persistence scope explicitly excluded by "No User Accounts or Saved Scan History."
- **Calling OpenAI directly from the frontend** — rejected. It contradicts the "frontend does not call GitHub or the LLM directly" architectural boundary and would remove server-side prompt construction and citation validation.

### Consequences

- The scan request body includes `openaiApiKey`. Exact request and error shapes belong in `API_CONTRACT.md`.
- The frontend collects the key through a masked input and must not persist it beyond the active session.
- The backend must never write the key to logs, SQLite, temporary files, or error responses.
- A missing, malformed, or OpenAI-rejected key returns a specific error so the frontend can prompt the user to fix it, rather than a generic external-service failure.
- A server-side `OPENAI_API_KEY` environment variable may remain as a local-development fallback but must not be relied on for hosted/production usage.

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