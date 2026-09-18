interface NavbarProps {
  activeTab: "overview" | "cli" | "mcp";
  onTabChange: (tab: "overview" | "cli" | "mcp") => void;
}

function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex items-center gap-2 font-semibold text-lg text-white hover:opacity-80 transition-opacity"
      >
        Lemon<span className="text-[var(--color-yellow)]">Beam</span>
      </button>
      <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
        <button
          onClick={() => onTabChange("overview")}
          className={`transition-colors text-left ${
            activeTab === "overview"
              ? "text-[var(--color-yellow)] font-semibold"
              : "hover:text-[var(--color-yellow)]"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onTabChange("cli")}
          className={`transition-colors text-left ${
            activeTab === "cli"
              ? "text-[var(--color-yellow)] font-semibold"
              : "hover:text-[var(--color-yellow)]"
          }`}
        >
          CLI Guide
        </button>
        <button
          onClick={() => onTabChange("mcp")}
          className={`transition-colors text-left ${
            activeTab === "mcp"
              ? "text-[var(--color-yellow)] font-semibold"
              : "hover:text-[var(--color-yellow)]"
          }`}
        >
          MCP Setup
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
