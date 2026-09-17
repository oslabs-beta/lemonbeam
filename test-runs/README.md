# Test Runs

This folder holds saved outputs from manual test scans against real GitHub
repositories, used to compare results across repos, methods, and models.

## Folder structure

```text
test-runs/
├── full-dump-5.6-luna/      # raw-dump comparison runs, openai/gpt-5.6-luna
├── lemonbeam-5.6-luna/      # lemonbeam's own pipeline, openai/gpt-5.6-luna
└── pre-standardization/     # everything made before this structure existed
```

**`lemonbeam-5.6-luna/`** — runs through LemonBeam's actual scan pipeline
(discover → classify → chunk → score → budget → generate), against
`openai/gpt-5.6-luna`.

**`full-dump-5.6-luna/`** — comparison runs that skip LemonBeam's pipeline
entirely and paste/attach the raw repo content straight to the model, also
against `openai/gpt-5.6-luna`. Used to sanity-check what the pipeline is
actually buying us over just dumping everything into context.

**`pre-standardization/`** — every test file and folder from before the team
agreed on one JSON shape and this two-folder split. Kept for reference, not
maintained going forward. Don't add new files here.

Each folder currently holds a `PLACEHOLDER.md` — git doesn't track empty
directories, so this is what keeps the folder present in the repo before any
real test lands in it. Delete `PLACEHOLDER.md` the first time you add a real
test file to that folder.

## Prompt to use for `full-dump-5.6-luna/` runs

Use this exact wording (word-for-word, so every tester's run is comparable),
followed by the repo's full raw source content pasted directly after it:

> Here's a GitHub repo's full source, pasted below — write me an onboarding
> guide covering project overview, setup, running it locally, project
> structure, and testing. Format the output in Markdown.

The "Format the output in Markdown" instruction is a standing team decision
(not just a one-off) — it makes the response paste-ready straight into
`guide.markdown` without needing to reformat it by hand afterward.

## File naming

```text
test-runs/<full-dump-5.6-luna|lemonbeam-5.6-luna>/<repo-name>-<your initials>.json
```

Example: `test-runs/lemonbeam-5.6-luna/express-ka.json`

## JSON shape — draft, confirm with the team before treating as final

Both folders share the same top-level metadata fields (`tester`, `model`,
`costUsd`, `usage`, `wallClockSeconds`, etc.). `requestPayload` is optional
when no payload was captured; otherwise fields should be present exactly as
recorded. Only `response`, plus two extra fields in the full-dump case, differ
between the two.

**A complete `lemonbeam-5.6-luna/` file** — `response` is the literal,
unedited JSON body LemonBeam's own `/scans` endpoint returned:

```json
{
  "tester": "ka",
  "model": "openai/gpt-5.6-luna",
  "provider": "OpenAI",
  "costUsd": 0.0176,
  "usage": { "promptTokens": 58279, "completionTokens": 2531 },
  "wallClockSeconds": 27.73,
  "timeToFirstTokenSeconds": 5.29,
  "repoSize": "23,073 KB (GitHub-reported) -- add any caveats about what this figure does/doesn't include",
  "note": "free-form observations: anything that looked wrong, surprising, or worth a follow-up",
  "response": {
    "scanId": "scan_...",
    "repository": {
      "owner": "expressjs",
      "name": "express",
      "url": "https://github.com/expressjs/express",
      "defaultBranch": "master",
      "commitSha": "..."
    },
    "guide": { "markdown": "..." }
  }
}
```

**A complete `full-dump-5.6-luna/` file** — same metadata fields as above,
plus two extra fields describing how the raw content reached the model
(`attachMethod`, optional `requestPayload`); `response` drops the fields only
LemonBeam's own pipeline produces (`scanId`, `defaultBranch`, `commitSha`),
since a raw-dump run never goes through that pipeline at all:

```json
{
  "tester": "ka",
  "model": "openai/gpt-5.6-luna",
  "provider": "OpenAI",
  "costUsd": 0.044,
  "usage": { "promptTokens": 193421, "completionTokens": 4428 },
  "wallClockSeconds": 43.9,
  "timeToFirstTokenSeconds": null,
  "repoSize": "726 KB (working-tree dump, .git and binaries excluded)",
  "note": "free-form observations: anything that looked wrong, surprising, or worth a follow-up",
  "attachMethod": "pasted-raw",
  "requestPayload": { "...": "the actual request sent, tools/system prompt included" },
  "response": {
    "repository": {
      "owner": "expressjs",
      "name": "express",
      "url": "https://github.com/expressjs/express"
    },
    "guide": { "markdown": "..." }
  }
}
```

**Rules, no exceptions:**

- Never edit anything inside `response` or `requestPayload` — paste them
  exactly as copied from DevTools/the API, so they stay trustworthy evidence
  rather than something we accidentally changed.
- `tester` = your initials, matching the filename.
- `wallClockMs`/`wallClockSeconds` = the real elapsed time, as a plain
  number, no units in the string.
- Every claim in a generated guide should still carry a citation — spot
  check a couple against the real repo before calling a run "validated,"
  and say in `note` whether you did.
