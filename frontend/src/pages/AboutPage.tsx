function AboutPage() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-16 text-left w-full text-zinc-100">
        <h1 className="text-4xl font-semibold mb-6 text-white">
            About LemonBeam & How It Works
        </h1>
        <p className="text-zinc-300 text-lg mb-8">
            LemonBeam shines a fresh beam of light on an unfamiliar codebase —
            refracted into a clear, reliable guide. It is an open-source AI
            developer tool designed to eliminate onboarding friction.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-[var(--color-yellow)]">
            The Repository Analysis Pipeline
        </h2>
        <p className="text-zinc-300 mb-6">
            When you submit a repository, the backend executes a rigorous
            multi-stage pipeline to parse, evaluate, and synthesize the
            documentation:
        </p>

        <ol className="list-decimal list-inside space-y-4 text-zinc-300 bg-white/5 border border-white/10 p-6 rounded-xl">
            <li>
            <strong className="text-white">Discover:</strong> Walks the repository
            tree, applying ignore rules to skip dependencies, build output, and
            clutter.
            </li>
            <li>
            <strong className="text-white">Classify:</strong> Categorizes each
            file by purpose (source, test, docs, config, scripts, types) using
            path heuristics.
            </li>
            <li>
            <strong className="text-white">Chunk:</strong> Parses code and
            documentation using Tree-sitter and markdown strategies into
            normalized chunks.
            </li>
            <li>
            <strong className="text-white">Select Evidence:</strong> Estimates
            token costs and scores chunks against guide sections to optimize the
            context budget.
            </li>
            <li>
            <strong className="text-white">Score:</strong> Evaluates relevance and
            density of extracted context elements.
            </li>
            <li>
            <strong className="text-white">Generate:</strong> Coordinates LLM
            prompt execution via OpenRouter using your supplied API key.
            </li>
            <li>
            <strong className="text-white">Assemble Guide:</strong> Validates
            source citations, combines sections, and compiles uncertainty
            information into a final markdown guide.
            </li>
        </ol>
        </div>
    );
}

export default AboutPage;
