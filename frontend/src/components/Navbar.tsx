// import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
      <a
        href="#home"
        className="flex items-center gap-2 font-semibold text-lg text-white"
      >
        Lemon<span className="text-[var(--color-yellow)]">Beam</span>
      </a>
      <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
        <a
          href="#home"
          className="hover:text-[var(--color-yellow)] transition-colors"
        >
          Home
        </a>
        <a
          href="#overview"
          className="hover:text-[var(--color-yellow)] transition-colors"
        >
          Overview
        </a>
        <a
          href="#cli"
          className="hover:text-[var(--color-yellow)] transition-colors"
        >
          CLI Guide
        </a>
        <a
          href="#mcp"
          className="hover:text-[var(--color-yellow)] transition-colors"
        >
          MCP Setup
        </a>
      </nav>
    </header>
  );
}

export default Navbar;