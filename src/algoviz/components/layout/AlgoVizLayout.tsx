import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, GitCompareArrows, Menu, Moon, Network, Sun, X } from "lucide-react";

import { PreferencesProvider, usePreferences } from "../../preferences";

import "../../algoviz.css";
import "../../redesign.css";

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
  const { t } = usePreferences();
  const active = group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  return (
    <div className="algoviz-nav-group">
      <button type="button" className={active ? "algoviz-nav-link algoviz-nav-trigger is-active" : "algoviz-nav-link algoviz-nav-trigger"} aria-expanded={open} onClick={onToggle}>
        {t(group.label)} <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="algoviz-nav-popover">
          {group.items.map((item) => <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>{t(item.label)}</NavLink>)}
        </div>
      )}
    </div>
  );
}

export default function AlgoVizLayout() {
  return <PreferencesProvider><AlgoVizShell /></PreferencesProvider>;
}

function AlgoVizShell() {
  const { t, lang, theme, setLang, setTheme } = usePreferences();
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

  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Sections and cards fade in as they scroll into view (everything is shown at once where IntersectionObserver is missing).
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".algoviz-home-page :is(.algoviz-section-heading, .algoviz-category-row, .algoviz-catalog-group, .algoviz-workflow-intro, .algoviz-workflow-list li)"));
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("rv-in"); observer.unobserve(entry.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--rv-delay", `${(i % 4) * 70}ms`); observer.observe(el); });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cards glow where the pointer is.
  const spotlight = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>(".algoviz-category-row, .algoviz-catalog-card");
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - box.left}px`);
    card.style.setProperty("--my", `${event.clientY - box.top}px`);
  };

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "AlgoViz · Interactive Algorithm Lab";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="algoviz-app" onPointerMove={spotlight}>
      <div className="algoviz-progress" aria-hidden="true" />
      <a className="algoviz-skip-link" href="#algoviz-main">{t("Skip to content")}</a>
      <header className={scrolled ? "algoviz-header is-scrolled" : "algoviz-header"}>
        <div className="algoviz-header-inner">
          <Link className="algoviz-brand" to="" aria-label={t("AlgoViz home")}>
            <span className="algoviz-brand-mark" aria-hidden="true"><Network size={18} strokeWidth={2.5} /></span>
            <span>AlgoViz</span>
          </Link>

          <nav ref={navRef} className="algoviz-desktop-nav" aria-label={t("Primary navigation")}>
            <NavLink to={home.to} end={home.end} className={linkClass}>{t(home.label)}</NavLink>
            {groups.map((group) => <GroupMenu key={group.label} group={group} open={openGroup === group.label} onToggle={() => setOpenGroup((current) => (current === group.label ? null : group.label))} onClose={() => setOpenGroup(null)} />)}
            <NavLink to={compare.to} className={linkClass}>{t(compare.label)}</NavLink>
          </nav>

          <div className="algoviz-header-actions">
            <span className="algoviz-status-pill"><span aria-hidden="true" /> {t("Client-side lab")}</span>
            <button type="button" className="algoviz-icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t(theme === "dark" ? "Switch to light theme" : "Switch to dark theme")}>
              {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button type="button" className="algoviz-icon-button algoviz-lang-button" onClick={() => setLang(lang === "en" ? "th" : "en")} aria-label={t(lang === "en" ? "Switch to Thai" : "Switch to English")} lang={lang === "en" ? "th" : "en"}>
              {lang === "en" ? "ไทย" : "EN"}
            </button>
            <button
              type="button"
              className="algoviz-menu-button"
              aria-expanded={menuOpen}
              aria-controls="algoviz-mobile-nav"
              aria-label={t(menuOpen ? "Close navigation" : "Open navigation")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="algoviz-mobile-nav" className="algoviz-mobile-nav" aria-label={t("Mobile navigation")}>
            <NavLink to={home.to} end={home.end} className={linkClass} onClick={() => setMenuOpen(false)}>{t(home.label)}</NavLink>
            {groups.map((group) => (
              <div className="algoviz-mobile-group" role="group" aria-label={t(group.label)} key={group.label}>
                <span className="algoviz-mobile-group-label">{t(group.label)}</span>
                {group.items.map((item) => <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMenuOpen(false)}>{t(item.label)}</NavLink>)}
              </div>
            ))}
            <NavLink to={compare.to} className={linkClass} onClick={() => setMenuOpen(false)}>{t(compare.label)}</NavLink>
          </nav>
        )}
      </header>

      <main id="algoviz-main" tabIndex={-1}>
        <div className="algoviz-route" key={pathname}><Outlet /></div>
      </main>

      <footer className="algoviz-footer">
        <span>{t("AlgoViz interactive labs · deterministic steps")}</span>
        <span className="algoviz-footer-note"><GitCompareArrows size={15} aria-hidden="true" /> {t("Built for understanding")}</span>
      </footer>
    </div>
  );
}
