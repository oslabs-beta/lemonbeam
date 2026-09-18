// Exercises the MCP server's one tool (generate_onboarding_guide) through a
// real, in-process MCP client/server handshake (InMemoryTransport) - proving
// the tool is discoverable and shaped correctly, not just that buildServer()
// doesn't throw. runScan is mocked so no real GitHub/OpenRouter calls happen.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { runScan } from "../../../backend/src/pipelineManager.ts";
import { buildServer } from "../../../mcp/index.ts";

vi.mock("../../../backend/src/pipelineManager.ts", () => ({
  runScan: vi.fn(),
}));

const openRouterApiKey = "test-api-key";

async function connectedClient() {
  const server = buildServer(openRouterApiKey);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "test-client", version: "0.0.1" });

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return client;
}

describe("generate_onboarding_guide tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is the only tool exposed, and requires only repositoryUrl", async () => {
    const client = await connectedClient();

    const { tools } = await client.listTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("generate_onboarding_guide");
    expect(tools[0].inputSchema.required).toEqual(["repositoryUrl"]);
    expect(tools[0].inputSchema.properties).not.toHaveProperty(
      "openRouterApiKey",
    );
    expect(tools[0].inputSchema.properties).not.toHaveProperty("githubToken");
  });

  it("calls runScan with the given repositoryUrl and this server's own OpenRouter key", async () => {
    vi.mocked(runScan).mockResolvedValueOnce({
      scanId: "scan_test",
      repository: {
        owner: "example",
        name: "project",
        url: "https://github.com/example/project",
        defaultBranch: "main",
        commitSha: "abc123",
      },
      guide: { markdown: "# Example Guide" },
    });

    const client = await connectedClient();

    const result = await client.callTool({
      name: "generate_onboarding_guide",
      arguments: { repositoryUrl: "https://github.com/example/project" },
    });

    expect(runScan).toHaveBeenCalledWith({
      repositoryUrl: "https://github.com/example/project",
      openRouterApiKey,
    });
    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([{ type: "text", text: "# Example Guide" }]);
  });

  it("returns an error result instead of throwing when the scan fails", async () => {
    vi.mocked(runScan).mockRejectedValueOnce(
      new Error("repository not found"),
    );

    const client = await connectedClient();

    const result = await client.callTool({
      name: "generate_onboarding_guide",
      arguments: { repositoryUrl: "https://github.com/example/missing" },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "Scan failed: repository not found" },
    ]);
  });

  it("rejects a non-URL repositoryUrl before runScan is ever called", async () => {
    const client = await connectedClient();

    // The SDK validates arguments against the Zod schema itself and returns
    // a normal isError result -- it does not throw at the protocol level.
    const result = await client.callTool({
      name: "generate_onboarding_guide",
      arguments: { repositoryUrl: "not-a-url" },
    });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toMatch(
      /invalid/i,
    );
    expect(runScan).not.toHaveBeenCalled();
  });
});
