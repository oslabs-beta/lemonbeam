import { Link } from "react-router-dom";

function Navbar() {
    return (
        <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-lg text-white"
        >
            Lemon<span className="text-[var(--color-yellow)]">Beam</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link
            to="/"
            className="hover:text-[var(--color-yellow)] transition-colors"
            >
            Home
            </Link>
            <Link
            to="/about"
            className="hover:text-[var(--color-yellow)] transition-colors"
            >
            About / How it Works
            </Link>
            <Link
            to="/team"
            className="hover:text-[var(--color-yellow)] transition-colors"
            >
            Team
            </Link>
        </nav>
        </header>
    );
}

export default Navbar;