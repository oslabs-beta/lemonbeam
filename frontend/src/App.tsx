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
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          document.getElementById(tab)?.scrollIntoView({ behavior: "smooth" });
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

        {/* Tab Content Display */}
        <div className="w-full max-w-5xl px-6">
          {/* 1. Overview Tab */}
          {activeTab === "overview" && (
            <div
              id="overview"
              className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8 md:p-12 animate-fadeIn scroll-mt-32"
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
                    repository and generates a fixed-format contributor guide
                    that helps new developers understand the project more
                    quickly.
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
                    Understanding an unfamiliar repository is difficult.
                    Important information is often scattered across READMEs,
                    scripts, configuration files, and source code.
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
          )}

          {/* 2. CLI Guide Tab */}
          {activeTab === "cli" && (
            <div
              id="cli"
              className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8 md:p-12 animate-fadeIn scroll-mt-32"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                  CLI Tool Usage
                </h2>
                <p className="text-zinc-400 text-sm">
                  Run your code analysis interactively in any project directory.
                </p>
              </div>

              <div className="max-w-2xl mx-auto bg-zinc-900/50 border border-white/10 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[var(--color-yellow)] text-lg">
                      💻
                    </span>
                    <h3 className="font-semibold text-lg text-white">
                      CLI Quick Start
                    </h3>
                  </div>
                  <p className="text-zinc-400 text-sm mb-4">
                    Configure your .env file with your credentials, link the
                    package locally, and execute the command.
                  </p>
                  <div className="bg-black/60 border border-white/10 rounded-lg p-4 font-mono text-xs text-[var(--color-yellow)] overflow-x-auto mb-4 space-y-1">
                    <p className="text-zinc-500">
                      # 1. Add OPENROUTER_API_KEY to .env
                    </p>
                    <p>npm link lemonbeam</p>
                    <p className="text-zinc-400">npx lemonbeam</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      "npm link lemonbeam\nnpx lemonbeam",
                    )
                  }
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-lg transition text-zinc-200 border border-white/10 flex items-center justify-center gap-2"
                >
                  Copy CLI Commands
                </button>
              </div>
            </div>
          )}

          {/* 3. MCP Setup Tab */}
          {activeTab === "mcp" && (
            <div
              id="mcp"
              className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8 md:p-12 animate-fadeIn scroll-mt-32"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                  MCP Server Integration
                </h2>
                <p className="text-zinc-400 text-sm">
                  Connect LemonBeam directly to your local AI assistant
                  workspace.
                </p>
              </div>

              <div className="max-w-2xl mx-auto bg-zinc-900/50 border border-white/10 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[var(--color-yellow)] text-lg">
                      🔌
                    </span>
                    <h3 className="font-semibold text-lg text-white">
                      Configuration Setup
                    </h3>
                  </div>
                  <p className="text-zinc-400 text-sm mb-4">
                    Configure your AI coding assistant (like Claude Desktop) to
                    run LemonBeam locally via Model Context Protocol.
                  </p>
                  <div className="bg-black/60 border border-white/10 rounded-lg p-4 font-mono text-xs text-[var(--color-yellow)] overflow-x-auto mb-4">
                    <pre>{`{\n  "mcpServers": {\n    "lemonbeam": {\n      "command": "node",\n      "args": ["/absolute/path/to/lemonbeam/dist/mcp/index.js"],\n      "env": {\n        "OPENROUTER_API_KEY": "your_key_here",\n        "GITHUB_TOKEN": "your_token_here"\n      }\n    }\n  }\n}`}</pre>
                  </div>
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      '{\n  "mcpServers": {\n    "lemonbeam": {\n      "command": "node",\n      "args": ["/absolute/path/to/lemonbeam/dist/mcp/index.js"],\n      "env": {\n        "OPENROUTER_API_KEY": "your_key_here",\n        "GITHUB_TOKEN": "your_token_here"\n      }\n    }\n  }\n}',
                    )
                  }
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-lg transition text-zinc-200 border border-white/10 flex items-center justify-center gap-2"
                >
                  Copy MCP Config
                </button>
              </div>
            </div>
          )}

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
