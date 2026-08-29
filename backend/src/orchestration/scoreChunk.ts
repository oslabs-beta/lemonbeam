// backend/src/orchestration/scoreChunk.ts
//
// The rule-based rubric scoring one chunk against every guide section, via
// filePurpose, chunkKind, and (for Markdown) heading text. A chunk can
// legitimately be relevant to more than one section at once — package.json
// supports Setup, Running, and Testing — so this returns a score per
// section rather than bucketing a chunk into a single best-fit section (see
// OSP-50). Fully rule-based and deterministic: no embeddings, no fuzzy/ML
// matching.
import type { Chunk } from "../types/chunk.js";
import type { GuideSectionId } from "./guideSections.js";
import type { ScoreChunkForSections } from "./budgetChunkPerSection.js";

// Markdown heading-keyword patterns, so a section's relevance is judged by
// what it's actually about (its heading text), not just filePurpose: "docs"
// alone — a README's "Installation" heading and its "Architecture" heading
// are both docs, but relevant to different guide sections.
const HEADING_KEYWORDS: Partial<Record<GuideSectionId, RegExp>> = {
    setup: /setup|set\s*up|install|prerequisite|requirement|configur/i,
    running: /run|start|dev|launch|usage/i,
    testing: /test/i,
    structure: /structure|folder|architecture|layout|organi[sz]/i,
};

// chunkName values that suggest a source/types chunk is likely an
// application entry point, worth surfacing in Overview as well as
// Structure.
const ENTRY_POINT_NAMES = /^(app|index|main|server)$/i;

const scoreChunk: ScoreChunkForSections = (chunk: Chunk) => {
    const scores: Record<GuideSectionId, number> = {
        overview: 0,
        setup: 0,
        running: 0,
        structure: 0,
        testing: 0,
    };

    const isTestChunk =
        chunk.filePurpose === "test" ||
        chunk.chunkKind === "test_suite" ||
        chunk.chunkKind === "test_case" ||
        chunk.chunkKind === "test_hook";
    if (isTestChunk) {
        scores.testing = 1;
    }

    if (chunk.chunkKind === "package_scripts") {
        scores.setup = 1;
        scores.running = 1;
        scores.testing = 1;
    }

    if (chunk.chunkKind === "dependencies") {
        scores.setup = 1;
    }

    if (chunk.chunkKind === "compiler_options" || chunk.chunkKind === "tool_config") {
        scores.setup = 1;
        scores.structure = 1;
    }

    if (chunk.filePurpose === "scripts") {
        scores.setup = 1;
        scores.running = 1;
    }

    if (chunk.filePurpose === "docs" && chunk.chunkKind === "markdown_section") {
        const heading = chunk.chunkName ?? "";
        let matchedAny = false;
        for (const [section, pattern] of Object.entries(HEADING_KEYWORDS) as [GuideSectionId, RegExp][]) {
            if (pattern.test(heading)) {
                scores[section] = 1;
                matchedAny = true;
            }
        }
        // A docs chunk whose heading doesn't match any section-specific
        // keyword is still worth surfacing somewhere rather than silently
        // dropped — general project docs default to Overview.
        if (!matchedAny) {
            scores.overview = 1;
        }
    }

    if (chunk.filePurpose === "source" || chunk.filePurpose === "types") {
        scores.structure = 1;
        if (chunk.chunkName && ENTRY_POINT_NAMES.test(chunk.chunkName)) {
            scores.overview = 1;
        }
    }

    // Every other combination (filePurpose: "unknown", chunkKind:
    // "text_block" or "unknown", and any combination not covered above)
    // intentionally falls through to the all-zero scores initialized above
    // — not a section is relevant, but the score is still explicitly
    // defined, never left undefined.
    return scores;
};

export { scoreChunk };
