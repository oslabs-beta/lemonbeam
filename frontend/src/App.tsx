import { useState, type SyntheticEvent } from "react";
import Navbar from "./components/Navbar";
import LemonBeamLogo from "./components/LemonBeamLogo";
import ScanResults from "./components/ScanResults";

function App() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    scanId: string;
    guide: { markdown: string };
  } | null>(null);

  // Active tab state for the interactive tab switcher ("overview" | "cli" | "mcp")
  const [activeTab, setActiveTab] = useState<"overview" | "cli" | "mcp">(
    "overview",
  );

  // NOTE: BYOK uses an OpenRouter API key, not an OpenAI key directly — see
  // DECISIONS.md > "User-Supplied OpenRouter API Key (BYOK)".
  // TODO (BYOK): add const [apiKey, setApiKey] = useState("");
  // Render it as a type="password" input next to the repo URL input.
  // Never persist it (no localStorage/cookies) and never log it.
  // See PROJECT_BRIEF.md > User Flow and API_CONTRACT.md for the contract.
  //
  // Post-MVP stretch goal: a small dropdown for 3 LLM options, still routed
  // through the same OpenRouter key — see PROJECT_BRIEF.md > "Multiple LLM
  // Provider Options".

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();

    // Add this guard line to prevent double-clicks/duplicate submissions
    if (isLoading) return;
    if (!url.trim()) return;
    // TODO: wire this up to your backend once the pipeline endpoint exists.
    // TODO (BYOK): include openRouterApiKey in the POST /api/scans body:
    //   { repositoryUrl: url.trim(), openRouterApiKey: apiKey.trim() }
    // console.log("Submitted repo:", url.trim());

    setIsLoading(true);
    setErrorMessage(null);
    setScanResult(null);

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryUrl: (url || "").trim(),
          openRouterApiKey: (apiKey || "").trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data?.error?.message ||
          data?.message ||
          "An unexpected error occurred during the scan.";
        setErrorMessage(errorMsg);
        return;
      }

      setScanResult(data);
    } catch (error) {
      console.error("Network or parsing error:", error);
      setErrorMessage(
        "Network error: Failed to reach the server. Please check your connection.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-[var(--color-yellow)] selection:text-black">
      <Navbar
        onAboutClick={() => {
          setActiveTab("overview");
          document
            .getElementById("overview")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="flex-1 flex flex-col items-center w-full pb-24">
        {/* Hero Section */}
        <section
          id="home"
          className="mx-auto max-w-7xl px-6 pt-16 pb-12 flex flex-col items-center text-center w-full scroll-mt-20"
        >
          <div className="logo-container">
            <LemonBeamLogo />
          </div>

          <p className="mt-6 font-mono text-sm uppercase tracking-[0.16em] text-[var(--color-yellow)]">
            Open-source AI developer tool
          </p>

          <h1 className="mt-6 text-5xl font-semibold leading-tight md:text-7xl">
            <span className="text-white">Lemon</span>
            <span className="text-[var(--color-yellow)]">Beam</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-zinc-300">
            Shines a fresh beam of light on an unfamiliar codebase — refracted
            into a clear, reliable guide.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 w-full max-w-2xl flex flex-col gap-5 text-left"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* GitHub Repo URL Field */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label
                  htmlFor="repo-url"
                  className="text-xs font-medium uppercase tracking-wider text-zinc-300"
                >
                  GitHub Repository URL
                </label>
                <input
                  id="repo-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/example/project.git"
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[var(--color-yellow)]"
                />
              </div>

              {/* OpenRouter API Key Field */}
              <div className="w-full md:w-80 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="api-key"
                    className="text-xs font-medium uppercase tracking-wider text-zinc-300"
                  >
                    OpenRouter API Key
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--color-yellow)] hover:underline"
                  >
                    What's this? →
                  </a>
                </div>
                <input
                  id="api-key"
                  type="password"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[var(--color-yellow)]"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-1">
              <p className="text-sm text-[var(--color-yellow)] opacity-80 whitespace-nowrap">
                Public GitHub repositories only · API key is sent only for this
                request and is never stored
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto whitespace-nowrap rounded-lg px-6 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-yellow-pale), var(--color-yellow), var(--color-yellow-deep))",
                }}
              >
                {isLoading ? "Generating..." : "Generate →"}
              </button>
            </div>
          </form>

          {/* Display Error Message Clearly */}
          {errorMessage && (
            <div className="mt-6 w-full max-w-2xl rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-left text-sm text-red-400 shadow-lg">
              <span className="font-semibold">Error: </span> {errorMessage}
            </div>
          )}

          {/* Display Scan Results Component when data is returned */}
          {scanResult && scanResult.guide && (
            <div className="w-full max-w-5xl mt-8">
              <ScanResults guideMarkdown={scanResult.guide.markdown} />
            </div>
          )}
        </section>

        {/* Interactive Tab Switcher Navigation */}
        <div className="w-full max-w-5xl px-6 mt-4 mb-6">
          <div className="flex justify-center border-b border-white/10 pb-4 gap-2 md:gap-4">
            <button
              onClick={() => {
                setActiveTab("overview");
                document
                  .getElementById("overview")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "overview"
                  ? "bg-[var(--color-yellow)] text-black font-semibold shadow-md"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab("cli");
                document
                  .getElementById("cli")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "cli"
                  ? "bg-[var(--color-yellow)] text-black font-semibold shadow-md"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              CLI Guide
            </button>
            <button
              onClick={() => {
                setActiveTab("mcp");
                document
                  .getElementById("mcp")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "mcp"
                  ? "bg-[var(--color-yellow)] text-black font-semibold shadow-md"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              MCP Setup
            </button>
          </div>
        </div>

        {/* Tab Content Display (Always rendered in DOM, toggled via CSS hidden) */}
        <div className="w-full max-w-5xl px-6">
          {/* 1. Overview Tab */}
          <div
            id="overview"
            className={`bg-zinc-900/30 border border-white/10 rounded-2xl p-8 md:p-12 animate-fadeIn scroll-mt-32 ${
              activeTab === "overview" ? "block" : "hidden"
            }`}
          >
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>LemonBeam</span>{" "}
                  <span className="text-[var(--color-yellow)]">🍋</span>
                </h2>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  LemonBeam shines a fresh beam of light on an unfamiliar
                  codebase. It scans a public JavaScript or TypeScript GitHub
                  repository and generates a fixed-format contributor guide that
                  helps new developers understand the project more quickly.
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Rather than sending an entire repository directly to an LLM,
                  LemonBeam classifies repository files, creates meaningful
                  chunks, retrieves only the evidence relevant to each guide
                  section, and generates a source-backed guide with citations.
                </p>
              </div>

              <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  Why LemonBeam?
                </h3>
                <p className="text-zinc-400 text-sm">
                  Understanding an unfamiliar repository is difficult. Important
                  information is often scattered across READMEs, scripts,
                  configuration files, and source code.
                </p>
                <div className="space-y-2 text-sm text-zinc-300">
                  <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-yellow)] mb-2">
                    The Deterministic Approach:
                  </p>
                  <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
                    <li>Scanning and classifying the repository structure</li>
                    <li>Organizing targeted repository evidence</li>
                    <li>
                      Retrieving only information relevant to each section
                    </li>
                    <li>
                      Generating a repeatable, source-backed contributor guide
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 2. CLI Guide Tab */}
          <div
            id="cli"
            className={`bg-zinc-900/30 border border-white/10 rounded-2xl p-8 md:p-12 animate-fadeIn scroll-mt-32 ${
              activeTab === "cli" ? "block" : "hidden"
            }`}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                CLI Tool Usage
              </h2>
              <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                Analyze any local project directory directly from your terminal
                and generate an AI-powered documentation guide.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Step 1 */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white text-sm mb-1">
                  1. Clone, Build & Link
                </h3>
                <p className="text-zinc-400 text-xs mb-3">
                  Clone the repository, install dependencies, build the package,
                  and link it globally:
                </p>
                <div className="bg-black/60 border border-white/10 rounded-lg p-3 font-mono text-xs text-[var(--color-yellow)] space-y-1 mb-4">
                  <p>git clone https://github.com/oslabs-beta/lemonbeam.git</p>
                  <p>cd lemonbeam</p>
                  <p>npm install</p>
                  <p>npm run build</p>
                  <p>npm link</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white text-sm mb-1">
                  2. Run the CLI
                </h3>
                <p className="text-zinc-400 text-xs mb-3">
                  Navigate into the root of any project you want to scan and
                  execute using your OpenRouter API key flag:
                </p>
                <div className="bg-black/60 border border-white/10 rounded-lg p-3 font-mono text-xs text-[var(--color-yellow)] space-y-1 mb-4">
                  <p>npx lemonbeam --key your_openrouter_api_key_here</p>
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      "git clone https://github.com/oslabs-beta/lemonbeam.git\ncd lemonbeam\nnpm install\nnpm run build\nnpm link\n\n# Inside any target project directory:\nnpx lemonbeam --key your_openrouter_api_key_here",
                    )
                  }
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-lg transition text-zinc-200 border border-white/10 flex items-center justify-center gap-2"
                >
                  Copy CLI Setup Commands
                </button>
              </div>
            </div>
          </div>

          {/* 3. MCP Setup Tab */}
          <div
            id="mcp"
            className={`bg-zinc-900/30 border border-white/10 rounded-2xl p-8 md:p-12 animate-fadeIn scroll-mt-32 ${
              activeTab === "mcp" ? "block" : "hidden"
            }`}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                MCP Server Integration
              </h2>
              <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                Connect LemonBeam directly to your local AI assistant workspace
                (like Claude Desktop or Claude Code) via Model Context Protocol.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Step 1 */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white text-sm mb-1">
                  1. Build the Server
                </h3>
                <p className="text-zinc-400 text-xs mb-3">
                  Clone the repository, install dependencies, and build the
                  server locally:
                </p>
                <div className="bg-black/60 border border-white/10 rounded-lg p-3 font-mono text-xs text-[var(--color-yellow)] space-y-1">
                  <p>npm install</p>
                  <p>npm run build</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white text-sm mb-1">
                  2. Get Your Credentials
                </h3>
                <ul className="text-zinc-400 text-xs space-y-2 list-disc list-inside">
                  <li>
                    <strong className="text-zinc-200">
                      OpenRouter API Key (Required):
                    </strong>{" "}
                    Get yours from{" "}
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-yellow)] hover:underline"
                    >
                      openrouter.ai/keys
                    </a>
                    .
                  </li>
                  <li>
                    <strong className="text-zinc-200">
                      GitHub Personal Access Token (Optional):
                    </strong>{" "}
                    Get yours from{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-yellow)] hover:underline"
                    >
                      github.com/settings/tokens
                    </a>{" "}
                    with zero scopes required. Increases rate limits from 60 to
                    5,000 requests/hour.
                  </li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white text-sm mb-1">
                  3. Add to Your MCP Client Config & Restart
                </h3>
                <p className="text-zinc-400 text-xs mb-3">
                  Add the block below to your Claude Desktop configuration file
                  (
                  <code className="text-[var(--color-yellow)]">
                    claude_desktop_config.json
                  </code>
                  ).
                  <span className="block mt-2 text-zinc-300 font-medium">
                    How to access your config file:
                  </span>
                  <span className="block mt-1">
                    <strong>macOS:</strong> Open Claude &gt; Settings &gt;
                    Developer &gt; Edit Config (or open{" "}
                    <code className="text-[var(--color-yellow)]">
                      ~/Library/Application
                      Support/Claude/claude_desktop_config.json
                    </code>
                    ).
                  </span>
                  <span className="block mt-1">
                    <strong>Windows:</strong> Open Settings &gt; Developer &gt;
                    Edit Config (or open{" "}
                    <code className="text-[var(--color-yellow)]">
                      %APPDATA%\Claude\claude_desktop_config.json
                    </code>
                    ).
                  </span>
                  <span className="block mt-2">
                    Use your absolute path and credentials, then{" "}
                    <strong className="text-zinc-200">
                      fully restart your AI tool
                    </strong>
                    :
                  </span>
                </p>
                <div className="bg-black/60 border border-white/10 rounded-lg p-3 font-mono text-xs text-[var(--color-yellow)] overflow-x-auto mb-4">
                  <pre>{`{\n  "mcpServers": {\n    "lemonbeam": {\n      "command": "node",\n      "args": ["/absolute/path/to/lemonbeam/dist/mcp/index.js"],\n      "env": {\n        "OPENROUTER_API_KEY": "your_key_here",\n        "GITHUB_TOKEN": "your_token_here"\n      }\n    }\n  }\n}`}</pre>
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      '{\n  "mcpServers": {\n    "lemonbeam": {\n      "command": "node",\n      "args": ["/absolute/path/to/lemonbeam/dist/mcp/index.js"],\n      "env": {\n        "OPENROUTER_API_KEY": "your_key_here",\n        "GITHUB_TOKEN": "your_token_here"\n      }\n    }\n  }\n}',
                    )
                  }
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-lg transition text-zinc-200 border border-white/10 flex items-center justify-center gap-2 mb-3"
                >
                  Copy MCP Config
                </button>
                <p className="text-zinc-400 text-xs italic">
                  Once restarted, ask your assistant to use the{" "}
                  <code className="text-[var(--color-yellow)]">
                    generate_onboarding_guide
                  </code>{" "}
                  tool on any public GitHub URL!
                </p>
              </div>
            </div>
          </div>

          {/* Back to Top Button Directly Underneath the Box */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition"
            >
              Back to Top ↑
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
