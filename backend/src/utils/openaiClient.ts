// Builds a per-request OpenRouter client using the user-supplied BYOK key —
// never a shared server-side key. See DECISIONS.md > "User-Supplied
// OpenRouter API Key (BYOK)".
//
// OpenRouter exposes an OpenAI-compatible API, so this uses the official
// `openai` SDK pointed at OpenRouter's base URL instead of a separate
// OpenRouter-specific client.
//
// Used by orchestration/generateGuide.ts. For the MVP, that's one client
// used for the single combined generation call; the five-task stretch goal
// would reuse the same client across five parallel calls (see DECISIONS.md
// > "One Combined Generation Call for the MVP, Five Tasks as a Stretch
// Goal").
//
// TODO:
// - export a way to validate the key against OpenRouter itself (e.g. a
//   cheap models.list() call) so we can fail fast with 401
//   LLM_AUTHENTICATION_FAILED before running the full guide generation
//   pipeline
// - never log the key, never attach it to a thrown Error
import OpenAI from "openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// MVP: every scan is routed to this one fixed OpenAI model via OpenRouter —
// no user-facing model choice yet (see DECISIONS.md > "User-Supplied
// OpenRouter API Key (BYOK)").
const MVP_MODEL = "openai/gpt-5";

// Post-MVP stretch goal, first sprint after the MVP (see PROJECT_BRIEF.md >
// "Multiple LLM Provider Options"): a frontend dropdown will let the user
// pick one of three models, all still reached through the same OpenRouter
// key. Only MVP_MODEL is decided so far — the other two are an open team
// decision. Not wired to anything yet; the MVP always uses MVP_MODEL above.
const POST_MVP_MODEL_OPTIONS = [
  MVP_MODEL,
  // TODO: add the other two models once the team decides.
] as const;

// Builds a fresh client for one request's user-supplied key. Do NOT create
// a module-level/shared client, and do not fall back to
// process.env.OPENROUTER_API_KEY except as the local-dev convenience
// explicitly called out in ARCHITECTURE.md.
function getOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });
}

export { getOpenRouterClient, MVP_MODEL, POST_MVP_MODEL_OPTIONS };
