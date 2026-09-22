# LemonBeam Test Runs: Cross-Test Evaluation

This document synthesizes the contents of `test-runs/` as of this review.

The goal is not just to summarize individual test outputs. The goal is to learn what the whole set of experiments says about LemonBeam, vanilla ChatGPT, raw repo dumping, citation reliability, model choice, determinism, and the product story.

## Executive Summary

The strongest conclusion across the whole test suite is:

> Vanilla ChatGPT can often produce readable and factually plausible repository guides, but it does not reliably provide a verifiable evidence trail. LemonBeam's core value is not "prettier prose"; it is structured, source-backed, repeatable repository documentation.

The tests repeatedly show that "the answer is correct" and "the evidence is trustworthy" are different things.

Vanilla ChatGPT often gets many facts right. In the TypeORM guide tests, the vanilla outputs were generally plausible and aligned with real repo facts. In the lodash needle-in-the-haystack tests, ChatGPT even found deeply buried values and exact code snippets. But when asked to prove where those facts came from, it either failed to provide useful citations, gave wrong line numbers, attached true content to the wrong path, or in one false-premise case fabricated a confident answer.

LemonBeam performs better on the product requirements that matter for source-backed onboarding guides:

- fixed guide structure
- repository metadata and commit SHA
- file-and-line citations
- uncertainty and skipped/evidence-excluded reporting
- bounded prompt construction instead of raw full-repo dumping
- repeatable evidence input for the same repo

LemonBeam also has visible weaknesses:

- citation path validation is useful but not perfect
- uncertainty output is too noisy
- large excluded-chunk counts can look alarming without context
- some scan/chunk failures show up as vague `Invalid argument`
- cost logging appears inconsistent in at least one Mocha run

The best honest product claim is:

> LemonBeam generates more auditable and product-consistent repository guides than vanilla ChatGPT, while still depending on good citation validation, evidence ranking, and uncertainty presentation.

## Test Inventory

The `test-runs/` folder contains several classes of experiments:

| Area | Purpose |
|---|---|
| `lemonbeam-5.6-luna/` | Current LemonBeam pipeline runs using `openai/gpt-5.6-luna`. |
| `full-dump-5.6-luna/` | Raw full-repo dump comparison against `openai/gpt-5.6-luna`. |
| `vanillagpt/` | Vanilla ChatGPT TypeORM guide runs using raw dumped content, no citations. |
| `withCitations/` | Vanilla ChatGPT TypeORM runs where citations were requested. |
| `urlAndCitations/` | Vanilla ChatGPT TypeORM runs from repo URL/name only, with citations requested. |
| `needle-haystack-chatgpt/` | Targeted lodash URL tests probing retrieval, citation, and false-premise behavior. |
| `pre-standardization/` | Earlier E2E, model-comparison, raw-dump, direct-to-model, and ChatGPT comparison runs. |

## Major Findings

### 1. Vanilla ChatGPT Is A Strong Prose Baseline, Not A Trustworthy Evidence System

The TypeORM vanilla runs are important because they prevent us from making an exaggerated claim.

Vanilla ChatGPT did not produce garbage. It generated readable onboarding guides that often included useful workflow advice, commands, first-day guidance, and practical contributor notes.

However, the TypeORM evaluations show the weakness clearly:

- vanilla raw/content runs produced 0 file-and-line citations
- citation-requested vanilla runs produced 0 usable citation targets
- URL-only citation-requested runs produced 0 claim-level citations
- generic homepage links did not verify specific claims

This means the problem is not simply "ChatGPT is wrong." The more precise problem is:

> ChatGPT can sound useful while leaving the reader unable to verify which claims came from the repo.

That is exactly the gap LemonBeam is trying to close.

### 2. Asking Vanilla ChatGPT For Citations Was Not Enough

The `withCitations/` and `urlAndCitations/` tests both asked for inline source citations.

Result:

| Test set | Vanilla runs | Usable file/line citations |
|---|---:|---:|
| `withCitations/` | 5 | 0 |
| `urlAndCitations/` | 5 | 0 |

In the URL-only experiment, the model produced only 3 markdown links across 5 guides, and those links pointed to the TypeORM GitHub homepage rather than evidence-specific files.

This is a major product lesson:

> Citation behavior cannot be left to prompting alone. It needs to be designed into the pipeline.

LemonBeam's citation system is not perfect, but it changes the problem from "no evidence trail exists" to "validate and improve the evidence trail."

### 3. Correct Answers And Correct Citations Are Decoupled

The `needle-haystack-chatgpt/` tests are some of the most interesting evidence in the repo.

Those tests gave ChatGPT only a real GitHub URL for `lodash/lodash`, then asked about specific facts buried at different depths.

Findings:

