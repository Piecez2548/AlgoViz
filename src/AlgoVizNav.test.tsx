import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AlgoVizRoutes } from "./AlgoVizRoutes";

const openAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><AlgoVizRoutes /></MemoryRouter>);
const primary = () => screen.getByRole("navigation", { name: "Primary navigation" });

describe("grouped navigation", () => {
  it("shows Learn, three group menus and Compare instead of a row of links", () => {
    openAt("/");
    const nav = within(primary());
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual(["Learn", "Compare"]);
    expect(nav.getAllByRole("button").map((button) => button.textContent!.trim())).toEqual(["Graphs", "Sorting & searching", "Flow & matching"]);
  });

  it("opens a group to reveal its labs, and closes it on Escape", () => {
    openAt("/");
    const button = within(primary()).getByRole("button", { name: "Flow & matching" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(within(primary()).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(expect.arrayContaining(["/max-flow", "/matching"]));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the group of the page you are on", () => {
    openAt("/matching");
    expect(within(primary()).getByRole("button", { name: "Flow & matching" })).toHaveClass("is-active");
    expect(within(primary()).getByRole("button", { name: "Graphs" })).not.toHaveClass("is-active");
  });

  it("lists every lab in the mobile menu under its group", () => {
    openAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const mobile = within(screen.getByRole("navigation", { name: "Mobile navigation" }));
    expect(mobile.getAllByRole("link")).toHaveLength(12);
    expect(within(mobile.getByRole("group", { name: "Graphs" })).getAllByRole("link")).toHaveLength(6);
  });
});

describe("home catalog groups", () => {
  it("shows every algorithm card exactly once, under three headings whose counts add up", () => {
    openAt("/");
    const cards = document.querySelectorAll(".algoviz-catalog-card");
    const titles = [...document.querySelectorAll(".algoviz-catalog-group-title")].map((title) => title.textContent);
    expect(titles).toHaveLength(3);
    expect(titles.map((title) => Number(title!.match(/(\d+)$/)![1])).reduce((a, b) => a + b, 0)).toBe(cards.length);
    expect(new Set([...cards].map((card) => card.getAttribute("href"))).size).toBe(cards.length);
    expect(screen.getByText(/Thirty algorithms/)).toBeInTheDocument();
    expect(cards.length).toBe(30);
  });
});
