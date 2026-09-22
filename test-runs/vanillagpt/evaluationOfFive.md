# Vanilla ChatGPT vs. LemonBeam: TypeORM Guide Evaluation

## Test Setup

This evaluation compares five vanilla ChatGPT runs against one LemonBeam run for `typeorm/typeorm`.

Vanilla ChatGPT inputs:

- `test-runs/vanillagpt/typeormOne.md`
- `test-runs/vanillagpt/typeormTwo.md`
- `test-runs/vanillagpt/typeormThree.md`
- `test-runs/vanillagpt/typeormFour.md`
- `test-runs/vanillagpt/typeormFive.md`

LemonBeam comparison:

- `test-runs/lemonbeam-5.6-luna/typeorm-ka.json`

The vanilla prompt asked for an onboarding guide covering project overview, setup, running locally, project structure, and testing. The LemonBeam guide was generated through LemonBeam's actual scan, chunk, evidence selection, and citation-backed guide pipeline.

## High-Level Conclusion

LemonBeam is stronger when the goal is a consistent, source-backed contributor guide that can be audited. Vanilla ChatGPT is stronger when the goal is a quick, readable, free-form onboarding document and exact citations are not required.

The decisive difference is not that vanilla ChatGPT produces bad prose. It does not. The vanilla outputs are generally coherent and useful. The decisive difference is that vanilla ChatGPT gives no reliable evidence trail, while LemonBeam produces structured sections with file-and-line citations and reports missing or excluded evidence.

For a developer tool whose value proposition is "generate a trustworthy guide from repository evidence," LemonBeam is better positioned than vanilla ChatGPT.

## Quantitative Findings

### Output Size

| Run | Lines | Words | Characters | Code Blocks | Citations |
|---|---:|---:|---:|---:|---:|
| Vanilla 1 | 537 | 1,639 | 13,983 | 31 | 0 |
| Vanilla 2 | 412 | 1,414 | 12,178 | 26 | 0 |
| Vanilla 3 | 471 | 1,590 | 14,379 | 28 | 0 |
| Vanilla 4 | 499 | 1,483 | 12,521 | 35 | 0 |
| Vanilla 5 | 532 | 1,592 | 13,572 | 37 | 0 |
| LemonBeam | 193 | 1,615 | 16,939 | 9 | 71 |

Vanilla ChatGPT produced guides in a fairly narrow word range: 1,414-1,639 words. That is a 225-word spread, or about 14.6% of the average vanilla guide length.

LemonBeam produced a similarly sized guide by word count, but with much denser source attribution: 71 file-and-line citations.

### Similarity Across the Five Vanilla Runs

The five vanilla guides are topically similar, but not identical.

Average pairwise similarity across vanilla runs:

- Word-level cosine similarity: 94.7%
- Unique-word overlap: 48.1%
- Three-word phrase overlap: 11.0%
- Five-word phrase overlap: 5.6%

Interpretation:

The vanilla guides talk about the same concepts, but they do not produce the same guide. They use similar vocabulary, but the exact phrasing, ordering, and section choices vary a lot.

That means vanilla ChatGPT is stable at the topic level but unstable at the product-output level.

### Vanilla vs. LemonBeam Similarity

Average similarity between each vanilla guide and the LemonBeam guide:

- Word-level cosine similarity: 53.1%
- Unique-word overlap: 24.3%
- Three-word phrase overlap: 1.5%
- Five-word phrase overlap: 0.2%

Interpretation:

LemonBeam is not just producing a lightly modified vanilla-style guide. It is a meaningfully different artifact: more compact structurally, more citation-heavy, and more constrained to the product's fixed guide format.

## Structural Differences

### Vanilla ChatGPT

The vanilla outputs all covered the requested ideas, but the structure varied.

Examples of extra or inconsistent sections:

- `Prerequisites`
- `Initial Setup`
- `Running Databases with Docker`
- `Useful Development Commands`
- `Writing Tests`
- `Before Opening a Pull Request`
- `Recommended First-Day Workflow`
- `Quick Reference`
- `First-Day Checklist`

Those extra sections are not necessarily bad. In some cases they are useful. But they mean vanilla ChatGPT does not reliably follow a fixed product schema unless the prompt is much stricter.

### LemonBeam

LemonBeam produced the expected fixed sections:

- Project Overview
- Setup / Installation
- Running Locally
- Project Structure
- Testing
- Uncertainties and Missing Information