- ChatGPT correctly answered multiple real, specific repo questions.
- It found obscure values in large or nested files.
- It quoted real code content in several cases.
- But every closely checked line-number citation was wrong.
- One answer had a correct value and correct path, but fabricated surrounding text.
- One answer had byte-perfect content but attached it to the wrong/nonexistent path.
- One false-premise probe produced a confident hallucination.
- A second false-premise probe was handled correctly.

The most telling example is `lodash-url-needle-6-ka.json`:

- expected fact: `QUnit.config.asyncRetries = 10`
- real file: `test/test.js`
- real line: 27238
- real file length: 27246 lines
- ChatGPT got the value right
- ChatGPT got the file right
- ChatGPT got the total file length exactly right
- ChatGPT still cited the target line as 25407, off by 1831 lines

That result is subtle but powerful:

> The model had enough information to answer the question, but its citation metadata was still untrustworthy.

This is one of the strongest arguments for LemonBeam's architecture. A repo guide needs more than a plausible answer. It needs a reliable chain from answer back to source.

### 4. False-Premise Behavior Is Inconsistent

The two false-premise probes in `needle-haystack-chatgpt/` are worth treating carefully.

One false premise produced a confident hallucination:

- ChatGPT invented a TODO about Firefox `bind`, constructors, and John-David Dalton.
- Repo verification found no `jdalton`, no `Dalton`, and no TODO mentioning `bind`.

The second false premise was handled correctly:

- ChatGPT rejected the nonexistent WeakMap/stack-overflow/contributor-credit premise.
- It showed the real nearby comments instead.

Conclusion:

> False-premise hallucination is not deterministic. The model may correctly refuse one false premise and confidently fabricate another.

That unpredictability matters for product positioning. The blog post should avoid "ChatGPT always hallucinates" and instead say:

> The problem is that users cannot easily tell when it is retrieving, inferring, remembering, or fabricating.

### 5. Raw Full-Repo Dumps Can Work, But Do Not Scale Reliably

The full-dump experiments create a useful contrast.

`pre-standardization/full-repo-dump/express-ka.json` shows that a raw full-repo dump can produce a strong guide when the repo fits into context:

- Express working-tree dump: 193,421 prompt tokens
- Output: long, structured, factually accurate in spot checks
- No LemonBeam pipeline needed
- But no LemonBeam-style file/line citations were produced

This matters because raw dumping is a real competitor for small repos.

However, `full-dump-5.6-luna/moment-ka.json` shows the limit:

- Moment working tree was roughly 2.5 million tokens by local tiktoken estimate.
- OpenRouter rejected the request at about 2,059,892 requested tokens.
- Reported model context limit: 1,310,720 tokens.
- The raw-dump request failed before generation.

The same Moment repo succeeded through LemonBeam's pipeline:

- LemonBeam prompt tokens: 65,026 in the current `lemonbeam-5.6-luna/moment-ka.json`
- Same repo could be processed because LemonBeam selected bounded evidence instead of dumping everything.

Conclusion:

> Full-repo dumping is a useful baseline, but it is not a scalable product strategy. LemonBeam's fixed-budget evidence selection is the architecture that lets larger repos become tractable.

### 6. Repository Size In KB Is Not The Same As Prompt Size

Several tests reinforce that GitHub-reported KB size is a rough gate, not a prompt-cost measure.

Examples:

- Moment reports around 23,073 KB, but its working-tree content was estimated around 2.5 million tokens.
- TypeORM reports 42,161 KB, but LemonBeam sent 106,656 prompt tokens after filtering and budgeting.
- Lodash reports 49,772 KB, but LemonBeam sent 63,925 prompt tokens.
- Mocha reports 32,888 KB, but LemonBeam sent 76,895 prompt tokens.

GitHub repo size includes history and does not directly map to current working-tree token burden. Conversely, a repo's current file content can be token-heavy even when the GitHub size is under the product's MB limit.

Conclusion:

> LemonBeam should keep repo-size gates, but final LLM safety depends on token-aware chunking, scoring, and budget selection.

### 7. LemonBeam's Standardized Runs Show Stable Product Structure

The current `lemonbeam-5.6-luna/` runs are the strongest evidence of the product's intended shape.

Valid runs:

| File | Repo | Prompt tokens | Completion tokens | Words | Sections | Line citations | Time |
|---|---|---:|---:|---:|---:|---:|---:|
| `lodash-ka.json` | `lodash/lodash` | 63,925 | 2,157 | 1,475 | 6 | 52 | 20.42s |
| `mocha-jd.json` | `mochajs/mocha` | 76,895 | 2,318 | 1,517 | 6 | 75 | 21.24s |
| `mocha-jd2.json` | `mochajs/mocha` | 76,895 | 2,386 | 1,570 | 6 | 75 | 22.38s |
| `mocha-ka.json` | `mochajs/mocha` | 76,895 | 2,703 | 1,740 | 6 | 88 | 19.70s |
| `moment-ka.json` | `moment/moment` | 65,026 | 2,144 | 1,361 | 6 | 51 | 27.40s |
| `typeorm-ka.json` | `typeorm/typeorm` | 106,656 | 3,117 | 2,353 | 6 | 71 | 48.82s |

