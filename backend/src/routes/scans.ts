
import { Router, Request, Response, NextFunction } from "express";
import { validateScanRequest } from "../utils/validateScanRequest.js";
import { runScan } from "../pipelineManager.js";

const router = Router();

/**
 * POST /scans
 * Main endpoint to initiate a repository scan, process code chunks,
 * generate the markdown guide via LLM, and handle expected error states.
 */
router.post(
    "/scans",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
          // Step 1: Validate the incoming request body (repository URL and API key format)
            const validation = validateScanRequest(req.body);
            if (!validation.isValid) {
                res.locals.status = validation.status || 400;
                res.locals.data = {
                error: {
                    code: validation.code || "INVALID_REQUEST_BODY",
                    message: validation.message || "Invalid request.",
                    ...(validation.details && { details: validation.details }),
                },
                };
                return next();
            }

            // Step 2: Extract verified credentials and parameters from the request body
            const { repositoryUrl, openRouterApiKey } = req.body as {
                repositoryUrl: string;
                openRouterApiKey: string;
            };

            // Step 3: Execute the scanning and guide generation pipeline
            const pipelineResult = await runScan({
                repositoryUrl,
                openRouterApiKey,
            });

            // Step 4: Return a successful 200 response matching the API contract
            res.locals.status = 200;
            res.locals.data = {
                scanId: pipelineResult.scanId,
                repository: pipelineResult.repository,
                guide: {
                markdown: pipelineResult.guide.markdown,
                },
            };
            return next();
            } catch (error: any) {

            // Step 5: Catch and map LLM Authentication Failures -> 401 Unauthorized
            if (
                error?.code === "LLM_AUTHENTICATION_FAILED" ||
                error?.status === 401 ||
                error?.status === 403 ||
                error?.statusCode === 401 ||
                error?.statusCode === 403
            ) {
                res.locals.status = 401;
                res.locals.data = {
                error: {
                    code: "LLM_AUTHENTICATION_FAILED",
                    message:
                    "The supplied OpenRouter API key was rejected. Check that the key is valid and has available quota.",
                },
                };
                return next();
            }

            // Map Payment Required / Insufficient Credits -> 402
            if (
                error?.status === 402 ||
                error?.status === 429 ||
                error?.statusCode === 402 ||
                error?.statusCode === 429 ||
                error?.message?.includes("credits") ||
                error?.message?.includes("quota")
            ) {
                res.locals.status = 402;
                res.locals.data = {
                error: {
                    code: "INSUFFICIENT_CREDITS",
                    message:
                    "Your OpenRouter account has run out of credits or hit a rate limit.",
                },
                };
                return next();
            }

            // Map Bad Request / Token Limit Exceeded -> 400
            if (
                error?.status === 400 ||
                error?.statusCode === 400 ||
                error?.message?.includes("maximum context length")
            ) {
                res.locals.status = 400;
                res.locals.data = {
                error: {
                    code: "REPOSITORY_TOO_LARGE",
                    message:
                    "The repository exceeds the maximum token context length supported by the model.",
                },
                };
                return next();
            }

            // Step 6: Catch and map External Service / LLM Failures -> 502 Bad Gateway
            if (
                error?.code === "LLM_SERVICE_ERROR" ||
                error?.code === "GITHUB_SERVICE_ERROR" ||
                error?.code === "Failed to download repository snapshot"
            ) {
                res.locals.status = 502;
                res.locals.data = {
                error: {
                    code: error?.code === "LLM_SERVICE_ERROR" ?
                    "LLM_SERVICE_ERROR" : 
                    "GITHUB_SERVICE_ERROR",
                    message:
                    "LemonBeam could not complete the scan because an external service failed.",
                },
                };
                return next();
            }

            // Step 7: Fallback Internal Server Error (500) - Safeguards against leaking secrets/keys
            res.locals.status = 500;
            res.locals.data = {
                error: {
                code: "INTERNAL_ERROR",
                message: "LemonBeam could not complete the scan.",
                },
            };
            return next();
        }
    },
);

export const scanRouter = router;