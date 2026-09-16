function TeamPage() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-16 text-left w-full text-zinc-100">
        <h1 className="text-4xl font-semibold mb-6 text-white">
            The Engineering Team
        </h1>
        <p className="text-zinc-300 text-lg mb-8">
            LemonBeam is built by developers dedicated to high-performance tooling,
            clean developer experiences, and transparent AI utility architectures.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-[var(--color-yellow)]">
                Core Pipeline & Backend
            </h3>
            <p className="text-zinc-400 mt-2 text-sm">
                Focuses on robust repository discovery, SQLite temporary workspace
                handling, chunking, and OpenRouter orchestration.
            </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-[var(--color-yellow)]">
                Frontend & UI Experience
            </h3>
            <p className="text-zinc-400 mt-2 text-sm">
                Focuses on responsive dark-mode design, client-side routing, and
                real-time markdown guide rendering.
            </p>
            </div>
        </div>
        </div>
    );
}

export default TeamPage;
