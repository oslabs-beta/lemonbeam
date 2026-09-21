// MVP prompt builder — the ONE prompt used for the MVP's single combined
// LLM call. See DECISIONS.md > "One Combined Generation Call for the MVP,
// Five Tasks as a Stretch Goal" and orchestration/generateGuideSection.ts,
// which calls this file.
//
// This file replaces the five separate prompt files (overviewPrompt.ts,
// setupPrompt.ts, runningPrompt.ts, structurePrompt.ts, testingPrompt.ts)
// for the MVP only — those five are stretch-goal-only until "Five Separate
// Section-Generation Tasks" is built.
//
// Exported signature:
//   buildMvpGuidePrompt(chunks: Chunk[]): ChatCompletionMessageParam[]
// Returns a two-message array — a `system` message carrying the fixed
// instructions below, and a `user` message carrying the supplied evidence
// — for orchestration/generateGuideSection.ts to pass straight to
// client.chat.completions.create({ model, messages }). It returns a
// ChatCompletionMessageParam[] (from the `openai` package) rather than a
// plain string or a Responses-style { instructions, input } pair because
// orchestration/generateGuideSection.ts passes these messages straight to
// that chat-completions call.
//
// This file must not retrieve chunks or access the repository itself (see
// ARCHITECTURE.md > "Prompt Builders": prompt builders build prompts,
// they do not retrieve repository data). Evidence retrieval stays in
// orchestration/generateGuideSection.ts / db/chunkStore.ts.


import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Chunk } from "../types/chunk.js";
import { GUIDE_SECTIONS } from "../orchestration/guideSections.js";

// States explicitly that the model has no repository access beyond the
// evidence it's given — this is what the evidenceRules/citationFormat
// instructions below actually rely on to stop the model from filling gaps
// with "typical" answers instead of admitting it doesn't know.
const role = `You are a technical writer producing an onboarding guide for a software repository, using only the repository evidence provided to you below. You do not have access to the repository yourself — only the evidence chunks in the user message.`;

// Titles are interpolated from GUIDE_SECTIONS rather than hardcoded, so
// this prompt can't silently drift out of sync if the fixed section order
// ever changes there — guideSections.ts stays the single source of truth
// (see the citation rules below and guideSections.ts's own header comment).
// The description under each heading is copied from PROJECT_BRIEF.md >
// "Fixed Guide Format", not invented here.
const sectionRequirements = `
Write a guide with exactly these five sections, in this exact order, using these exact headings:

1. ## ${GUIDE_SECTIONS[0].title}
   What the repository appears to do, what kind of project it is, the main technologies visible in the repository, and the likely entry points.

2. ## ${GUIDE_SECTIONS[1].title}
   Prerequisites, package manager, dependency installation, environment variables, and setup instructions found in the repository.

3. ## ${GUIDE_SECTIONS[2].title}
   Development commands, start and build scripts, visible ports, and the local development workflow.

4. ## ${GUIDE_SECTIONS[3].title}
   Important folders, major files, visible module boundaries, and how the codebase is organized.

5. ## ${GUIDE_SECTIONS[4].title}
   The test framework, test commands, test file locations, setup files, and visible testing patterns.

Do NOT write a sixth section. A sixth "Uncertainties and Missing Information" section is assembled separately, outside of your response.
`;

// Implements DECISIONS.md > "Source-Backed Claims and Citation Validation".
// The "even if it would be typical or expected" phrasing specifically
// targets the model's tendency to fill gaps with plausible-sounding
// defaults instead of admitting the evidence doesn't say — that failure
// mode is the whole reason this rule exists.
const evidenceRules = `
Use ONLY the evidence chunks supplied in the user message. Never invent file paths, commands, dependencies, ports, environment variables, or any other detail that is not present in the supplied evidence — even if it would be a typical or expected value for a project like this one.
`;

