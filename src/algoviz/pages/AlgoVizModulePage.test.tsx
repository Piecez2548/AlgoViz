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
    ["search", "greedy-best-first"],
    ["pathfinding", "dijkstra"],
    ["pathfinding", "a-star"],
    ["pathfinding", "bellman-ford"],
    ["spanning", "kruskal"],
    ["sorting", "bubble"],
    ["sorting", "selection"],
    ["sorting", "insertion"],
    ["sorting", "merge"],
    ["sorting", "quick"],
    ["sorting", "heap"],
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

  it("derives the comparison verdict from the recorded executions", () => {
    render(
      <MemoryRouter initialEntries={["/compare"]}>
        <Routes>
          <Route path="/:module" element={<AlgoVizModulePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Both reach the same optimum")).toBeInTheDocument();
  });});
