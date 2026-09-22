# LemonBeam 5.6 Luna Determinism Evaluation

This evaluation compares three LemonBeam runs against the same repository:

- `mocha-jd.json`
- `mocha-jd2.json`
- `mocha-ka.json`

The goal is to understand how deterministic LemonBeam is when scanning the same repo and generating a guide with the same model.

## Summary

The Mocha runs are highly deterministic in structure and evidence input, but not deterministic in exact prose or citation-span selection.

All three runs used the same repository, same commit, same model, same prompt-token count, same guide section structure, and same excluded-evidence count. That suggests the scan, chunking, evidence selection, and prompt assembly were stable across runs.

The final generated guide still varies. The runs cover the same major facts and workflows, but the model rewrites sentences, chooses slightly different supporting details, and cites different line ranges in some sections.

## Shared Run Inputs

| Field | Result |
|---|---|
| Repository | `mochajs/mocha` |
| Default branch | `main` |
| Commit SHA | `d59467a8a50c07628f5ccb11c683e8820dd4a291` |
| Model | `openai/gpt-5.6-luna` |
| Prompt tokens | `76,895` |
| Guide sections | Same 6 sections, same order |
| Excluded chunks | `3451 more excluded chunk(s)` in all three runs |

The identical prompt-token count is especially important. It strongly suggests the same evidence bundle was sent to the model each time, so most output variation is generation variance rather than retrieval variance.

## Guide Structure

All three guides use the same LemonBeam section structure:

1. Project Overview
2. Setup / Installation
3. Running Locally
4. Project Structure
5. Testing
6. Uncertainties and Missing Information

This is a strong product consistency result. Unlike vanilla ChatGPT runs, LemonBeam preserved the expected guide format across repeated runs.

## Length Comparison

| Run | Lines | Words | Characters |
|---|---:|---:|---:|
| `mocha-jd` | 81 | 1,001 | 9,992 |
| `mocha-jd2` | 80 | 1,056 | 10,308 |
| `mocha-ka` | 154 | 1,134 | 11,352 |

`mocha-ka` is more verbose and more visually structured, with more line breaks, code blocks, bullets, and citations. The two JD runs are more compact and paragraph-oriented.

## Similarity Metrics

| Pair | Full-document word cosine similarity | Unique word overlap | Trigram overlap | Fivegram overlap |
|---|---:|---:|---:|---:|
| `mocha-jd` vs `mocha-jd2` | 96.5% | 59.2% | 26.5% | 19.4% |
| `mocha-jd` vs `mocha-ka` | 94.0% | 56.4% | 18.3% | 13.0% |
| `mocha-jd2` vs `mocha-ka` | 94.7% | 54.0% | 17.4% | 13.0% |

The high cosine similarity means the guides cover very similar subject matter. The much lower n-gram overlap means the model does not repeat the same wording run-to-run.

In plain terms: LemonBeam is stable at the content and structure level, but not at the exact sentence level.

## Section-Level Similarity

| Section | `jd` vs `jd2` | `jd` vs `ka` | `jd2` vs `ka` |
|---|---:|---:|---:|
| Project Overview | 78.1% | 81.5% | 77.3% |
| Setup / Installation | 86.9% | 78.4% | 78.3% |
| Running Locally | 90.8% | 91.3% | 85.5% |
| Project Structure | 86.8% | 65.3% | 66.4% |
| Testing | 74.1% | 66.6% | 81.7% |
| Uncertainties and Missing Information | 100.0% | 100.0% | 100.0% |

The most stable generated section was Running Locally. The most variable sections were Project Structure and Testing, especially when comparing the JD runs to the KA run.

That makes sense: project structure and testing can be summarized at different levels of granularity. The KA run included more detail about subdirectories such as `lib/nodejs/`, `lib/browser/`, `test/node-unit/`, `test/only/`, and `test/require/`.

## Citation Behavior

| Run | Bracket references | Line citation occurrences | Unique line citations |
|---|---:|---:|---:|
| `mocha-jd` | 89 | 75 | 48 |
| `mocha-jd2` | 90 | 75 | 48 |
| `mocha-ka` | 101 | 88 | 62 |

The KA run cited more evidence overall. The two JD runs had almost identical citation counts.