This is better for a product because the output is predictable. The frontend, users, tests, and future evaluation workflows can expect the same structure every time.

## Citation and Verification Differences

This is the biggest LemonBeam advantage.

The five vanilla guides produced:

- 0 file-and-line citations
- no uncertainty section
- no direct way to verify claims without manually searching the repo

The LemonBeam guide produced:

- 71 file-and-line citations
- repository metadata
- commit SHA
- prompt/completion token usage
- cost
- wall-clock timing
- skipped-file reporting
- excluded-evidence reporting

That makes LemonBeam much easier to audit. A user can check whether a claim came from `package.json`, `DEVELOPER.md`, a workflow file, a test file, or a source file.

Vanilla ChatGPT can produce a nice guide, but the reader has to trust it. LemonBeam gives the reader a way to verify it.

## Quality Observations

### Where Vanilla ChatGPT Did Well

Vanilla ChatGPT generated readable, practical onboarding guides. It often included helpful contributor-oriented extras, such as first-day workflows, useful commands, PR advice, and test-writing guidance.

It also produced more tutorial-like prose than LemonBeam. For a human casually trying to understand the repo, some vanilla outputs may feel easier to read.

### Where Vanilla ChatGPT Fell Short

The vanilla runs were not reproducible in structure. Even with the same prompt and same repo evidence, the outputs differed in section names, ordering, depth, and emphasis.

Most importantly, the vanilla guides were not auditable. They made many plausible claims, but without citations. That makes it harder to know whether a statement came from the repo, from model inference, or from general knowledge about TypeORM.

### Where LemonBeam Did Well

LemonBeam's strongest result is source-backed output. It cited specific files and line ranges throughout the guide, and it followed the fixed six-section structure.

LemonBeam also surfaced uncertainty. It did not silently pretend that every file made it into the final guide.

### Where LemonBeam Fell Short

The LemonBeam run exposed real product issues:

- 42 files could not be analyzed because of an `Invalid argument` chunking/scanning issue.
- 10,354 chunks were excluded by token budgeting.
- The uncertainty section is very noisy and may scare users even when exclusion is expected behavior.
- Excluded chunks are listed repetitively instead of grouped by file.

These are fixable product issues, but they matter. LemonBeam is more transparent than vanilla ChatGPT, but its transparency currently needs better presentation.

## Advantages and Disadvantages

### Vanilla ChatGPT Advantages

- Fast to use manually.
- Produces readable prose.
- Often adds useful onboarding extras without being asked.
- Does not require building or maintaining a scan/chunk/retrieval pipeline.
- Good for rough exploration or one-off personal understanding.

### Vanilla ChatGPT Disadvantages

- No citations.
- No reliable proof that claims came from the provided repo.
- Structure changes from run to run.
- Hard to compare outputs automatically.
- No explicit skipped-file or excluded-evidence reporting.
- No repository metadata, commit SHA, cost, token, or timing record in the guide output.

### LemonBeam Advantages

- Fixed guide format.
- File-and-line citations.
- Evidence selection instead of full-repo dumping.
- Explicit uncertainty reporting.
- Better suited for repeatable product output.
- Records metadata such as model, cost, usage, timing, repository, and commit SHA.
- Designed to stay under token limits through chunking and budgeting.

### LemonBeam Disadvantages

- More engineering complexity.
- Quality depends on scanner, classifier, chunker, scorer, and budget tuning.
- Important evidence can be excluded if budgets or scoring are off.
- Current uncertainty output is noisy.
- Current TypeORM run shows a serious chunking/scanning issue on 42 files.

## Recommendation

The team should not claim that LemonBeam always writes prettier guides than vanilla ChatGPT. The stronger and more defensible claim is:

LemonBeam produces more trustworthy, auditable, and product-consistent repository guides than vanilla ChatGPT.

Based on these five runs, vanilla ChatGPT is good at generating a plausible onboarding guide. LemonBeam is better at generating a guide that can be verified against repository evidence.

Before launch, the highest-value improvements are:

1. Fix the `Invalid argument` chunking/scanning issue.
2. Group excluded chunks by file in the uncertainty section.
3. Separate "files we could not analyze" from "chunks excluded by token budget" more clearly.
4. Tune evidence scoring and section budgets using real repos like TypeORM.
5. Keep emphasizing citations as the core product differentiator.

## Bottom Line

Vanilla ChatGPT is a strong baseline for readable prose.

LemonBeam is the better product if the goal is repeatable, evidence-backed contributor documentation.
