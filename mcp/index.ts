#!/usr/bin/env node
// LemonBeam MCP server entry point.
//
// Mirrors cli/index.ts: a thin, transport-specific wrapper around
// backend/src/pipelineManager.ts's runScan(). Express (routes/scans.ts),
// the CLI (cli/index.ts), and this file are the three callers of that one
// pipeline entry point — none of them own scan logic themselves.
import "dotenv/config";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runScan } from "../backend/src/pipelineManager.js";

// Builds the server and registers its one tool. Split out from main() so
// tests can exercise the tool handler directly (via an in-memory transport)
// without spawning a real process or touching real stdio.
function buildServer(openRouterApiKey: string): McpServer {
  const server = new McpServer({
    name: "lemonbeam",
    version: "1.0.0",
  });

  // Single tool, single argument: a public GitHub repository URL. No local
  // paths (a local path would let repo content the website never sees reach
  // the LLM and the calling agent's context - a deliberately deferred
  // decision, not an oversight) and no credentials as arguments (they would
  // appear in the client's own transcript; both keys come from this
  // process's environment instead, checked in main() below).
  server.registerTool(
    "generate_onboarding_guide",
    {
      description:
        "Scans a public GitHub repository and generates a source-backed contributor onboarding guide.",
      inputSchema: {
        repositoryUrl: z
          .string()
          .url()
          .describe(
            "URL of a public GitHub repository, e.g. https://github.com/owner/repo",
          ),
      },
    },
    async ({ repositoryUrl }) => {
      try {
        const result = await runScan({ repositoryUrl, openRouterApiKey });

        return {
          content: [{ type: "text", text: result.guide.markdown }],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text", text: `Scan failed: ${error?.message ?? error}` },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

async function main() {
  // OPENROUTER_API_KEY is a hard requirement: nothing in the pipeline can run
  // without it (see DECISIONS.md > "User-Supplied OpenRouter API Key (BYOK)").
  // Checked here, before the server starts listening, so a missing key fails
  // fast and clearly instead of surfacing partway through a scan.
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    console.error("❌ Error: OPENROUTER_API_KEY is required.");
    console.error(
      "Set it in this MCP server's env config (see README) before starting.",
    );
    process.exit(1);
  }

  // GITHUB_TOKEN is optional: github/validateRepository.ts already falls back
  // to unauthenticated GitHub API calls when it's unset (60 requests/hour
  // instead of 5,000 -- roughly 12 scans/hour instead of ~1,000). Warn, don't
  // block, since the pipeline works fine without it for light use.
  if (!process.env.GITHUB_TOKEN) {
    console.error(
      "⚠️  No GITHUB_TOKEN set — GitHub API calls are limited to 60 requests/hour " +
        "(roughly 12 scans/hour). Set GITHUB_TOKEN in this server's env config for " +
        "the 5,000/hour limit. See README for how to generate one.",
    );
  }

  const server = buildServer(openRouterApiKey);

  await server.connect(new StdioServerTransport());
}

// Only run the server when this file is executed directly (`node
// dist/mcp/index.js`), not when a test imports buildServer() from it.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildServer };
