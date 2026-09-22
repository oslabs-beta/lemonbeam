# Vanilla ChatGPT With Citation Request vs. LemonBeam: TypeORM Evaluation

## Test Setup

This evaluation compares five vanilla ChatGPT runs that were requested to include inline citations against one LemonBeam run for `typeorm/typeorm`.

Vanilla ChatGPT files evaluated:

- `test-runs/withCitations/typeormOne.md`
- `test-runs/withCitations/typeormTwo.md`
- `test-runs/withCitations/typeormThree.md`
- `test-runs/withCitations/typeormFour.md`
- `test-runs/withCitations/typeormFive.md`

LemonBeam comparison:

- `test-runs/lemonbeam-5.6-luna/typeorm-ka.json`

Note: the requested path was `test-runs/vanillagpt/withCitations/`, but the actual files are currently in `test-runs/withCitations/`.

## High-Level Conclusion

The citation-requested vanilla ChatGPT runs did not materially close the gap with LemonBeam.

The five vanilla guides are readable and mostly factually plausible, but they do not contain usable inline citations. Across all five vanilla files, I found:

- 0 file-and-line citations
- 0 bracket-style citation references outside code blocks
- 0 citation targets to verify

So the inline-citation request failed as a product requirement. Vanilla ChatGPT produced useful prose, but not auditable prose.

LemonBeam, by contrast, produced 71 file-and-line citations. Its citation system is not perfect: 3 of those 71 citations point to paths that do not exist exactly as cited. But even with that flaw, LemonBeam is far ahead on verifiability because it gives readers a source trail.

The strongest defensible conclusion is:

> Vanilla ChatGPT can write a decent onboarding guide, but LemonBeam is better for source-backed, repeatable, auditable contributor documentation.

## Quantitative Summary

| Run | Lines | Words | Characters | Code Blocks | File/Line Citations |
|---|---:|---:|---:|---:|---:|
| Vanilla 1 | 306 | 1,046 | 8,571 | 20 | 0 |
| Vanilla 2 | 393 | 1,372 | 11,253 | 25 | 0 |
| Vanilla 3 | 393 | 1,343 | 11,158 | 28 | 0 |
| Vanilla 4 | 355 | 1,406 | 12,524 | 26 | 0 |
| Vanilla 5 | 337 | 1,371 | 10,983 | 22 | 0 |
| LemonBeam | 193 | 1,615 | 16,939 | 9 | 71 |

The vanilla guides averaged about 1,308 words, with a range from 1,046 to 1,406 words. That is a 360-word spread, or about 27.5% of the average vanilla guide length.

LemonBeam was similar in word count at 1,615 words, but much denser in source attribution.

## Similarity Across the Five Vanilla Runs

Average pairwise similarity across the five vanilla runs:

- Word-level cosine similarity: 93.8%
- Unique-word overlap: 43.4%
- Three-word phrase overlap: 7.8%
- Five-word phrase overlap: 3.7%

Interpretation:

The vanilla guides are conceptually similar. They consistently describe TypeORM as a library, mention pnpm, `ormconfig.json`, Docker/database setup, compile/test workflows, and project structure.

But the actual output varies. Section names, section order, level of detail, and phrasing differ across runs. This means vanilla ChatGPT is stable at the topic level, but not stable as a product output format.

## Vanilla vs. LemonBeam Similarity

Average similarity between each vanilla guide and the LemonBeam guide:

- Word-level cosine similarity: 53.6%
- Unique-word overlap: 24.0%
- Three-word phrase overlap: 1.4%
- Five-word phrase overlap: 0.3%

Interpretation:

LemonBeam is producing a meaningfully different artifact, not just another version of the same vanilla guide. LemonBeam is more compact structurally, follows a fixed six-section format, and includes source citations and uncertainty reporting.

## Citation Accuracy

### Vanilla ChatGPT

The vanilla guides were requested to include inline citations, but none of the five outputs actually included usable inline citations.

Measured result:

- 5 vanilla runs evaluated
- 5 produced readable guides
- 0 produced file-and-line citations
- 0 produced bracket-style source references outside code blocks
- 0 citation targets could be checked

Citation compliance rate: **0%**

Because no citations were present, citation accuracy cannot really be measured. The failure happened one step earlier: the model did not provide citations at all.

This is important for the product comparison. Prompting vanilla ChatGPT to cite sources is not enough to guarantee source-backed output.

### LemonBeam

LemonBeam produced 71 file-and-line citations.

Automated citation target check against the local TypeORM checkout:

- Total line-range citations: 71
- Valid line-range citations: 68
- Invalid line-range citations: 3
- Line-range citation target validity: **95.8%**

Unique citation target check:

- Unique line-range citation targets: 54
- Valid unique targets: 51
- Invalid unique targets: 3
- Unique target validity: **94.4%**

The 8 unique non-line bracket references, such as `package.json`, `tsconfig.json`, and `.github/workflows/tests-windows.yml`, all resolved to real files.

Invalid LemonBeam citation targets found:

- `docs/releases/1.0/02-upgrading-from-0.3.md:411-425`
  - Actual file appears to be `docs/docs/releases/1.0/02-upgrading-from-0.3.md`
- `test/functional/persistence/persistence-basic-functionality.test.ts:19-19`
  - Actual nearby file appears to be `test/functional/persistence/basic-functionality/persistence-basic-functionality.test.ts`