// Implements the source-backed citation decision in DECISIONS.md — this is
// the exact inline bracketed format that validateCitations, in
// orchestration/generateGuideSection.ts, parses and checks against the
// supplied chunks (a range spanning several chunks is reduced to the file
// path; any other citation that doesn't match is stripped). If this wording
// ever changes, whoever owns that validator needs to know, since its parsing
// logic depends on the model actually producing this exact shape.
//
// The prompt deliberately does NOT tell the model its citations are checked:
// a live moment scan with that sentence produced a leaked
// "[path --- invalid citation?]" note in the guide text.
//
// The validator only proves a citation points at supplied evidence, not that
// the cited lines back the claim. The "cite a chunk only if its text states
// the claim" rules below are the only defence against that second failure —
// an audit of five test-run guides found it was more common than invalid
// paths (e.g. citing an HTML page's error handler for "the entry points
// are...").
const citationFormat = `
Every claim in every section must be followed by a citation in this exact format: [filePath:startLine-endLine]

Example: "Install dependencies with \`npm install\` [package.json:6-10]."

Copy the file path and line range exactly as they appear in the "--- location ---" header of the evidence chunk you are citing. Do not adjust, narrow, extend, or combine ranges, and do not guess line numbers inside a chunk.

Cite a chunk only if its text itself states or clearly shows the claim. Do not cite a chunk just because it comes from the right folder or is the right kind of file, and do not reuse one citation to cover an unrelated claim. If no supplied chunk states a claim, do not cite an unrelated chunk to cover it — say the evidence does not show it instead.

If a claim is supported by more than one chunk, chain multiple citations directly after each other: [package.json:5-8][vite.config.ts:1-12]

Some evidence chunks have no line range. For those, cite the file path alone, with no colon or numbers: [package.json]

To say that a folder or file exists, or to describe what a folder contains, cite the file path alone — [filePath] — of a file you were shown from that folder. A line range adds nothing to that kind of claim.

Do not cite a file or line range that was not given to you in the evidence below.
`;

// First-draft version, not final — this could be more specific about what
// to do with uncertainty (e.g. explicitly telling the reader what
// additional evidence would resolve it), not just flagging that something
// is uncertain. Worth revisiting with more detail once this isn't
// blocking anyone.
const lowConfidenceHandling = `
If the supplied evidence is incomplete, ambiguous, or does not clearly answer part of a section, say so directly in that section rather than guessing — for example, "The evidence does not show which package manager this project uses." Say specifically what is unclear or missing, not just that something is uncertain.
`;

// A worked example is included because describing the citation rule alone
// is less reliable than also showing it done correctly — this is what
// actually teaches the model consistent formatting.
// It covers the four cases the rules above describe: a range citation, a
// path-only citation for a chunk with no range, a folder claim cited by
// path alone, and a claim the evidence doesn't support (stated as such,
// with no citation).
const example = `
EXAMPLE — study this to match the citation style and tone:

Evidence:
--- package.json:1-12 ---
{
  "name": "example-app",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build" },
  "dependencies": { "react": "^19.0.0" }
}

--- README.md ---
# example-app
A small React demo.

--- src/components/Button.tsx:1-14 ---
export function Button() { return <button>Click</button>; }

Correct excerpt from a guide:
Run \`npm run dev\` to start the local development server [package.json:1-12]. This project uses Vite as its build tool, based on the dev and build scripts [package.json:1-12]. It is a small React demo [README.md]. Reusable UI components live under \`src/components/\` [src/components/Button.tsx]. The evidence does not show which port the dev server listens on.
`;

// Deliberately repeats the most critical rule at the very end, not just
// at the top — restating a critical constraint at both ends of a long
// prompt helps counter instruction drift, where the model weighs earlier
// instructions less by the time it's generated a lot of text.
const closingReminder = `
Reminder: never invent evidence, cite every claim using the exact format above, and cite a chunk only when its text actually states the claim.
`;

const systemPrompt = [
  role,
  sectionRequirements,
  evidenceRules,
  citationFormat,
  lowConfidenceHandling,
  example,
  closingReminder,
].join("\n");

// Implements the DECISIONS.md fallback: chunks without a line range (some
// chunkers — fallback text blocks, whole-file config chunks — don't
// populate startLine/endLine; see types/chunk.ts) cite as `[filePath]`
// alone instead of `[filePath:start-end]`.
function getChunkLocation(chunk: Chunk): string {
  return chunk.startLine !== undefined && chunk.endLine !== undefined
    ? `${chunk.filePath}:${chunk.startLine}-${chunk.endLine}`
    : chunk.filePath;
}

// NOTE: this "--- location ---" block format is the same one shown to the
// model in the `example` constant above — if this formatting changes, the
// example needs to change with it, since that's the only place the model
// is actually taught what these blocks mean.
function formatChunkForEvidence(chunk: Chunk): string {
  return `--- ${getChunkLocation(chunk)} ---\n${chunk.text}`;
}

function buildUserMessageContent(chunks: Chunk[]): string {
  return chunks.map(formatChunkForEvidence).join("\n\n");
}

// Returns this specific two-message shape because
// orchestration/generateGuideSection.ts passes it straight to
// client.chat.completions.create(...) rather than converting a plain string
// or a Responses-style { instructions, input } pair.
function buildMvpGuidePrompt(chunks: Chunk[]): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildUserMessageContent(chunks) },
  ];
}

export { buildMvpGuidePrompt };
