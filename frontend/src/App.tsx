import { useState, type SyntheticEvent } from "react";
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
        const errorMsg = data?.error?.message || data?.message || "An unexpected error occurred during the scan.";
        setErrorMessage(errorMsg);
        return;
      }

      setScanResult(data);
    } catch (error) {
      console.error("Network or parsing error:", error);
      setErrorMessage("Network error: Failed to reach the server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-6 py-24 flex flex-col items-center text-center">
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

        <p className="mt-6 max-w-2xl text-lg">
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
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[var(--color-yellow)]"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-1">
            {/* THIS PARAGRAPH TEXT WAS UPDATED TO YELLOW AND SLIGHTLY LARGER */}
            <p className="text-sm text-[var(--color-yellow)] opacity-80">
              Public GitHub repositories only · API key is never stored
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
          <ScanResults guideMarkdown={scanResult.guide.markdown} />
        )}
      </section>
    </main>
  );
}

export default App;
