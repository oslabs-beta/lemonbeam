// Shared single-generation-call process: retrieve evidence, build the
// matching prompt, make the LLM call, validate citations.
//
// FOR THE MVP: generateGuide.ts calls this ONCE, for the combined task
// covering all five sections (see DECISIONS.md > "One Combined Generation
// Call for the MVP, Five Tasks as a Stretch Goal"). This file's job doesn't
// really change shape for the MVP vs. the stretch goal — it's still "run
// one generation task" — the difference is how many times generateGuide.ts
// calls it (once now, five times in parallel later) and how broad the
// retrieved evidence and prompt are.
//
// TODO:
// - accept an OpenAI client (see utils/openaiClient.ts) built from the
//   request's openaiApiKey — construct it per-request, never as a shared
//   singleton
// - retrieve relevant chunks — for the MVP, read directly from the
//   in-memory chunk list passed in (see DECISIONS.md > "In-Memory Chunk
//   Storage for the MVP, SQLite as a Stretch Goal"); in the stretch goal,
//   query db/chunkStore.ts, scoped to one section
// - use the matching prompt builder from prompts/ — for the MVP, the one
//   general prompt file; in the stretch goal, the section-specific one
// - catch OpenAI authentication errors here and rethrow a specific error
//   pipelineManager.ts/routes/scans.ts can map to 401
//   LLM_AUTHENTICATION_FAILED
// - return the resulting text, citations, and any uncertainty information

import { getOpenRouterClient, MVP_MODEL } from "../utils/openaiClient.js";
import type { Chunk } from "../types/chunk.js";
import { buildMvpGuidePrompt } from "../prompts/mvpGuidePrompt.js";

export interface GenerateGuideSectionOptions {
    openRouterApiKey: string;
    chunks: Chunk[];
}

// Why a citation failed validation. `range_unverifiable` means the file was
// supplied but only as chunks with no line range (see types/chunk.ts), so
// there are no bounds to check the cited lines against.
export type CitationFailureReason =
    | "unknown_file"
    | "invalid_range"
    | "range_outside_chunks"
    | "range_unverifiable";

// One citation found in the model's output. Every citation is recorded, valid
// or not; invalid ones have already been stripped from the returned text.
// `downgraded` is set on a valid citation whose range was rewritten to the
// file path alone (see checkCitation); `raw`, `startLine` and `endLine` still
// show what the model originally wrote.
export interface ValidatedCitation {
    raw: string;
    filePath: string;
    startLine?: number;
    endLine?: number;
    valid: boolean;
    downgraded?: boolean;
    reason?: CitationFailureReason;
}

export interface GenerateGuideSectionResult {
    text: string;
    citations: ValidatedCitation[];
    uncertainty?: any;
}

