// import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
      <a
        href="#"
        className="flex items-center gap-2 font-semibold text-lg text-white"
      >
        Lemon<span className="text-[var(--color-yellow)]">Beam</span>
      </a>
      <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
        <a
          href="#"
          className="hover:text-[var(--color-yellow)] transition-colors"
        >
          Home
        </a>
        <a
          href="#how-it-works"
          className="hover:text-[var(--color-yellow)] transition-colors"
        >
          About / How it Works
        </a>
      </nav>
    </header>
  );
}

export default Navbar;