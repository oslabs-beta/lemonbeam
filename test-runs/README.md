# How to Run an E2E Test Scan

## What we're doing

Each of us submits our assigned GitHub repos through the LemonBeam website, then saves the exact response the server gives back into a shared file. This lets us compare results across repos and across each other's runs.

## Repo assignments

**3 shared repos — everyone runs all three** (each person makes their own file — this is intentional, so we can compare independent generations of the same repo for consistency):

| Repo | URL | Language | Size |
|---|---|---|---|
| ky | https://github.com/sindresorhus/ky | TypeScript | 1,444 KB |
| express | https://github.com/expressjs/express | JavaScript | 9,843 KB |
| got | https://github.com/sindresorhus/got | TypeScript | 3,773 KB |

**6 unique repos — 2 per person, no overlap:**

| Person | Repo | URL | Language | Size |
|---|---|---|---|---|
| jd | moment | https://github.com/moment/moment | JavaScript | 22,822 KB |
| jd | ow | https://github.com/sindresorhus/ow | TypeScript | 1,491 KB |
| ttj | commander.js | https://github.com/tj/commander.js | JavaScript | 3,951 KB |
| ttj | class-validator | https://github.com/typestack/class-validator | TypeScript | 5,002 KB |
| ka | dayjs | https://github.com/iamkun/dayjs | JavaScript | 6,160 KB |
| ka | yup | https://github.com/jquense/yup | TypeScript | 4,341 KB |

All 9 repos above were verified (via the GitHub API, not guessed) to be single-package — no nested `package.json` anywhere in the tree outside `node_modules`/`.git`/`dist`/`build`/`.next`/`coverage` — and under the 50MB/51,200KB size limit, so none of them should trip `UNSUPPORTED_MONOREPO` or `REPOSITORY_TOO_LARGE`.

## Known issue: false monorepo rejections extend beyond pino/yargs

The original plan flagged `pino`/`yargs` as likely false-positive `UNSUPPORTED_MONOREPO` rejections, because `validateRepository.ts`'s `SKIPPED_DIRECTORY_NAMES` set (`node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`) doesn't include `test`/`fixtures`, so a stray `package.json` in a test-fixture folder trips the monorepo check even though the repo isn't a real monorepo.

A recursive tree scan found this bug affects more repos than just those two — all of these are genuinely single-package but have a `package.json` tucked into an example/test/docs/benchmark subfolder that isn't skipped:

| Repo | Where the stray `package.json` lives |
|---|---|
| `fastify/fastify` | `test/bundler/esbuild/`, `test/bundler/webpack/` |
| `axios/axios` | `docs/`, `tests/module/*`, `tests/smoke/*` |
| `ajv-validator/ajv` | `benchmark/` |
| `pmndrs/zustand` | `examples/demo/`, `examples/starter/` |
| `immerjs/immer` | `perf-testing/`, `website/` |
| `reduxjs/reselect` | `website/` |

These were deliberately excluded from the repo assignments above so today's "should be supported" test runs aren't accidentally tripped by this bug. Worth raising with whoever owns `validateRepository.ts` as a larger fix scope than originally thought — see `SKIPPED_DIRECTORY_NAMES` at `backend/src/github/validateRepository.ts:26`.

## What is "wall-clock time"?

It just means: **how many milliseconds actually passed, in the real world, between sending the request and getting the response back** — like timing something with a stopwatch. (As opposed to something like "CPU time," which measures processing effort, not real elapsed time — we don't care about that here, just the real-world wait.) We're recording it because slow scans might point to a performance problem worth flagging.

## Before you start

1. Pull the latest `main` and make sure your teammate's PR is merged
2. Run `npm run dev` from the repo root — this starts both the website (frontend) and the server (backend)
3. Have your OpenRouter API key ready (starts with `sk-or-v1-...`)
4. Create your branch: `git switch -c chore/e2e-test-<your initials>`

## Step-by-step: running one scan

1. Open the website in your browser
2. Open DevTools: press `Cmd+Option+I` (Mac) — a panel opens
3. Click the **Network** tab along the top of that panel
4. Click the 🚫 icon to clear old entries (so it's easy to spot your new request)
5. On the website, paste in the repo URL you're testing and your OpenRouter key, then submit
6. Wait for the guide to finish generating (this can take a while — it's doing real work: downloading the repo, reading files, calling the AI)
7. **Look at the rendered guide on the page** — does it look right? Does it match what we've been planning/designing? Note anything that looks broken or off.
8. Back in DevTools, find the row named `scans` in the Network list — click it
9. Click the **Timing** tab. Near the bottom, find the **bold total number** (e.g. `13.96 ms`) — that's your wall-clock time. Write it down.
10. Click the **Response** tab (not "Preview" — that one can reformat things and trip you up). Click inside it, press `Cmd+A` then `Cmd+C` to copy everything.
11. Save it into the file described below.

## The file format — this is the part we all need to match exactly

Create a file at:

```text
test-runs/<repo-name>-<your initials>.json
```

Example: `test-runs/ky-jd.json`

Inside that file, structure it like this — **metadata on top, the raw copied response nested underneath, untouched:**

```json
{
  "tester": "jd",
  "wallClockMs": 13960,
  "response": {
    "scanId": "scan_12345",
    "repository": {
      "name": "ky",
      "owner": "sindresorhus",
      "url": "https://github.com/sindresorhus/ky",
      "defaultBranch": "main",
      "commitSha": "a84f32c"
    },
    "guide": {
      "markdown": "# Project Overview\n\n..."
    }
  }
}
```

**Why it's structured this way:** the `response` field is exactly, word-for-word, what you copied from DevTools — never edit or reformat it. `tester` and `wallClockMs` sit outside it as our own notes. This way the actual server response stays pure and untouched (so we can trust it's real evidence, not something we accidentally changed), while still keeping our timing note attached to the same file.

**Rules everyone should follow, no exceptions:**

- `wallClockMs` = the bold total from the Timing tab, in milliseconds, as a plain number (no `"ms"` text, no quotes)
- `tester` = your initials, matching the filename
- Never edit the contents inside `response` — paste it exactly as copied

## Checklist — check these for every repo before moving on

- [ ] `response` matches the shape above (`scanId`, `repository`, `guide.markdown`)
- [ ] Guide has all 5 sections in order: Overview, Setup, Running, Structure, Testing
- [ ] Citations look like `[filePath:startLine-endLine]` or `[filePath]` — spot check a couple against the real repo on GitHub, make sure they're not made up
- [ ] "Uncertainties and Missing Information" section is present
- [ ] Nothing in the guide is stated without a citation backing it up
- [ ] `wallClockMs` recorded
- [ ] Rendered guide on the website looked right and matched what we've been planning
