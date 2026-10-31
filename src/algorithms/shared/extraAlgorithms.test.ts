import { describe, expect, it } from "vitest";
import { runBfs, runBidirectionalBfs } from "../search/searchAlgorithms";
import { runCountingSort, runRadixSort } from "../sorting/sortingAlgorithms";
import { makePreset } from "./arrayInput";
import { squareMap } from "./benchmark";
import { defaultGrid, gridToGraph, pathCost, SAMPLE_GRAPH } from "./graph";
import { getNeighbors } from "./graph";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const finalValues = (execution: AlgorithmExecution) => [...execution.steps.at(-1)!.values!];
const routeOf = (execution: AlgorithmExecution) => {
  const value = execution.steps.find((step) => step.type === "path")?.dataStructure?.find((entry) => entry.label === "Path")?.value;
  return value === undefined ? null : String(value).split(" → ");
};
const visitedOf = (execution: AlgorithmExecution) => Math.max(0, ...execution.steps.filter((step) => step.type !== "path").map((step) => step.metrics?.visitedNodes ?? step.visited?.length ?? 0));

describe.each([["Counting sort", runCountingSort], ["Radix sort", runRadixSort]])("%s", (_name, run) => {
  it("sorts random, duplicate, sorted, reversed and large-value input without a single comparison", () => {
    const random = seeded(3);
    const inputs = [[2, 1], [5, 5, 5, 5], [1, 2, 3, 4, 5, 6], [9, 8, 7, 6, 5, 4, 3], [999, 1, 500, 10, 100], ...Array.from({ length: 30 }, () => makePreset("random", 2 + Math.floor(random() * 22), random))];
    for (const input of inputs) {
      const execution = run(input);
      expect(finalValues(execution)).toEqual([...input].sort((a, b) => a - b));
      expect(execution.steps.at(-1)!.metrics!.comparisons).toBe(0);
      expect(execution.steps.some((step) => step.type === "compare")).toBe(false);
    }
  });
});

describe("Counting sort steps", () => {
  it("counts every value once, then writes n values back with the counts on screen", () => {
    const execution = runCountingSort([3, 1, 3, 2, 1, 3]);
    expect(execution.steps.filter((step) => step.type === "visit")).toHaveLength(6);
    expect(execution.steps.filter((step) => step.type === "swap")).toHaveLength(6);
    const tally = execution.steps.at(-2)!.dataStructure!.find((entry) => entry.label === "Counts")!.value;
    expect(tally).toBe("1×2, 2×1, 3×3");
    expect(execution.steps.at(-1)!.metrics!.swaps).toBe(6);
  });
});

describe("Radix sort steps", () => {
  it("makes one pass per digit and only marks values as final in the last pass", () => {
    const execution = runRadixSort([170, 45, 75, 90, 802, 24, 2, 66]);
    const writes = execution.steps.filter((step) => step.type === "swap");
    expect(writes).toHaveLength(8 * 3);
    expect(writes[7].sortedIndices).toEqual([]);
    expect(writes.at(-1)!.sortedIndices).toHaveLength(8);
    expect(execution.steps.find((step) => step.type === "visit")!.explanation).toMatch(/ones digit of 170: it is 0/);
  });

  it("keeps equal digits in their earlier order, so the passes add up to a full sort", () => {
    expect(finalValues(runRadixSort([21, 11, 31, 12, 22]))).toEqual([11, 12, 21, 22, 31]);
  });
});

describe("Bidirectional BFS", () => {
  const valid = (graph: Parameters<typeof runBfs>[0], route: string[]) => route.every((id, index) => index === 0 || getNeighbors(graph!, route[index - 1]).some((edge) => edge.to === id));

  it("finds a route with as few edges as BFS, or none when BFS finds none, on random maps", () => {
    const random = seeded(21);
    for (let trial = 0; trial < 60; trial++) {
      const grid = defaultGrid();
      const cells = grid.cells.map(() => (random() < 0.3 ? "wall" as const : "empty" as const));
      const start = { col: Math.floor(random() * grid.cols), row: Math.floor(random() * grid.rows) };
      const goal = { col: (start.col + 1 + Math.floor(random() * (grid.cols - 1))) % grid.cols, row: Math.floor(random() * grid.rows) };
      cells[start.row * grid.cols + start.col] = "empty"; cells[goal.row * grid.cols + goal.col] = "empty";
      const graph = gridToGraph({ ...grid, cells, start, goal });
      const bi = routeOf(runBidirectionalBfs(graph)); const bfs = routeOf(runBfs(graph));
      expect(bi === null).toBe(bfs === null);
      if (bi && bfs) {
        expect(bi.length).toBe(bfs.length);
        expect(bi[0]).toBe(graph.start); expect(bi.at(-1)).toBe(graph.goal);
        expect(valid(graph, bi)).toBe(true);
        expect(new Set(bi).size).toBe(bi.length);
      }
    }
  });

  it("works on the sample graph and never visits more than BFS on an open map", () => {
    const route = routeOf(runBidirectionalBfs(SAMPLE_GRAPH))!;
    expect(route[0]).toBe("A"); expect(route.at(-1)).toBe("F");
    expect(pathCost(SAMPLE_GRAPH, route)).toBeLessThan(Infinity);
    const open = gridToGraph(squareMap(14, "none"));
    expect(visitedOf(runBidirectionalBfs(open))).toBeLessThan(visitedOf(runBfs(open)) * 0.8);
  });

  it("says the searches never met when a wall splits the map", () => {
    const graph = gridToGraph({ cols: 3, rows: 1, cells: ["empty", "wall", "empty"], start: { col: 0, row: 0 }, goal: { col: 2, row: 0 } });
    const execution = runBidirectionalBfs(graph);
    expect(routeOf(execution)).toBeNull();
    expect(execution.steps.at(-1)!.explanation).toMatch(/never met/);
  });
});
