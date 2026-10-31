import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AlgoVizRoutes } from "../AlgoVizRoutes";
import { TH } from "./i18n";

const openAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><AlgoVizRoutes /></MemoryRouter>);
const heading = () => screen.getByRole("heading", { level: 1 }).textContent;

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => { window.localStorage.clear(); delete document.documentElement.dataset.theme; document.documentElement.lang = ""; });

describe("language button", () => {
  it("starts in English, switches the page to Thai, and remembers the choice", () => {
    const { unmount } = openAt("/");
    expect(heading()).toMatch(/See algorithms/);
    fireEvent.click(screen.getByRole("button", { name: "Switch to Thai" }));
    expect(heading()).toBe("ดูอัลกอริทึม คิด");
    expect(document.documentElement.lang).toBe("th");
    expect(within(screen.getByRole("navigation", { name: "เมนูหลัก" })).getByRole("link", { name: "เปรียบเทียบ" })).toBeInTheDocument();
    expect(window.localStorage.getItem("algoviz-lang")).toBe("th");
    unmount();
    openAt("/matching");
    expect(heading()).toBe("การจับคู่สองฝั่ง");
    expect(screen.getByRole("link", { name: /กลับไปหน้าเรียนรู้/ })).toHaveAttribute("href", "/");
    fireEvent.click(screen.getByRole("button", { name: "Switch to English" }));
    expect(heading()).toBe("Bipartite matching");
  });

  it("translates the controls of a lab and keeps the recorded explanation in English", () => {
    window.localStorage.setItem("algoviz-lang", "th");
    openAt("/sorting");
    expect(screen.getByRole("button", { name: "ขั้นถัดไป" })).toBeInTheDocument();
    expect(screen.getByLabelText("เลือกอัลกอริทึม")).toBeInTheDocument();
    expect(screen.getByText("ใช้ตัวเลขเหล่านี้")).toBeInTheDocument();
    expect(screen.getByText("การกระทำตอนนี้")).toBeInTheDocument();
    expect(document.querySelector(".algoviz-explanation")!.textContent).toMatch(/^[A-Za-z]/);
  });

  it("falls back to English for a bad stored value", () => {
    window.localStorage.setItem("algoviz-lang", "fr");
    openAt("/");
    expect(heading()).toMatch(/See algorithms/);
  });
});

describe("theme button", () => {
  it("is dark by default, switches to light on the whole page, and remembers it", () => {
    const { unmount } = openAt("/");
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("algoviz-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
    unmount();
    openAt("/search");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("Thai dictionary", () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return name.endsWith(".tsx") && !name.includes(".test.") ? [path] : [];
  });
  const sources = files("src/algoviz").map((path) => readFileSync(path, "utf8"));
  // A literal on the right of === is something being compared, not text that is shown.
  const quoted = /"((?:[^"\\]|\\.)*)"/g;
  const compared = /[=!]==\s"(?:[^"\\]|\\.)*"/g;

  // The text inside every t(...) call, including both sides of a ternary.
  const used = (): string[] => {
    const found: string[] = [];
    for (const text of sources) {
      for (const match of text.matchAll(/\bt\(/g)) {
        let depth = 1; let end = match.index! + 2;
        while (depth && end < text.length) { const char = text[end++]; if (char === "(") depth++; else if (char === ")") depth--; }
        const call = text.slice(match.index! + 2, end - 1);
        // A string built from parts (a template) is covered by the entries for its parts.
        if (call.includes("`")) continue;
        for (const literal of call.replace(compared, "").matchAll(quoted)) found.push(literal[1]);
      }
    }
    return found;
  };

  it("has Thai text for every string passed to t()", () => {
    const strings = used();
    expect(strings.length).toBeGreaterThan(120);
    expect([...new Set(strings)].filter((text) => !(text in TH))).toEqual([]);
  });

  it("has Thai text for the lab cards, the lab pages, and the labels that are built from parts", () => {
    const home = readFileSync("src/algoviz/pages/AlgoVizHomePage.tsx", "utf8");
    const page = readFileSync("src/algoviz/pages/AlgoVizModulePage.tsx", "utf8");
    const field = /(?:name|description|eyebrow): "([^"]+)"/g;
    const wanted = [...home.matchAll(/summary: "([^"]+)"/g)].map((match) => match[1])
      .concat([...home.slice(0, home.indexOf("const algorithmCatalog")).matchAll(field)].map((match) => match[1]))
      .concat([...page.matchAll(field)].map((match) => match[1]))
      .concat(["Weight for new edges", "Capacity for new edges", "Move nodes", "Add nodes", "Connect nodes", "Random", "Already sorted", "Reversed", "Nearly sorted", "Many duplicates"]);
    expect(wanted.length).toBeGreaterThan(60);
    expect([...new Set(wanted)].filter((text) => !(text in TH))).toEqual([]);
  });

  it("keeps every {0}-style placeholder in its translation", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\d+)\}/g)].map((match) => match[1]).sort().join(",");
    for (const [english, thai] of Object.entries(TH)) expect(placeholders(thai), english).toBe(placeholders(english));
  });
});
