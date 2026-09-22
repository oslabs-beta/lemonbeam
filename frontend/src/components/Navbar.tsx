interface NavbarProps {
  onAboutClick: () => void;
}

function Navbar({ onAboutClick }: NavbarProps) {
  return (
    <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex items-center gap-2 font-semibold text-lg text-white hover:opacity-80 transition-opacity cursor-pointer"
      >
        Lemon<span className="text-[var(--color-yellow)]">Beam</span>
      </button>
      <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
        <button
          type="button"
          onClick={onAboutClick}
          className="hover:opacity-80 transition-opacity cursor-pointer text-white font-semibold text-base"
        >
          About <span className="text-[var(--color-yellow)]">LemonBeam</span>
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
