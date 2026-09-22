import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "./AlgoVizModulePage";

describe("AlgoViz module selection", () => {
  it.each([
    ["search", "bfs"],
    ["search", "dfs"],
    ["search", "greedy-best-first"],
    ["pathfinding", "dijkstra"],
    ["pathfinding", "a-star"],
    ["sorting", "bubble"],
    ["sorting", "selection"],
    ["sorting", "insertion"],
    ["sorting", "merge"],
    ["sorting", "quick"],
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
});