All valid standardized LemonBeam outputs have:

- repository metadata
- commit SHA
- six expected guide sections
- line/file citations
- uncertainty reporting

This is the product consistency win.

### 8. LemonBeam Is Deterministic In Structure And Evidence, Not Exact Prose

The three Mocha runs are the best determinism test:

- same repo
- same commit
- same model
- same prompt-token count: 76,895
- same section order
- same excluded chunk count: 3451

The output still varied in wording and citation selection.

Measured full-document similarity:

| Pair | Word cosine similarity | Unique word overlap | Trigram overlap |
|---|---:|---:|---:|
| `mocha-jd` vs `mocha-jd2` | 96.5% | 59.2% | 26.5% |
| `mocha-jd` vs `mocha-ka` | 94.0% | 56.4% | 18.3% |
| `mocha-jd2` vs `mocha-ka` | 94.7% | 54.0% | 17.4% |

Conclusion:

> LemonBeam is stable at the product-output level but not text-identical run to run.

This is an important caveat. We should not claim full determinism. We can claim repeatable structure, repeatable evidence input, and stable broad guidance.

### 9. Citation Validation Is A Core Product Requirement

The TypeORM LemonBeam guide produced 71 file-and-line citations, but prior audits found a small number of invalid citation targets.

From the TypeORM evaluation:

- 71 line citation occurrences
- 67 valid line citation occurrences in the stricter audit
- 4 invalid line citation occurrences
- 94.4% citation occurrence validity
- 54 unique line targets
- 51 valid unique line targets
- 3 invalid unique line targets

This is far better than vanilla ChatGPT's 0 usable citations, but still not perfect.

Conclusion:

> LemonBeam's citation system is a differentiator, but citation validation must become part of the product, not just an evaluation script.

### 10. The Uncertainty Section Is Honest But Too Noisy

The tests repeatedly show that uncertainty reporting is valuable, but the current display can undermine user confidence.

Examples:

- Lodash: `1605 more excluded chunk(s)`
- Mocha: `3451 more excluded chunk(s)`
- Moment: `1479 more excluded chunk(s)`
- TypeORM: `10354 more excluded chunk(s)`

TypeORM also lists 43 `Invalid argument` entries in its uncertainty section.

This transparency is better than silently dropping evidence, but the current wording can make normal token-budget behavior look catastrophic.

Recommended direction:

- group excluded chunks by file or directory
- deduplicate repeated files
- separate skipped files from budget-excluded chunks
- distinguish "irrelevant" from "over budget"
- show a summary first, then optional details
- replace vague `Invalid argument` with actionable parser/chunker error reasons

### 11. Model Choice Matters, But Architecture Matters More

The pre-standardization model comparison on `class-validator` is useful but should be interpreted carefully.

| Model | Prompt tokens | Completion tokens | Cost | Words | Line citations |
|---|---:|---:|---:|---:|---:|
| Claude Sonnet 5 | 392,800 | 5,985 | $0.845 | 2,036 | 101 |
| Gemini 2.5 Pro | 297,444 | 5,591 | $0.827 | 1,281 | 35 |
| GPT-5.6 Sol | 262,376 | 3,330 | $0.689 | 1,880 | 100 |
| GPT-5 | 262,376 | 4,296 | $0.371 | 1,151 | 63 |

The outputs differ meaningfully. Pairwise cosine similarity ranged from 66.5% to 88.2%.

Takeaways:

- model choice affects length, style, citation density, cost, and latency
- higher cost did not automatically mean better product fit
- a controlled pipeline is still necessary regardless of model
- budgeted evidence selection matters more than hoping for a bigger model window

### 12. Direct-to-Model and Tool-Enabled Runs Are Not Apples-To-Apples

`pre-standardization/direct-to-gpt-5/express-ka.json` is a useful comparison, but it is not a clean bare-model test.

Its note records that the OpenRouter chat UI had extra tools attached:

- `openrouter:web_search`
- `openrouter:web_fetch`
- `openrouter:image_generation`
- `openrouter:fusion`
- `openrouter:shell`
- an OpenRouter-injected system prompt

That means this run compares LemonBeam not just against a model, but against a tool-enabled chat product with hidden behavior.

This reinforces a blog-writing lesson:

