// Placeholder for validating the POST /api/scans request body.
// This will eventually check repositoryUrl and openRouterApiKey before any
// repository download or LLM call happens. See API_CONTRACT.md for the
// exact request shape and error codes.
//
// Called directly by routes/scans.ts, before it calls pipelineManager.ts —
// this is the one piece of request-shape validation that stays in routes/
// (see DECISIONS.md > "Thin Routes; `pipelineManager.ts` Sequences the
// Scan").
//
// TODO:
// - reject unknown fields -> 400 INVALID_REQUEST_BODY
// - require repositoryUrl -> 400 MISSING_REPOSITORY_URL / INVALID_REPOSITORY_URL
// - require openRouterApiKey as a non-empty string matching the expected
//   OpenRouter key format -> 400 MISSING_OPENROUTER_API_KEY / INVALID_OPENROUTER_API_KEY
// - never log or persist openRouterApiKey, even inside validation error messages

interface ValidationResult {
    isValid: boolean;
    status?: number;
    code?: string;
    message?: string;
    details?: string[];
}

function validateScanRequest(body: unknown): ValidationResult {
  // 1. Check if body exists and is an object
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
        isValid: false,
        status: 400,
        code: "INVALID_REQUEST_BODY",
        message: "The request body must be a valid JSON object.",
        };
    }

    const record = body as Record<string, unknown>;

    // 2. Reject unknown fields
    const allowedFields = ["repositoryUrl", "openRouterApiKey"];
    const unexpectedFields = Object.keys(record).filter(
        (field) => !allowedFields.includes(field),
    );

    if (unexpectedFields.length > 0) {
        return {
        isValid: false,
        status: 400,
        code: "INVALID_REQUEST_BODY",
        message: "The request contains unsupported fields.",
        details: unexpectedFields.map((field) => `Unexpected field: ${field}`),
        };
    }

    // 3. Validate repositoryUrl
    const repositoryURL = record.repositoryUrl;
    if (!repositoryURL) {
        return {
        isValid: false,
        status: 400,
        code: "MISSING_REPOSITORY_URL",
        message: "Provide a valid public GitHub repository URL.",
        };
    }

    if (typeof repositoryURL !== "string") {
        return {
        isValid: false,
        status: 400,
        code: "INVALID_REPOSITORY_URL",
        message: "Provide a valid public GitHub repository URL.",
        };
    }

    try {
        const parsedUrl = new URL(repositoryURL.trim());
        const hostname = parsedUrl.hostname.toLowerCase();
        const [, owner, repo] = parsedUrl.pathname.split("/");

        if (
        parsedUrl.protocol !== "https:" ||
        (hostname !== "github.com" && hostname !== "www.github.com") ||
        !owner ||
        !repo
        ) {
        return {
            isValid: false,
            status: 400,
            code: "INVALID_REPOSITORY_URL",
            message: "Provide a valid public GitHub repository URL.",
        };
        }
    } catch {
        return {
        isValid: false,
        status: 400,
        code: "INVALID_REPOSITORY_URL",
        message: "Provide a valid public GitHub repository URL.",
        };
    }

    // 4. Validate openRouterApiKey
    const openRouterApiKey = record.openRouterApiKey;
    if (!openRouterApiKey) {
        return {
        isValid: false,
        status: 400,
        code: "MISSING_OPENROUTER_API_KEY",
        message: "An OpenRouter API key is required.",
        };
    }

    if (typeof openRouterApiKey !== "string" || openRouterApiKey.trim() === "") {
        return {
        isValid: false,
        status: 400,
        code: "MISSING_OPENROUTER_API_KEY",
        message: "An OpenRouter API key is required.",
        };
    }

    // OpenRouter keys follow the standard "sk-or-v1-" format prefix
    const trimmedKey = openRouterApiKey.trim();
    if (!trimmedKey.startsWith("sk-or-v1-") || trimmedKey.length < 15) {
        return {
        isValid: false,
        status: 400,
        code: "INVALID_OPENROUTER_API_KEY",
        message: "The supplied OpenRouter API key format is invalid.",
        };
    }

    return { isValid: true };
}

export type { ValidationResult };
export { validateScanRequest };
