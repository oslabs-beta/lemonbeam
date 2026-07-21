# Contributing to LemonBeam

Thank you for contributing to LemonBeam.

This document explains the team’s Git workflow, branch naming, commit conventions, coding expectations, and pull-request process. Contributors and AI coding assistants working in this repository should follow these conventions.

For instructions specifically intended for AI coding agents, see `AGENTS.md`.

---

## Git Workflow

LemonBeam uses a feature-branch workflow.

Contributors should not make feature changes directly on `main` or `dev`.

The normal workflow is:

```text
Create an issue or choose a task
→ create a branch from dev
→ make focused changes
→ commit the work
→ push the branch
→ open a pull request into dev
→ receive review
→ merge after approval
```

### Starting New Work

Before creating a branch, update your local `dev` branch:

```bash
git switch dev
git pull origin dev
```

Create a new branch:

```bash
git switch -c <branch-name>
```

Example:

```bash
git switch -c feat/tree-sitter-chunking
```

---

## Branch Naming

Use the following pattern:

```text
<type>/<short-description>
```

Common branch types:

- `feat/` — new feature
- `fix/` — bug fix
- `refactor/` — restructuring without changing expected behavior
- `docs/` — documentation changes
- `test/` — test additions or changes
- `chore/` — maintenance, configuration, or tooling
- `style/` — visual styling or formatting changes

Examples:

```text
feat/github-validation
feat/testing-retrieval
fix/temp-database-cleanup
refactor/chunk-normalization
docs/update-architecture
test/classification-rules
chore/configure-eslint
style/scan-progress-screen
```

Keep branch names lowercase and separate words with hyphens.

---

## Commit Messages

Follow the Conventional Commits format:

```text
<type>(<scope>): <short description>
```

Common commit types:

- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance, configuration, or tooling
- `docs` — documentation-only change
- `refactor` — code change that is not a fix or feature
- `test` — adding or updating tests
- `style` — formatting or visual styling with no logic change

Common LemonBeam scopes may include:

```text
frontend
backend
github
scanner
classifier
chunking
retrieval
orchestration
database
prompts
docs
```

Examples:

```text
feat(chunking): add Tree-sitter function extraction
feat(retrieval): add testing evidence query
fix(database): isolate SQLite files by scan ID
refactor(orchestration): simplify section task runner
docs(architecture): document parsing and chunking flow
test(classifier): add test file classification cases
chore(backend): configure Express environment variables
style(frontend): improve scan progress layout
```

### Commit Message Rules

- Keep the subject line under 72 characters.
- Use imperative mood: `add`, not `added` or `adds`.
- Use lowercase after the colon.
- Do not end the subject line with a period.
- Keep each commit focused on one logical change.
- Avoid vague messages such as `updates`, `changes`, or `fix stuff`.

---

## Coding Expectations

### Keep Changes Focused

A pull request should solve one clear problem.

Avoid combining unrelated work, such as:

```text
Tree-sitter parsing
+
frontend styling
+
database changes
```

into the same pull request unless those changes are required for one feature.

### Preserve Separation of Responsibilities

Follow the repository architecture and keep logic in the appropriate area.

Examples:

- Express route handling belongs in `routes/`.
- GitHub communication belongs in `github/`.
- Repository discovery and classification belong in `scan/`.
- Parsing and chunking belong in `chunking/`.
- SQLite access belongs in `db/`.
- Section-specific evidence retrieval belongs in `retrieval/`.
- Guide task coordination belongs in `orchestration/`.
- LLM prompt builders belong in `prompts/`.

Do not move responsibilities between layers without discussing the architectural change with the team.

### TypeScript

- Use explicit types for shared data structures.
- Avoid `any` unless there is a documented reason.
- Validate external data, including GitHub responses, API request bodies, and LLM output.
- Prefer small functions with one clear responsibility.
- Use descriptive names for functions, variables, and types.

### Error Handling

- Do not silently ignore errors.
- Return clear errors from the Express API.
- Clean up temporary repository files and SQLite databases when a scan fails.
- Avoid exposing API keys, internal file paths, or sensitive environment values in error messages.

### Temporary Scan Isolation

Every repository scan must use its own:

- scan ID,
- temporary directory,
- repository snapshot,
- SQLite database,
- and generated output files.

Code must not use a single shared database or temporary repository directory for all scans.

### Source-Backed Generation

LLM-generated guide content must be based only on retrieved repository evidence.

- Do not allow the LLM to invent file paths or line numbers.
- Citation IDs must refer to chunks supplied to that section task.
- Unsupported claims should be reported as uncertainties rather than guessed.

---

## Code Comment Guidelines

