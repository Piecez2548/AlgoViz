import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { GitCompareArrows, Menu, Network, X } from "lucide-react";

import "../../algoviz.css";

const navItems = [
  { to: "", label: "Learn", end: true },
  { to: "/search", label: "Search" },
  { to: "/pathfinding", label: "Pathfinding" },
  { to: "/sorting", label: "Sorting" },
  { to: "/compare", label: "Compare" },
];

export default function AlgoVizLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "AlgoViz · Interactive Algorithm Lab";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="algoviz-app">
      <a className="algoviz-skip-link" href="#algoviz-main">Skip to content</a>
      <header className="algoviz-header">
        <div className="algoviz-header-inner">
          <Link className="algoviz-brand" to="" aria-label="AlgoViz home">
            <span className="algoviz-brand-mark" aria-hidden="true"><Network size={18} strokeWidth={2.5} /></span>
            <span>AlgoViz</span>
          </Link>

          <nav className="algoviz-desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => isActive ? "algoviz-nav-link is-active" : "algoviz-nav-link"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="algoviz-header-actions">
            <span className="algoviz-status-pill"><span aria-hidden="true" /> Client-side lab</span>
            <button
              type="button"
              className="algoviz-menu-button"
              aria-expanded={menuOpen}
              aria-controls="algoviz-mobile-nav"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="algoviz-mobile-nav" className="algoviz-mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => isActive ? "algoviz-nav-link is-active" : "algoviz-nav-link"}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="algoviz-main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="algoviz-footer">
        <span>AlgoViz interactive labs · deterministic steps</span>
        <span className="algoviz-footer-note"><GitCompareArrows size={15} aria-hidden="true" /> Built for understanding</span>
      </footer>
    </div>
  );
}