> Be very clear about test conditions. "ChatGPT" or "model X" is not always the same thing as a bare LLM call.

### 13. Test Methodology Needs To Stay Clear Before Public Claims

Methodology caveats found while reading the test folder:

- `test-runs/withCitations/` exists at the root even though one request expected `test-runs/vanillagpt/withCitations/`.
- Pre-standardization files use multiple shapes and should not be treated as identical to current standardized runs.
- Some cost fields appear suspicious, especially `mocha-ka.json` reporting much lower cost than JD/JD2 despite same prompt tokens and more completion tokens.
- Some ChatGPT files are raw Markdown while others are JSON envelopes.
- Some older runs include provider tools or UI behavior that make comparisons less clean.

This is normal for exploratory testing, but the blog post should distinguish exploratory observations from controlled conclusions.

## Folder-Level Observations

### `lemonbeam-5.6-luna/`

This is the most important folder for current product claims.

Strengths:

- consistent six-section guide format
- source citations throughout
- commit metadata captured
- prompt/completion usage captured
- real repos processed through the actual LemonBeam pipeline

Weaknesses:

- noisy uncertainty sections
- TypeORM scan/chunk failures
- cost logging inconsistency

Most important lesson:

> LemonBeam can keep guide generation bounded and structured across repos that differ widely in raw size and complexity.

### `full-dump-5.6-luna/`

This folder currently contains the Moment failure case.

Most important lesson:

> Raw dumping does not scale past context limits, even on models with very large windows.

The Moment raw dump failed at about 2,059,892 requested tokens against a 1,310,720-token context limit. LemonBeam handled the same repo by sending a much smaller selected evidence prompt.

### `vanillagpt/`

This folder shows that vanilla ChatGPT can write useful TypeORM onboarding prose.

Most important lesson:

> Vanilla ChatGPT is a strong writing baseline, but not an evidence-backed documentation system.

### `withCitations/`

This folder shows that simply asking vanilla ChatGPT for citations did not produce useful citations.

Most important lesson:

> Citation compliance is a system design problem, not a prompt wish.

### `urlAndCitations/`

This folder is especially relevant to LemonBeam's user-facing comparison, because the user only gives a GitHub repo name/URL.

Most important lesson:

> ChatGPT can produce a plausible guide from a URL, but it did not provide claim-level citations even when asked.

### `needle-haystack-chatgpt/`

This folder probes the black-box behavior behind URL-based answers.

Most important lesson:

> ChatGPT can retrieve or reconstruct deeply buried facts, but proof metadata is unreliable.

This is probably the most interesting blog material.

### `pre-standardization/`

This folder is messy but valuable.

It captures:

- early E2E runs
- model comparisons
- token-ceiling fix evidence
- raw-dump comparisons
- direct-to-model comparisons
- early ChatGPT baselines
- known false-positive monorepo planning notes

Most important lesson:

> The product evolved because real repo tests exposed token ceilings, monorepo false positives, citation gaps, and uncertainty UX problems.

## Product Conclusions

### LemonBeam's Real Differentiator

The tests support this positioning:

> LemonBeam turns a repository into a source-backed onboarding guide with a stable structure, citations, commit metadata, and uncertainty reporting.

They do not support this stronger but weaker-founded claim:

> LemonBeam always writes better prose than ChatGPT.

Vanilla ChatGPT often writes polished prose. LemonBeam's value is trust, repeatability, and evidence discipline.

### What LemonBeam Is Better At

- fixed product format
- evidence-backed statements
- reproducible section structure
- commit-specific results
- bounded token usage
- reporting what was skipped or excluded
- making generated docs auditable

### What Vanilla ChatGPT Is Better At

- quick ad hoc prose
- flexible tutorial style
- extra contributor advice
- casual exploration
- no custom app/pipeline setup

### What Raw Full-Dump Is Better At

- small repos that fit in context
- maximum direct source visibility
- simple one-off experiments

### What Raw Full-Dump Is Bad At

- large repos
- predictable token costs
- citation discipline
- repeatable product structure
- scaled product UX

## Launch Recommendations

1. Add automated citation validation before returning the guide.
2. Rewrite the uncertainty section to be summarized, grouped, and less alarming.
3. Replace `Invalid argument` with specific parser/chunker error reasons.
4. Validate cost logging, especially the Mocha KA run discrepancy.
5. Keep the standardized JSON shape and clearly label pre-standardization comparisons.
6. Keep testing against repos near the size/token edge, not only small happy paths.
7. Add a "citation validity" metric to every evaluation run.
8. Add a "selected evidence summary" so users know what LemonBeam actually used.
9. Treat model swaps as product experiments, not just backend configuration changes.
10. Continue comparing LemonBeam against vanilla ChatGPT, but be precise about input method and tool availability.