Citation overlap was moderate:

| Pair | Shared unique citations | Total unique citation union | Citation overlap |
|---|---:|---:|---:|
| `mocha-jd` vs `mocha-jd2` | 33 | 63 | 52.4% |
| `mocha-jd` vs `mocha-ka` | 35 | 75 | 46.7% |
| `mocha-jd2` vs `mocha-ka` | 32 | 78 | 41.0% |

This means LemonBeam repeatedly cites many of the same core files, but it does not always choose the exact same line ranges. The strongest recurring citation sources included:

- `.github/DEVELOPMENT.md`
- `AGENTS.md`
- `PROJECT_CHARTER.md`
- `package.json`
- `bin/mocha.js`
- `lib/mocha.cjs`
- `browser-entry.js`
- reporter files under `lib/reporters/`
- test files under `test/`
- `docs/README.md`
- `repro/README.md`

## Stable Claims Across Runs

All three guides consistently identify the same core facts:

- Mocha is a JavaScript testing framework for Node.js and browsers.
- The repo uses npm, not yarn or pnpm.
- Required Node.js versions are `^20.19.0 || >=22.12.0`.
- Node.js 22 LTS is recommended.
- Chrome is needed for local browser tests.
- `npm install` is the local setup command.
- `npm test` is the main validation command.
- `npx mocha --watch test/unit/` is a watch-mode development command.
- `npm run clean` and `npm run build` regenerate browser artifacts.
- Documentation lives under `docs/`.
- The CLI entry point is `bin/mocha.js`.
- Core implementation lives under `lib/`.
- Tests live under several `test/` subdirectories.
- Browser tests use Playwright.
- Generated bundle artifacts should not be edited directly.

This is the most important determinism finding: the product-level guidance is stable.

## Differences Worth Noting

The JD runs are more compact and similar to each other. They cover the same content with fewer formatting breaks.

The KA run is more detailed and more readable in some places. It uses code blocks for commands, bullets for project structure, and more specific subdirectory coverage. It also includes more citations.

The Testing section varies meaningfully. The JD runs emphasize broad test categories and npm scripts. The KA run adds more detail about `test/node-unit/`, `test/only/`, `test/require/`, root hooks, fixtures, and test dependencies.

The Project Structure section also varies. The KA run breaks out more subdirectories and explains Node-specific and browser-specific internals separately.

## Uncertainty Section

The uncertainty section is exactly stable across all three runs.

Each run reports the same excluded-evidence list preview and ends with:

```text
…and 3451 more excluded chunk(s)
```

This is good for pipeline determinism, but it is a product concern. A user may interpret `3451 more excluded chunk(s)` as "LemonBeam skipped most of the repo" or "the guide is unreliable," even if those chunks were irrelevant or over budget.

For launch polish, this section may need better aggregation. For example:

- group excluded chunks by file or directory
- deduplicate repeated files
- separate "irrelevant" from "over budget"
- summarize counts by category
- avoid showing a scary raw chunk count without context

## Cost Logging Note

One odd result is the reported cost:

| Run | Reported cost |
|---|---:|
| `mocha-jd` | `$0.0220` |
| `mocha-jd2` | `$0.0221` |
| `mocha-ka` | `$0.00478` |

The KA run reports the same prompt-token count and more completion tokens, but a much lower cost. That looks suspicious. The cost number may depend on different logging paths, manual entry, provider reporting differences, or a calculation issue.

Recommendation: do not use these cost numbers as evidence until cost logging is checked.

## Conclusion

LemonBeam is deterministic where it matters most for product reliability:

- same repository metadata
- same exact commit
- same prompt-token count
- same guide section order
- same uncertainty/excluded-evidence section
- same broad claims and workflows

It is not deterministic at the exact prose level. The model rewrites sentences and chooses different citation spans even when the evidence input is identical.

The strongest claim we can make is:

> LemonBeam produces highly consistent, source-backed guide structure and repository-specific guidance across repeated runs, but exact wording and citation-span selection still vary.

That is still a strong result compared with vanilla ChatGPT. LemonBeam does not guarantee identical output, but it does appear to provide a stable product format and stable evidence-grounded content for repeated scans of the same repo.
