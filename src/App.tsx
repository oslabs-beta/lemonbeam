
import { useState, type FormEvent } from "react";

function LemonBeamLogo() {
  return (
    <svg
      className="lemonbeam-logo"
      width="120"
      height="112"
      viewBox="0 0 300 280"
      aria-hidden="true"
    >
      <defs>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <linearGradient id="beamSweep" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="white" stopOpacity="0" />
        <stop offset="45%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.85" />
        <stop offset="55%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </linearGradient>

      {/* soft glow behind the mark */}
      <ellipse
        cx="150"
        cy="150"
        rx="130"
        ry="120"
        fill="#F5D826"
        opacity="0.18"
        filter="url(#glow)"
      />

      <g filter="url(#glow)">
        <polygon points="150,20 132.86,54.29 167.14,54.29" fill="#FFFFFF" />
        <polygon
          points="132.86,54.29 167.14,54.29 184.29,88.57 115.71,88.57"
          fill="#FDF6B2"
        />
        <polygon
          points="115.71,88.57 184.29,88.57 201.43,122.86 98.57,122.86"
          fill="#FCEB6B"
        />
        <polygon
          points="98.57,122.86 201.43,122.86 218.57,157.14 81.43,157.14"
          fill="#F5D826"
        />
        <polygon
          points="81.43,157.14 218.57,157.14 235.71,191.43 64.29,191.43"
          fill="#E8C412"
        />
        <polygon
          points="64.29,191.43 235.71,191.43 252.86,225.71 47.14,225.71"
          fill="#D1A70C"
        />
        <polygon
          points="47.14,225.71 252.86,225.71 270,260 30,260"
          fill="#B8930A"
        />

        {/* right-facet shading for a faceted, dimensional look */}
        <polygon
          points="150,20 150,260 270,260"
          fill="#000000"
          opacity="0.15"
        />
        {/* center facet line */}
        <line
          x1="150"
          y1="20"
          x2="150"
          y2="260"
          stroke="#000000"
          strokeOpacity="0.15"
          strokeWidth="1"
        />
      </g>

      <polygon
        className="beam-sweep"
        points="150,20 270,260 30,260"
        fill="url(#beamSweep)"
        opacity="0.7"
      />
      
    </svg>
  );
}

function App() {
  const [url, setUrl] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    // TODO: wire this up to your backend once the pipeline endpoint exists.
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
