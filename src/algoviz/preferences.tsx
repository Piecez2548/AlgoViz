import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TH } from "./i18n";

export type Lang = "en" | "th";
export type Theme = "dark" | "light";

interface Preferences {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  /** The text in the chosen language, with {0}, {1}… filled from `values`. Anything without a translation stays in English. */
  t: (english: string, ...values: (string | number)[]) => string;
}

const LANG_KEY = "algoviz-lang";
const THEME_KEY = "algoviz-theme";

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try { const value = window.localStorage.getItem(key); return allowed.includes(value as T) ? (value as T) : fallback; } catch { return fallback; }
};
const write = (key: string, value: string) => { try { window.localStorage.setItem(key, value); } catch { /* private window or blocked storage: the choice just lasts until reload */ } };

const fill = (text: string, values: readonly (string | number)[]) => (values.length ? text.replace(/\{(\d+)\}/g, (match, index) => String(values[Number(index)] ?? match)) : text);

// Without a provider (a page rendered on its own) everything stays English and dark.
const Context = createContext<Preferences>({ lang: "en", theme: "dark", setLang: () => {}, setTheme: () => {}, t: (english, ...values) => fill(english, values) });

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => read<Lang>(LANG_KEY, ["en", "th"], "en"));
  const [theme, setThemeState] = useState<Theme>(() => read<Theme>(THEME_KEY, ["dark", "light"], "dark"));
  const setLang = useCallback((next: Lang) => { setLangState(next); write(LANG_KEY, next); }, []);
  const setTheme = useCallback((next: Theme) => { setThemeState(next); write(THEME_KEY, next); }, []);

  // The theme and language belong to the whole page, including the margin around the app.
  useEffect(() => {
    const root = document.documentElement;
    const before = { theme: root.dataset.theme, lang: root.lang };
    root.dataset.theme = theme; root.lang = lang;
    return () => { if (before.theme === undefined) delete root.dataset.theme; else root.dataset.theme = before.theme; root.lang = before.lang; };
  }, [lang, theme]);

  const t = useCallback((english: string, ...values: (string | number)[]) => fill(lang === "th" ? TH[english] ?? english : english, values), [lang]);
  const value = useMemo(() => ({ lang, theme, setLang, setTheme, t }), [lang, theme, setLang, setTheme, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const usePreferences = () => useContext(Context);
export const useT = () => useContext(Context).t;
