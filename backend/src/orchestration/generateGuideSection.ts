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

export interface GenerateGuideSectionResult {
    text: string;
    citations: any[];
    uncertainty?: any;
}

async function generateGuideSection({
    openRouterApiKey,
    chunks,
}: GenerateGuideSectionOptions): Promise<GenerateGuideSectionResult> {
  // 1. Validate OpenRouter API key and build client fresh per request (never a shared singleton)
    if (!openRouterApiKey) {
        const authError = new Error("OpenRouter API key is missing");
        // Ensure the API key is never attached to or logged in the thrown error
        (authError as any).code = "LLM_AUTHENTICATION_FAILED";
        throw authError;
    }

    const client = getOpenRouterClient(openRouterApiKey);

  // 2. Retrieve relevant chunks directly from the in-memory chunk list passed in (MVP architecture)
    if (!chunks || chunks.length === 0) {
        throw new Error("No code chunks provided for guide generation.");
    }

    try {
        // 3. Build prompt and execute LLM call using MVP_MODEL
        const prompt = buildMvpGuidePrompt(chunks);

        const response = await client.chat.completions.create({
        model: MVP_MODEL,
        messages: [{ role: "user", content: prompt }],
        });

        const text = response.choices[0]?.message?.content || "";

        //! TODO: Validate citations according to your classmate's format instructions
        const citations: any[] = [];

        return {
        text,
        citations,
        };
    } catch (error: any) {
        // 4. Catch authentication errors from OpenRouter and rethrow mapped error code
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

export { generateGuideSection };