// Fenced and inline code are matched first so brackets inside them (arr[0],
// JSON arrays) are consumed and left alone. The third alternative is a
// bracketed token not followed by "(" (a markdown link), allowing one level of
// nested brackets so paths like pages/[id].tsx still parse. The optional
// leading space lets a stripped citation take its preceding space with it.
const BRACKET_TOKEN =
    /```[\s\S]*?```|`[^`\n]*`|( ?)\[((?:[^\[\]\n]|\[[^\[\]\n]*\])+)\](?!\()/g;

// "path", "path:start" or "path:start-end", with stray inner whitespace
// tolerated. The path is everything before the range, so [] in it are fine.
const CITATION_BODY = /^\s*(\S+?)\s*(?::\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/;

// Same shape, but the path may contain spaces ("docs/how to.md:1-3"). That is
// too loose to trust on its own, since it would also match bracketed prose
// ("see docs/setup for details"), so parseCitationBody only accepts it when
// the path it captures is a file we supplied.
const SPACED_CITATION_BODY = /^\s*(.+?)\s*(?::\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/;

// Model output varies ("./src/a.ts", "/.npmrc"); the chunks never do.
function normalizeCitationPath(path: string): string {
    return path.replace(/^(?:\.\/|\/)+/, "");
}

function parseCitationBody(
    inner: string,
    knownPaths: Map<string, Chunk[]>,
): RegExpExecArray | null {
    const body = CITATION_BODY.exec(inner);
    if (body) return body;

    const spaced = SPACED_CITATION_BODY.exec(inner);
    return spaced && knownPaths.has(normalizeCitationPath(spaced[1]!)) ? spaced : null;
}

// A path-only bracket ("[optional]", "[1]", "[e.g.]") is ordinary prose unless
// it looks like a file or names a supplied one. Anything with a line range is
// always treated as a citation attempt.
function looksLikeFilePath(path: string, knownPaths: Map<string, Chunk[]>): boolean {
    return (
        path.includes("/") ||
        /\.[A-Za-z][A-Za-z0-9]*$/.test(path) ||
        knownPaths.has(path)
    );
}

type CitationCheck =
    | { outcome: "valid" }
    | { outcome: "downgrade" }
    | { outcome: "invalid"; reason: CitationFailureReason };

function checkCitation(
    filePath: string,
    startLine: number | undefined,
    endLine: number | undefined,
    chunksByPath: Map<string, Chunk[]>,
): CitationCheck {
    const fileChunks = chunksByPath.get(filePath);
    if (!fileChunks) return { outcome: "invalid", reason: "unknown_file" };

    // Path-only citations (the fallback for chunks without a line range) only
    // need the file to have been supplied.
    if (startLine === undefined || endLine === undefined) return { outcome: "valid" };

    if (startLine < 1 || endLine < startLine) return { outcome: "invalid", reason: "invalid_range" };

    const rangedChunks = fileChunks.filter(
        (chunk) => chunk.startLine !== undefined && chunk.endLine !== undefined,
    );
    if (rangedChunks.length === 0) return { outcome: "invalid", reason: "range_unverifiable" };

    const inside = (line: number) =>
        rangedChunks.some((chunk) => line >= chunk.startLine! && line <= chunk.endLine!);

    // A range inside a single supplied chunk is exactly the evidence the model
    // was shown.
    const contained = rangedChunks.some(
        (chunk) => startLine >= chunk.startLine! && endLine <= chunk.endLine!,
    );
    if (contained) return { outcome: "valid" };

    // The model often cites from the start of one chunk to the end of a later
    // one, naming lines in between that it never saw. Both ends are real
    // evidence, so keep the citation but reduce it to the file path, which is
    // always true and short enough for a reader to follow. A range that starts
    // or ends outside every chunk is not salvageable and is stripped.
    if (inside(startLine) && inside(endLine)) return { outcome: "downgrade" };

    return { outcome: "invalid", reason: "range_outside_chunks" };
}

// Parses every [filePath:startLine-endLine] / [filePath] citation out of the
// model's markdown and checks it against the chunks that were sent to the
// model (see DECISIONS.md > "Guide Citation Format"). Invalid citations are
// stripped from the returned text and recorded in `citations`; the claim they
// followed stays, uncited. A range that spans several supplied chunks is
// rewritten to the file path alone rather than stripped.
//
// This proves a citation points at supplied evidence. It does NOT prove the
// cited lines back the sentence they follow.
function validateCitations(
    text: string,
    chunks: Chunk[],
): { text: string; citations: ValidatedCitation[] } {
    const chunksByPath = new Map<string, Chunk[]>();
    for (const chunk of chunks) {
        const existing = chunksByPath.get(chunk.filePath);
        if (existing) existing.push(chunk);
        else chunksByPath.set(chunk.filePath, [chunk]);
    }

    const citations: ValidatedCitation[] = [];
    let anyDowngraded = false;

    let cleaned = text.replace(
        BRACKET_TOKEN,
        (match: string, leadingSpace: string | undefined, inner: string | undefined, offset: number) => {
            if (inner === undefined) return match; // a code span or fence

            const body = parseCitationBody(inner, chunksByPath);
            if (!body) return match;

            const filePath = normalizeCitationPath(body[1]!);
            const startLine = body[2] !== undefined ? Number(body[2]) : undefined;
            // "path:12" is lenient shorthand for "path:12-12"
            const endLine = body[3] !== undefined ? Number(body[3]) : startLine;

            if (startLine === undefined && !looksLikeFilePath(filePath, chunksByPath)) {
                return match;
            }

            const raw = match.slice(leadingSpace?.length ?? 0);
            const check = checkCitation(filePath, startLine, endLine, chunksByPath);
            citations.push({
                raw,
                filePath,
                ...(startLine !== undefined && { startLine, endLine }),
                valid: check.outcome !== "invalid",
                ...(check.outcome === "downgrade" && { downgraded: true }),
                ...(check.outcome === "invalid" && { reason: check.reason }),
            });

            if (check.outcome === "valid") return match;
            if (check.outcome === "downgrade") {
                anyDowngraded = true;
                return `${leadingSpace ?? ""}[${filePath}]`;
            }

            // Keep the space before a chained citation ("x [bad][good]"); drop
            // it otherwise so "x [bad]." doesn't become "x .".
            const next = text[offset + match.length];
            return next === "[" ? (leadingSpace ?? "") : "";
        },
    );

    // Several downgraded ranges in one file, chained, would otherwise leave
    // "[a.js][a.js]".
    if (anyDowngraded) {
        cleaned = cleaned.replace(/(\[[^\[\]\n]+\])(?:\1)+/g, "$1");
    }

    return { text: cleaned, citations };
}

async function generateGuideSection({
    openRouterApiKey,
    chunks,
}: GenerateGuideSectionOptions): Promise<GenerateGuideSectionResult> {
  // 1. Validate OpenRouter API key and build client fresh per request (never a shared singleton)
    if (!openRouterApiKey) {
        const authError = new Error("OpenRouter API key is missing");
        // Ensure the API key is never attached to or logged in the thrown error
        (authError as any).code = "MISSING_OPENROUTER_API_KEY";
        throw authError;
    }

    const client = getOpenRouterClient(openRouterApiKey);

  // 2. Retrieve relevant chunks directly from the in-memory chunk list passed in (MVP architecture)
    if (!chunks || chunks.length === 0) {
        throw new Error("No code chunks provided for guide generation.");
    }

    try {
        // 3. Build prompt and execute LLM call using MVP_MODEL
        const messages = buildMvpGuidePrompt(chunks);

        const response = await client.chat.completions.create({
        model: MVP_MODEL,
        messages,
        });

        const rawText = response?.choices?.[0]?.message?.content || "";

        // 4. Check every citation against the chunks actually sent to the model
        const { text, citations } = validateCitations(rawText, chunks);

        return {
        text,
        citations,
        };
    } catch (error: any) {
        // 5. Catch authentication errors from OpenRouter and rethrow mapped error code
        // Never log the API key or attach it to the error object
        if (
        error?.status === 401 ||
        error?.statusCode === 401 ||
        error?.message?.includes("unauthorized")
        ) {
        const authError = new Error("LLM authentication failed");
        (authError as any).code = "LLM_AUTHENTICATION_FAILED";
        throw authError;
        }

        throw error;
    }
}

export { generateGuideSection, validateCitations };
