import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const jumpToEnd = () => fireEvent.keyDown(window, { key: "End" });
const explanation = () => document.querySelector(".algoviz-explanation")?.textContent ?? "";
const groupsOnScreen = () => new Set([...document.querySelectorAll(".algoviz-node.is-group")].map((node) => [...node.classList].find((name) => /^is-group-\d$/.test(name))));

describe("strongly connected components lab", () => {
  it("colours and numbers each component, and ends with the three loops and the lone node", () => {
    open("/strongly-connected");
    expect(screen.getByRole("heading", { level: 1, name: "Strongly connected components" })).toBeInTheDocument();
    jumpToEnd();
    expect(explanation()).toMatch(/^Found 4 strongly connected components: /);
    for (const group of ["{A, B, C}", "{D, E}", "{F, G}", "{H}"]) expect(explanation()).toContain(group);
    expect(groupsOnScreen().size).toBe(4);
    // One badge per node; the groups hold 1, 2, 2 and 3 nodes, numbered in the order they were found.
    const badges = [...document.querySelectorAll(".algoviz-group-badge")].map((badge) => badge.textContent);
    expect(badges).toHaveLength(8);
    expect([...new Set(badges)].map((label) => badges.filter((item) => item === label).length).sort()).toEqual([1, 2, 2, 3]);
    expect(screen.getAllByText("Components").length).toBeGreaterThanOrEqual(2);
  });

  it("finds the same components with Kosaraju's two passes", () => {
    open("/strongly-connected?algorithm=kosaraju");
    jumpToEnd();
    expect(explanation()).toMatch(/^Found 4 strongly connected components: /);
    expect(groupsOnScreen().size).toBe(4);
  });

  it("shows every node alone on the sample with no loops, and lets you build your own graph that stays in the link", async () => {
    open("/strongly-connected");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "cycle" } });
    jumpToEnd();
    expect(explanation()).toMatch(/^Found 6 strongly connected components: /);
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    fireEvent.click(screen.getByText(/Nodes and edges/));
    fireEvent.click(screen.getByRole("button", { name: "Remove node H" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove edge A→B" }));
    jumpToEnd();
    expect(explanation()).toMatch(/^Found \d strongly connected components: /);
    await waitFor(() => expect(decodeURIComponent(screen.getByTestId("search").textContent!)).toMatch(/~du(&|$)/));
  });
});