- `test/functional/persistence/persistence-basic-functionality/persistence-basic-functionality.test.ts:19-19`
  - Actual nearby file appears to be `test/functional/persistence/basic-functionality/persistence-basic-functionality.test.ts`

This means LemonBeam's citation system is useful but needs validation hardening. It is much better than no citations, but launch claims should not imply 100% citation accuracy yet.

## Factual Accuracy Spot Check

Even without citations, the vanilla guides were not obviously low-quality. Major factual claims were mostly supported by the local TypeORM repo:

- `package.json` confirms TypeORM version `1.1.1`.
- `package.json` confirms `pnpm@10.34.5`.
- `package.json` confirms Node support: `^20.19.0 || ^22.13.0 || >=24.11.0`.
- `package.json` confirms scripts including `compile`, `test`, `test:fast`, `typecheck`, `lint`, `format`, `package`, `docs:dev`, and `watch`.
- `DEVELOPER.md` confirms `pnpm install`.
- `DEVELOPER.md` confirms copying `ormconfig.sample.json` to `ormconfig.json`.
- `DEVELOPER.md` confirms `docker compose up postgres-17`.
- `DEVELOPER.md` confirms `pnpm run compile -- --watch` plus `pnpm run test:fast`.
- `DEVELOPER.md` confirms the common test helper pattern using `createTestingConnections`, `reloadTestingDatabases`, and `closeTestingConnections`.
- `docs/README.md` confirms the docs site uses `pnpm run start` and `pnpm run build`.

So the problem with vanilla ChatGPT is not that the generated guides are useless or mostly wrong. The problem is that they are not auditable. A reader cannot tell which claims came from which files without manually re-checking the repo.

## Structural Differences

### Vanilla ChatGPT

The vanilla guides varied in structure. They often included useful extra sections such as:

- Prerequisites
- Setup
- Running the project locally
- Project structure
- Testing
- Code-quality checks
- Useful development commands
- Recommended first-day workflow
- Common onboarding gotchas

These sections are helpful for a human reader, but they are not consistent across all five runs. Some headings are also malformed as H2s when they should probably be paragraphs, for example full explanatory sentences promoted to headings.

### LemonBeam

LemonBeam followed the fixed product format:

- Project Overview
- Setup / Installation
- Running Locally
- Project Structure
- Testing
- Uncertainties and Missing Information

That consistency is important for a product. It makes the output easier to test, compare, render, and improve over time.

## Advantages and Disadvantages

### Vanilla ChatGPT Advantages

- Produces readable onboarding prose.
- Often includes practical workflow details.
- Gives helpful first-day contributor advice.
- Does not require a custom app, scanner, chunker, or retrieval layer.
- Good for informal personal exploration.

### Vanilla ChatGPT Disadvantages

- Failed to produce inline citations in all five citation-requested runs.
- No file-and-line source trail.
- No commit SHA or repository metadata in the output.
- No skipped-file reporting.
- No excluded-evidence reporting.
- No fixed product format.
- Hard to audit automatically.
- Hard to know whether a claim came from the repo, general model knowledge, or inference.

### LemonBeam Advantages

- Produces a fixed guide structure.
- Provides file-and-line citations.
- Records repository metadata and commit SHA.
- Reports skipped files.
- Reports excluded evidence.
- Uses chunking and token budgeting instead of relying on a full raw repo dump.
- Better supports a product promise of source-backed guide generation.

### LemonBeam Disadvantages

- More engineering complexity.
- Current TypeORM run reports 42 files that could not be analyzed because of `Invalid argument`.
- Current uncertainty section is noisy.
- Excluded chunks are repetitive and should be grouped by file.
- Citation path validation is not perfect: 3 of 71 line-range citations did not resolve exactly.
- Guide quality depends on the scanner, chunkers, classifier, scoring rules, and token budgets.

## Product Conclusion

If the question is, "Can vanilla ChatGPT generate a readable TypeORM onboarding guide?", the answer is yes.

If the question is, "Is vanilla ChatGPT enough to replace LemonBeam?", the answer from this test is no.

The reason is citations. Even when asked for inline citations, vanilla ChatGPT produced zero usable citation references across five runs. LemonBeam produced a guide with 71 file-and-line citations, and 95.8% of those citation targets resolved correctly against the repository snapshot.

That gives LemonBeam a clear product advantage:

> LemonBeam is not just a guide writer. It is an evidence-selection and citation system for repository-backed documentation.

That is the differentiation worth emphasizing.

## Launch Recommendations

Before launch, the highest-value improvements are:

1. Fix the `Invalid argument` scan/chunk failure affecting 42 TypeORM files.
2. Add or strengthen citation validation so malformed paths cannot reach the final guide.
3. Group excluded evidence by file instead of listing repeated chunks.
4. Make the uncertainty section distinguish clearly between:
   - files that could not be analyzed
   - evidence analyzed but excluded by token budget
5. Keep positioning LemonBeam around trust, citations, and repeatability, not just prettier prose.

## Bottom Line

Vanilla ChatGPT is a capable prose generator.

LemonBeam is the better product for source-backed contributor guides because it provides the evidence trail that vanilla ChatGPT failed to produce, even when explicitly asked.