1. Comment why something is necessary, not only what the code does.
2. Use comments for non-obvious logic, assumptions, edge cases, or security-sensitive behavior.
3. Prefer short comments above a block rather than line-by-line narration.
4. Keep comments brief, specific, and direct.
5. Avoid comments that simply repeat the code.
6. Prefer clear function and variable names before adding comments.
7. Remove temporary learning notes before opening a pull request.
8. Update comments when the related code changes.
9. If a section requires extensive explanation, consider extracting a helper function.
10. Keep comment style consistent across the project.

---

## Before Opening a Pull Request

Update your branch with the latest changes from `dev`:

```bash
git switch dev
git pull origin dev
git switch <your-branch-name>
git merge dev
```

Resolve any merge conflicts before opening the pull request.

Then confirm the following:

- Dependencies are installed.
- The project starts locally.
- TypeScript checks pass.
- Linting passes.
- Relevant tests pass, when tests exist for the affected area.
- New behavior has been tested manually when automated coverage is not available.
- Temporary debugging code has been removed.
- Unnecessary `console.log` statements have been removed.
- No secrets or `.env` files are included.
- Documentation has been updated when behavior, architecture, routes, or data structures changed.
- The pull request is limited to one focused change.

Use the commands currently defined in the repository’s `package.json` files. As the project’s testing strategy is finalized, the canonical commands will also be documented in `TESTING.md`.

---

## Pull Request Process

Open pull requests against the `dev` branch unless the team has agreed otherwise.

The pull request title should follow Conventional Commits when practical.

Example:

```text
feat(chunking): add Tree-sitter TypeScript parser
```

Use the repository’s pull request template and complete every applicable section.

### Pull Request Description

```md
## Summary

Briefly describe what this PR changes.

## Changes

- List the main changes
- Keep each item short and specific
- Focus on meaningful implementation changes

## Type of Change

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Styling/UI
- [ ] Chore/setup

## How To Test

Describe how reviewers can test this change.

Include the exact commands you ran when applicable.

```bash
npm install
npm run dev
npm run lint
```
```

Do not list commands that were not actually run.

If a command does not apply, explain why.

Example:

```md
## Summary

Adds Tree-sitter parsing for TypeScript source files.

## Changes

- Adds the TypeScript Tree-sitter parser
- Extracts functions, classes, interfaces, and exports
- Converts parsed syntax nodes into normalized chunk objects
- Falls back to heuristic chunking when parsing fails

## Type of Change

- [x] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Styling/UI
- [ ] Chore/setup

## How To Test

1. Start the backend.
2. Scan a supported TypeScript repository.
3. Confirm that source files produce syntax-aware chunks.
4. Confirm that malformed files use the fallback chunker.

```bash
npm install
npm run dev
npm run lint
```
```

---

## Review Expectations

Reviewers should check:

- whether the change matches the issue or task,
- whether the implementation follows the architecture,
- whether error cases are handled,
- whether scan data remains isolated,
- whether citations remain source-backed,
- whether tests or manual verification are sufficient,
- and whether documentation needs updating.

Review comments should be clear, respectful, and focused on the code or design rather than the contributor.

---

## After a Pull Request Is Merged

After the pull request is merged:

```bash
git switch dev
git pull origin dev
git branch -d <branch-name>
```

Delete the remote branch if GitHub has not already removed it.

---

## Documentation Updates

Update the relevant documentation when your work changes:

- setup or usage instructions → `README.md`
- contribution workflow → `CONTRIBUTING.md`
- AI-agent instructions → `AGENTS.md`
- frontend/backend communication → `API_CONTRACT.md`
- system structure or responsibilities → `ARCHITECTURE.md`
- project scope or goals → `PROJECT_BRIEF.md`
- testing approach or commands → `TESTING.md`
- architectural choices and reasoning → `DECISIONS.md`
- SQLite schema or relationships → `DATABASE.md`

Documentation should describe the actual implementation and should not knowingly contradict the code.

## Source-of-Truth Rule

Each project document owns a specific concept.

Agents should reference the document that owns the information instead of copying the same details into multiple files.

Use the following documents as the source of truth:

- `README.md` — project introduction, installation, running, testing commands, and usage
- `CONTRIBUTING.md` — Git workflow, branch naming, commit messages, coding expectations, pull requests, and reviews
- `AGENTS.md` — agent behavior, boundaries, teaching style, and review expectations
- `API_CONTRACT.md` — frontend and backend routes, requests, responses, status codes, and errors
- `ARCHITECTURE.md` — system components, directory structure, parsing, chunking, orchestration, and component responsibilities
- `PROJECT_BRIEF.md` — problem, solution, MVP scope, guide structure, user flow, evaluation goals, and stretch features
- `TESTING.md` — testing strategy, tools, commands, test organization, and guide-quality evaluation
- `DECISIONS.md` — important technical decisions and their reasoning
- `DATABASE.md` — SQLite lifecycle, tables, columns, relationships, and indexes

If implementation and documentation disagree, point out the inconsistency rather than assuming which one is correct.