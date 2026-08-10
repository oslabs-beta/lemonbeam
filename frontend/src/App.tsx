import { useState, type FormEvent } from "react";
import LemonBeamLogo from "./components/LemonBeamLogo";

function App() {
  const [url, setUrl] = useState("");
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    // TODO: wire this up to your backend once the pipeline endpoint exists.
    // TODO (BYOK): include openRouterApiKey in the POST /api/scans body:
    //   { repositoryUrl: url.trim(), openRouterApiKey: apiKey.trim() }
    console.log("Submitted repo:", url.trim());
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

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl">
          <div className="flex gap-3">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/example/project.git"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[var(--color-yellow)]"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg px-6 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-yellow-pale), var(--color-yellow), var(--color-yellow-deep))",
              }}
            >
              Generate →
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Public GitHub repositories only
          </p>
        </form>
      </section>
    </main>
  );
}

export default App;
