# How to Run a Direct-to-GPT-5 Comparison Test

## What we're doing

For each repo we've already scanned through lemonbeam (see the main
[`test-runs/README.md`](../README.md) for the repo list), we're also running
the *same repo* through a bare one-line prompt to the *same model*
(`openai/gpt-5`), with no scanning, no chunking, no evidence selection, and
no citation rules — just the model on its own.

The point is to isolate one variable: does lemonbeam's pipeline (junk
filtering, chunking, token-budgeted evidence selection, forced citations)
actually produce a better/more-grounded guide than just asking the same
model directly? If we don't all run this the same way, we can't tell the
difference between "the pipeline helped" and "we asked GPT-5 differently."

## Where to run it

Use **OpenRouter's chat interface**, not OpenAI's own ChatGPT/Playground.

**Why not OpenAI's Playground:** `gpt-5` was retired from OpenAI's own
consumer surfaces this year, superseded by the GPT-5.6 family. Their
Playground's model picker won't offer it and won't accept it typed in
manually either.

**Why OpenRouter specifically:** it's the same routing layer lemonbeam's own
backend calls (see [`backend/src/utils/openaiClient.ts`](../../backend/src/utils/openaiClient.ts):
`MVP_MODEL = "openai/gpt-5"`). Using it here keeps the model *and* the
provider path identical to what lemonbeam itself uses — the only thing that
changes is whether our pipeline sits in front of it.

Go to `https://openrouter.ai/chat` — type the full URL and hit enter without
letting your browser autocomplete it to somewhere else (this tripped someone
up already; it landed on `platform.openai.com` instead).

## Step-by-step

1. Click **Add Model** (`⌘J`) and search for `gpt-5`. Select the plain
   **`openai/gpt-5`** entry specifically — not `gpt-5.6-luna`, `gpt-5.6-sol`,
   or any other flagship variant. If you pick a different model, the
   comparison is no longer isolating lemonbeam's pipeline — it's also
   comparing model generations, which isn't what this test is for.
2. Paste your assigned repo's GitHub URL into the chat, along with this
   exact one-line prompt (use it word-for-word so every tester's run is
   comparable):

   > Here's a GitHub repo: `<paste the repo URL here>` — write me an
   > onboarding guide covering project overview, setup, running it locally,
   > project structure, and testing.

3. Send it and wait for the full response.

## Capturing the metrics

**Wall-clock time:**
1. Open DevTools (`Cmd+Option+I`) → **Network** tab → filter to **Fetch/XHR**.
2. Clear the log (🚫 icon) *before* you send the message, so the request you
   want is easy to spot.
3. Look for the request named **`responses`** — it'll stand out as by far
   the largest payload and longest-running request; everything else
   (`tokens?...`, `touch?...`, analytics/auth calls) finishes in well under
   a couple seconds.
4. Click it → **Timing** tab → the bold total is your wall-clock time.
   Convert to seconds for `wallClockSeconds`.

**Cost, tokens, and speed:**
1. Go to `openrouter.ai/activity` (or your profile menu → Activity).
2. Find the row matching this request (model `openai/gpt-5`, matching
   timestamp).
3. Record `Input` and `Output` token counts, `Cost`, `Speed`, `Routing
   Overhead`, and `Time to First Token`. **Speed and Routing Overhead may
   show as `-`** — that's expected here (see caveats below), not a mistake.

**The request payload (important — don't skip this):**
1. Still in DevTools, click the `responses` request → find the **Payload**
   or **Request** tab.
2. Expand it and check the `tools` array. In testing so far, OpenRouter's
   chat UI gives the model `web_search`, `web_fetch`, `image_generation`,
   `fusion`, and `shell` tools, plus its own injected system prompt — this
   is *not* a bare model completion, and that matters for how you read the
   result (see below). Copy this section into your file's `requestPayload`
   field.

## Reading the citations carefully

The model may return citations — but check what they actually are before
assuming they're equivalent to lemonbeam's:

- Lemonbeam's format is `[filePath:startLine-endLine]` — a specific,
  checkable line range. If what you get back is a whole-file or whole-page
  link with no line numbers, it's not the same kind of evidence, even if it
  looks similar.
- Watch for **duplicate citations rendered differently** (a markdown link,
  a raw URL, and a "source chip" all pointing to the same page) — dedupe
  before reporting a citation count.
- A URL with a tracking parameter like `?from_theconsensus=1` is a sign the
  model found it via `web_search`, not by reading the repository directly.
- If a citation resolves to a specific commit SHA, **check it against the
  commit lemonbeam's own scan recorded** for that repo (in the matching
  file under `test-runs/`) — they may not match, since the repo keeps
  changing and each system may have looked at it at a different moment.

## Why some of this won't look like a fair fight, and that's fine to report

Record it anyway, but note it plainly in your file's `note` field:

- Because the model has tool access, it may reconstruct file/folder details
  from **training-data memory** of a well-known package rather than from
  actually reading this repo's current state — especially for popular repos.
  If the guide describes specific files with confidence but the citations
  don't actually point at line-level evidence for those claims, that's
  worth flagging, not smoothing over.
- Wall-clock time and cost here include however many `web_search`/
  `web_fetch` round-trips happened in the background — they are not directly
  comparable to lemonbeam's numbers, which reflect one plain completion call
  with no tool use.

## File format

Save to:

```text
test-runs/direct-to-gpt-5/<repo-name>-<your initials>.json
```

Example: `test-runs/direct-to-gpt-5/ky-jd.json`

Structure (see [`express-ka.json`](express-ka.json) in this folder for a
filled-out example):

```json
{
  "tester": "jd",
  "model": "openai/gpt-5",
  "provider": "OpenAI",
  "costUsd": 0.0,
  "usage": { "promptTokens": 0, "completionTokens": 0 },
  "wallClockSeconds": 0,
  "timeToFirstTokenSeconds": 0,
  "repoSize": "0 KB",
  "note": "Anything notable about tool use, citation quality, commit mismatches, or missing metrics.",
  "response": {
    "repository": {
      "owner": "",
      "name": "",
      "url": ""
    },
    "guide": {
      "markdown": "The full response text, pasted exactly as returned.",
      "citations": [
        { "text": "link text as shown", "url": "the actual url" }
      ]
    }
  },
  "requestPayload": {
    "model": "openai/gpt-5",
    "tools": []
  }
}
```

Notes on fields that differ from the main `test-runs/README.md` format:

- There is no `scanId`, `defaultBranch`, or `commitSha` in `repository` —
  this run isn't pinned to one commit the way a real lemonbeam scan is,
  so don't invent one.
- `repoSize` should match the same value used in the main README's repo
  table, for consistency.
- `citations` is a structured array (`text` + `url`), not a flat string,
  since duplicate renderings of the same citation are common and worth
  being able to count accurately.
