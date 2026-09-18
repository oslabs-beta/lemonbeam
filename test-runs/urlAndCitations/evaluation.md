# URL-Only Vanilla ChatGPT With Citation Request vs. LemonBeam: TypeORM Evaluation

## Test Setup

Prompt used for the vanilla ChatGPT runs:

```md
Here's a GitHub repo:
typeorm/typeorm — write me an onboarding guide covering project overview, setup, running it locally, project structure, and testing. Give it to me in markdown format. Provide inline source citations.
```

Vanilla ChatGPT files evaluated:

- `test-runs/urlAndCitations/urlOne.md`
- `test-runs/urlAndCitations/urlTwo.md`
- `test-runs/urlAndCitations/urlThree.md`
- `test-runs/urlAndCitations/urlFour.md`
- `test-runs/urlAndCitations/urlFive.md`

LemonBeam comparison:

- `test-runs/lemonbeam-5.6-luna/typeorm-ka.json`

This experiment is slightly different from the raw-dump tests. Here, vanilla ChatGPT was given only the repository identifier/URL-style input, not the full raw repository contents.

## High-Level Conclusion

The URL-only vanilla ChatGPT runs produced readable onboarding guides, but they did not produce useful inline source citations.

Across all five vanilla guides:

- File-and-line citations: 0
- Evidence-specific file citations: 0
- Markdown links: 3 total
- All 3 markdown links were just the TypeORM GitHub homepage link

So the citation request was not satisfied in a meaningful way. Linking once to `https://github.com/typeorm/typeorm` is not the same as citing the source of a specific claim.

LemonBeam remains clearly better for source-backed contributor guides because it produced claim-level citations tied to repository files and line ranges.

## Quantitative Summary

| Run | Lines | Words | Characters | Code Blocks | File/Line Citations | Markdown Links |
|---|---:|---:|---:|---:|---:|---:|
| Vanilla URL 1 | 446 | 1,658 | 13,499 | 32 | 0 | 1 |
| Vanilla URL 2 | 393 | 1,531 | 12,070 | 29 | 0 | 0 |
| Vanilla URL 3 | 516 | 1,896 | 15,804 | 35 | 0 | 1 |
| Vanilla URL 4 | 602 | 2,062 | 17,043 | 43 | 0 | 1 |
| Vanilla URL 5 | 516 | 1,866 | 15,307 | 35 | 0 | 0 |
| LemonBeam | 193 | 1,615 | 16,939 | 9 | 71 | 0 |

The vanilla URL guides averaged 1,803 words, ranging from 1,531 to 2,062 words. That is a 531-word spread, or about 29.5% of the average vanilla guide length.

LemonBeam was shorter by line count and similar by word count, but it carried far more source attribution.

## Similarity Across the Five Vanilla URL Runs

Average pairwise similarity across the five vanilla URL runs:

- Word-level cosine similarity: 95.1%
- Unique-word overlap: 44.0%
- Three-word phrase overlap: 8.2%
- Five-word phrase overlap: 3.8%

Interpretation:

The vanilla guides are very similar at the broad topic level. They all discuss TypeORM as a library, pnpm, database setup, Docker, compile/test commands, project structure, and testing.

But they are not identical product artifacts. Section count, section names, ordering, level of detail, and final workflow advice differ across runs.

## Vanilla URL Runs vs. LemonBeam

Average similarity between each vanilla URL guide and the LemonBeam guide:

- Word-level cosine similarity: 55.2%
- Unique-word overlap: 22.4%
- Three-word phrase overlap: 1.2%
- Five-word phrase overlap: 0.1%

Interpretation:

LemonBeam is producing a materially different guide. The vanilla URL guides are longer, more tutorial-like, and more command-heavy. LemonBeam is more compact, follows the fixed LemonBeam section format, and includes evidence citations plus uncertainty reporting.

## Citation Findings

### Vanilla URL ChatGPT

The prompt explicitly asked:

> Provide inline source citations.

But the outputs did not provide real inline source citations.

Measured result:

- 5 guides evaluated
- 0 file-and-line citations
- 0 evidence-specific file references
- 3 generic markdown links total
- 3/3 markdown links pointed only to `https://github.com/typeorm/typeorm`
- 2/5 guides had no markdown links at all

Citation compliance rate for claim-level evidence: **0%**

The homepage links are not false, but they are too broad to verify claims. A statement like "the project uses pnpm 10.34.5" needs a citation to `package.json`, not a generic link to the repository homepage.

### LemonBeam

LemonBeam produced 71 file-and-line citation occurrences.

Automated citation target check against the local TypeORM checkout:

- Total line-range citation occurrences: 71
- Valid line-range citation occurrences: 67
- Invalid line-range citation occurrences: 4
- Citation occurrence validity: **94.4%**

Unique citation target check:

- Unique line-range citation targets: 54
- Valid unique citation targets: 51
- Invalid unique citation targets: 3
- Unique citation target validity: **94.4%**

The LemonBeam guide also had 8 unique non-line bracket references, such as `package.json`, `tsconfig.json`, `.github/workflows/tests-windows.yml`, and `packages/codemod/package.json`. All 8 resolved to real files.

Invalid LemonBeam citation targets found:

- `docs/releases/1.0/02-upgrading-from-0.3.md:411-425`
  - Actual file appears to be `docs/docs/releases/1.0/02-upgrading-from-0.3.md`
