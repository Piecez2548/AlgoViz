import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const jumpToEnd = () => fireEvent.keyDown(window, { key: "End" });
const explanation = () => document.querySelector(".algoviz-explanation")?.textContent ?? "";

describe("array search lab", () => {
  it("searches your numbers in ascending order for the value you choose and keeps both in the link", () => {
    open("/array-search?values=50,10,40,20,30&target=40&algorithm=binary-search");
    expect(screen.getByLabelText("Value to find")).toHaveValue("40");
    jumpToEnd();
    expect(explanation()).toBe("Found 40 at position 3 after 2 comparisons.");
    fireEvent.change(screen.getByLabelText("Value to find"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Search for it" }));
    jumpToEnd();
    expect(explanation()).toMatch(/^25 is not in the list\. Binary search needed 3 comparisons/);
    expect(screen.getByTestId("search").textContent).toContain("target=25");
  });

  it("shows the ruled-out half dimmed as the range halves", () => {
    open("/array-search?values=10,20,30,40,50,60,70,80&target=80");
    expect(document.querySelectorAll(".algoviz-sort-bar.is-eliminated")).toHaveLength(0);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    // The first look is at the middle (position 3, value 40), so the left four are ruled out next.
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.querySelectorAll(".algoviz-sort-bar.is-eliminated").length).toBeGreaterThan(0);
  });

  it("compares linear search on the same list and rejects a target that is not a number", () => {
    open("/array-search?values=10,20,30,40,50&target=50&algorithm=linear-search");
    jumpToEnd();
    expect(explanation()).toBe("Found 50 at position 4 after 5 comparisons.");
    fireEvent.change(screen.getByLabelText("Value to find"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Search for it" }));
    expect(screen.getByRole("alert")).toHaveTextContent("whole number from 1 to 999");
  });
});

describe("new graph and sorting labs", () => {
  it("runs Prim's algorithm on the spanning page and finishes with the same weight as Kruskal", () => {
    open("/spanning?algorithm=prim");
    jumpToEnd();
    const prim = explanation();
    expect(prim).toMatch(/^Minimum spanning tree found: \d+ edges, total weight \d+\.$/);
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "kruskal" } });
    jumpToEnd();
    expect(explanation()).toBe(prim);
  });

  it("runs Floyd-Warshall on the pathfinding page and highlights the route", () => {
    open("/pathfinding?algorithm=floyd-warshall");
    jumpToEnd();
    expect(explanation()).toMatch(/^Floyd-Warshall completed/);
    expect(document.querySelectorAll(".algoviz-node.is-path").length).toBeGreaterThan(1);
  });

  it("sorts with Shell sort", () => {
    open("/sorting?algorithm=shell&values=9,8,7,6,5,4,3,2");
    jumpToEnd();
    const bars = [...document.querySelectorAll(".algoviz-sort-bar span")].map((node) => Number(node.textContent));
    expect(bars).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("counting, radix and bidirectional labs", () => {
  it.each(["counting", "radix"])("sorts with %s sort, counts no comparisons, and labels the writes", (id) => {
    open(`/sorting?algorithm=${id}&values=170,45,75,90,802,24,2,66`);
    jumpToEnd();
    const bars = [...document.querySelectorAll(".algoviz-sort-bar span")].map((node) => Number(node.textContent));
    expect(bars).toEqual([2, 24, 45, 66, 75, 90, 170, 802]);
    const metrics = [...document.querySelectorAll(".algoviz-metric-grid > div")].map((node) => node.textContent);
    expect(metrics[0]).toBe("0Comparisons");
    expect(metrics[1]).toMatch(/Writes$/);
  });

  it("runs bidirectional BFS on the search page and highlights the joined route", () => {
    open("/search?algorithm=bidirectional-bfs");
    expect(screen.getByText("Start-side queue")).toBeInTheDocument();
    jumpToEnd();
    expect(explanation()).toBe("Bidirectional BFS completed.");
    expect(document.querySelectorAll(".algoviz-node.is-path").length).toBeGreaterThan(2);
  });
});
