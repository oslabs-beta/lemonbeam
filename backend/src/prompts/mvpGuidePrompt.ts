// MVP prompt builder — the ONE prompt used for the MVP's single combined
// LLM call. See DECISIONS.md > "One Combined Generation Call for the MVP,
// Five Tasks as a Stretch Goal" and orchestration/generateGuide.ts, which
// calls this file.
//
// This file replaces the five separate prompt files (overviewPrompt.ts,
// setupPrompt.ts, runningPrompt.ts, structurePrompt.ts, testingPrompt.ts)
// for the MVP only — those five are stretch-goal-only until "Five Separate
// Section-Generation Tasks" is built.
//
// TODO: build one prompt that, given the evidence retrieved across all
// five sections, instructs the model to:
// 1. write all five primary sections in the fixed order from
//    PROJECT_BRIEF.md > "Fixed Guide Format": Project Overview,
//    Setup / Installation, Running Locally, Project Structure, Testing
// 2. use only the supplied evidence — never invent file paths, commands,
//    dependencies, ports, or environment variables not present in it
//    (see DECISIONS.md > "Source-Backed Claims and Citation Validation")
// 3. include citations for claims, referencing the supplied source
//    identifiers (chunk IDs / file paths / line ranges), so
//    orchestration/generateGuide.ts can validate them afterward
// 4. clearly mark low-confidence or missing information rather than
//    guessing — this does NOT need to write the sixth "Uncertainties and
//    Missing Information" section itself; that section is assembled
//    programmatically from the skipped-files list (see DECISIONS.md >
//    "Skipped Files Are Not Fatal, and Are Reported"), not from this prompt
//
// This file should only build the prompt string/messages — it must not
// retrieve chunks or access the repository itself (see ARCHITECTURE.md >
// "Prompt Builders": prompt builders build prompts, they do not retrieve
// repository data). Evidence retrieval stays in
// orchestration/generateGuideSection.ts / db/chunkStore.ts.
export {}