- `test/functional/persistence/persistence-basic-functionality.test.ts:19-19`
  - Actual nearby file appears to be `test/functional/persistence/basic-functionality/persistence-basic-functionality.test.ts`
- `test/functional/persistence/persistence-basic-functionality/persistence-basic-functionality.test.ts:19-19`
  - Actual nearby file appears to be `test/functional/persistence/basic-functionality/persistence-basic-functionality.test.ts`

One of those invalid targets appeared twice, which is why there are 3 invalid unique targets but 4 invalid citation occurrences.

## Factual Accuracy Spot Check

The vanilla URL guides were generally plausible and matched many major facts in the local TypeORM checkout:

- `package.json` confirms package version `1.1.1`.
- `package.json` confirms `pnpm@10.34.5`.
- `package.json` confirms supported Node versions: `^20.19.0 || ^22.13.0 || >=24.11.0`.
- `package.json` confirms scripts including `compile`, `test`, `test:fast`, `typecheck`, `lint`, `format`, `package`, `docs:dev`, and `watch`.
- `DEVELOPER.md` confirms `pnpm install`.
- `DEVELOPER.md` confirms copying `ormconfig.sample.json` to `ormconfig.json`.
- `DEVELOPER.md` confirms `docker compose up postgres-17`.
- `DEVELOPER.md` confirms `pnpm run compile -- --watch` and `pnpm run test:fast`.
- `DEVELOPER.md` confirms the `createTestingConnections`, `reloadTestingDatabases`, and `closeTestingConnections` test pattern.
- `docs/README.md` confirms the docs site uses `pnpm run start` and `pnpm run build`.

So vanilla ChatGPT was not useless or obviously hallucinating across the main workflow claims. The problem is verification. It gave the reader no practical way to confirm which file supported which claim.

## Structural Differences

### Vanilla URL Guides

The vanilla URL guides tended to include extra contributor-help sections such as:

- Prerequisites
- Clone and install
- Configure databases
- Local databases with Docker
- Code-quality commands
- Contribution checklist
- Recommended first-day workflow
- Command cheat sheet
- Where to start reading the code

These are useful sections, but they vary by run. The outputs are helpful as free-form onboarding docs, not as a stable product format.

### LemonBeam

LemonBeam followed the expected product structure:

- Project Overview
- Setup / Installation
- Running Locally
- Project Structure
- Testing
- Uncertainties and Missing Information

That fixed structure is a product advantage. It makes output easier to test, render, compare, and improve.

## Advantages and Disadvantages

### Vanilla URL ChatGPT Advantages

- Easy to run manually.
- Produces readable onboarding prose.
- Often includes helpful contributor workflow advice.
- Does not require raw repo dumping.
- Does not require maintaining a custom scanner/chunker pipeline.
- Can produce a decent high-level guide from only a repo identifier.

### Vanilla URL ChatGPT Disadvantages

- Failed to produce claim-level inline citations despite being asked.
- Generic homepage links do not verify individual claims.
- No line numbers.
- No commit SHA.
- No scan metadata.
- No skipped-file reporting.
- No excluded-evidence reporting.
- No fixed product structure.
- Hard to tell whether claims come from live repo inspection, model memory, or inference.

### LemonBeam Advantages

- Produces file-and-line citations.
- Records repository metadata and commit SHA.
- Follows a fixed product guide format.
- Reports skipped files and excluded evidence.
- Uses repository scanning, chunking, scoring, and token budgeting instead of relying on a generic URL-level model response.
- Gives users a path to verify claims.

### LemonBeam Disadvantages

- More engineering complexity.
- Current TypeORM run reports 42 files that could not be analyzed because of `Invalid argument`.
- Current uncertainty section is noisy.
- Excluded chunks are repetitive and should be grouped by file.
- Citation path validation is not perfect; 4 of 71 line-range citation occurrences did not resolve exactly.
- Guide quality depends on scanner/chunker/classifier/scoring/budget behavior.

## Product Conclusion

If the question is:

> Can vanilla ChatGPT produce a readable onboarding guide from only `typeorm/typeorm`?

Yes.

If the question is:

> Is vanilla ChatGPT enough to replace LemonBeam?

No.

The core reason is citations. In this experiment, vanilla ChatGPT was explicitly asked to provide inline source citations, but it produced 0 claim-level citations across five runs. LemonBeam produced 71 file-and-line citation occurrences, with 94.4% of those resolving correctly against the repository snapshot.

That gives LemonBeam a decisive advantage for the product's intended use case:

> LemonBeam is not merely generating onboarding prose. It is generating repository-evidence-backed onboarding documentation.

That is the strongest differentiation from vanilla ChatGPT.

## Launch Recommendations

Before launch, the team should improve LemonBeam in the places this comparison exposed:

1. Fix the `Invalid argument` issue that prevented 42 TypeORM files from being analyzed.
2. Add stricter citation validation so malformed paths cannot appear in the final guide.
3. Group excluded chunks by file in the Uncertainties section.
4. Rewrite the Uncertainties section so normal token-budget exclusions do not look like catastrophic scan failure.
5. Keep messaging focused on trust, repeatability, and citations rather than claiming LemonBeam always writes prettier prose.

## Bottom Line

Vanilla ChatGPT can generate a useful-looking onboarding guide from a GitHub repo name.

LemonBeam is better when the guide needs to be auditable, source-backed, and product-consistent.
