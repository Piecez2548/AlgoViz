import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, GitCompareArrows, Menu, Network, X } from "lucide-react";

import "../../algoviz.css";

interface NavLeaf { to: string; label: string; end?: boolean }
interface NavGroup { label: string; items: NavLeaf[] }
const home: NavLeaf = { to: "", label: "Learn", end: true };
const compare: NavLeaf = { to: "/compare", label: "Compare" };
const groups: NavGroup[] = [
  { label: "Graphs", items: [{ to: "/search", label: "Search" }, { to: "/pathfinding", label: "Pathfinding" }, { to: "/spanning", label: "Spanning trees" }, { to: "/negative-weights", label: "Negative edges" }, { to: "/topological-sort", label: "Topological sort" }, { to: "/strongly-connected", label: "Components" }] },
  { label: "Sorting & searching", items: [{ to: "/sorting", label: "Sorting" }, { to: "/array-search", label: "Array search" }] },
  { label: "Flow & matching", items: [{ to: "/max-flow", label: "Max flow" }, { to: "/matching", label: "Matching" }] },
];

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "algoviz-nav-link is-active" : "algoviz-nav-link");

function GroupMenu({ group, open, onToggle, onClose }: { group: NavGroup; open: boolean; onToggle: () => void; onClose: () => void }) {
  const { pathname } = useLocation();
  const active = group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  return (
    <div className="algoviz-nav-group">
      <button type="button" className={active ? "algoviz-nav-link algoviz-nav-trigger is-active" : "algoviz-nav-link algoviz-nav-trigger"} aria-expanded={open} onClick={onToggle}>
        {group.label} <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="algoviz-nav-popover">
          {group.items.map((item) => <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>{item.label}</NavLink>)}
        </div>
      )}
    </div>
  );
}

export default function AlgoVizLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // A group menu closes on Escape, or when a click or focus lands outside the navigation.
  useEffect(() => {
    if (!openGroup) return;
    const close = (event: Event) => { if (!navRef.current?.contains(event.target as Node)) setOpenGroup(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenGroup(null); };
    document.addEventListener("pointerdown", close); document.addEventListener("focusin", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("focusin", close); document.removeEventListener("keydown", escape); };
  }, [openGroup]);

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

          <nav ref={navRef} className="algoviz-desktop-nav" aria-label="Primary navigation">
            <NavLink to={home.to} end={home.end} className={linkClass}>{home.label}</NavLink>
            {groups.map((group) => <GroupMenu key={group.label} group={group} open={openGroup === group.label} onToggle={() => setOpenGroup((current) => (current === group.label ? null : group.label))} onClose={() => setOpenGroup(null)} />)}
            <NavLink to={compare.to} className={linkClass}>{compare.label}</NavLink>
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
            <NavLink to={home.to} end={home.end} className={linkClass} onClick={() => setMenuOpen(false)}>{home.label}</NavLink>
            {groups.map((group) => (
              <div className="algoviz-mobile-group" role="group" aria-label={group.label} key={group.label}>
                <span className="algoviz-mobile-group-label">{group.label}</span>
                {group.items.map((item) => <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMenuOpen(false)}>{item.label}</NavLink>)}
              </div>
            ))}
            <NavLink to={compare.to} className={linkClass} onClick={() => setMenuOpen(false)}>{compare.label}</NavLink>
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
