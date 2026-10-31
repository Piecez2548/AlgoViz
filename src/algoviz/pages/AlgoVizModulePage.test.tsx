import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "./AlgoVizModulePage";

function CurrentSearch() {
  return <output data-testid="search">{useLocation().search}</output>;
}

describe("AlgoViz module selection", () => {
  it.each([
    ["search", "bfs"],
    ["search", "dfs"],
    ["search", "bidirectional-bfs"],
    ["search", "greedy-best-first"],
    ["pathfinding", "dijkstra"],
    ["pathfinding", "a-star"],
    ["pathfinding", "bellman-ford"],
    ["pathfinding", "floyd-warshall"],
    ["spanning", "kruskal"],
    ["spanning", "prim"],
    ["sorting", "bubble"],
    ["sorting", "selection"],
    ["sorting", "insertion"],
    ["sorting", "merge"],
    ["sorting", "quick"],
    ["sorting", "heap"],
    ["sorting", "shell"],
    ["sorting", "counting"],
    ["sorting", "radix"],
    ["array-search", "binary-search"],
    ["topological-sort", "kahn"],
    ["strongly-connected", "tarjan"],
    ["max-flow", "edmonds-karp"],
    ["max-flow", "ford-fulkerson"],
    ["strongly-connected", "kosaraju"],
    ["topological-sort", "dfs-topological"],
    ["array-search", "linear-search"],
  ])("opens %s with the requested algorithm %s", (module, algorithm) => {
    render(
      <MemoryRouter initialEntries={[`/${module}?algorithm=${algorithm}`]}>
        <Routes>
          <Route path="/:module" element={<AlgoVizModulePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("combobox", { name: "Choose algorithm" })).toHaveValue(algorithm);
  });

  it("falls back to the module default for an unknown algorithm", () => {
    render(
      <MemoryRouter initialEntries={["/sorting?algorithm=unknown"]}>
        <Routes>
          <Route path="/:module" element={<AlgoVizModulePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("combobox", { name: "Choose algorithm" })).toHaveValue("bubble");
  });

  it("keeps the URL's algorithm in step with the dropdown so links and refreshes keep the choice", async () => {
    render(
      <MemoryRouter initialEntries={["/sorting?algorithm=selection"]}>
        <Routes>
          <Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("search")).toHaveTextContent("?algorithm=selection");
    fireEvent.change(screen.getByRole("combobox", { name: "Choose algorithm" }), { target: { value: "quick" } });
    expect(screen.getByTestId("search")).toHaveTextContent("?algorithm=quick");
    expect(screen.getByRole("combobox", { name: "Choose algorithm" })).toHaveValue("quick");
  });

  it("shows only the metrics that apply and names merge sort's writes honestly", async () => {
    render(
      <MemoryRouter initialEntries={["/sorting?algorithm=bubble"]}>
        <Routes>
          <Route path="/:module" element={<AlgoVizModulePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Visited")).not.toBeInTheDocument();
    expect(screen.getByText("Swaps")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Choose algorithm" }), { target: { value: "merge" } });
    expect(screen.getByText("Writes")).toBeInTheDocument();
    expect(screen.queryByText("Swaps")).not.toBeInTheDocument();
  });

  it("derives the comparison verdict from the measured runs", () => {
    render(
      <MemoryRouter initialEntries={["/compare"]}>
        <Routes>
          <Route path="/:module" element={<AlgoVizModulePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/made the (fewest|most) comparisons/);
  });});
