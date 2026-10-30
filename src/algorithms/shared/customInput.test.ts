import { describe, expect, it } from "vitest";
import { runAStar, runDijkstra } from "../pathfinding/pathfindingAlgorithms";
import { runBfs, runDfs, runGreedyBestFirst } from "../search/searchAlgorithms";
import { runBubbleSort, runInsertionSort, runMergeSort, runQuickSort, runSelectionSort } from "../sorting/sortingAlgorithms";
import { cellId, defaultGrid, gridToGraph, pathCost, sampleGraphBetween, SAMPLE_GRAPH, withHeuristics } from "./graph";
import type { GridState } from "./graphTypes";
import { makePreset, parseNumberList } from "./arrayInput";
import { PSEUDOCODE, activeLine } from "./pseudocode";
import type { AlgorithmExecution } from "./types";

// Small deterministic generator so failures can be reproduced.
function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

const sorters = { bubble: runBubbleSort, selection: runSelectionSort, insertion: runInsertionSort, merge: runMergeSort, quick: runQuickSort };

function pathOf(execution: AlgorithmExecution): string[] | null {
  const value = execution.steps.find((step) => step.type === "path")?.dataStructure?.[0]?.value;
  return value === undefined ? null : String(value).split(" → ");
}

function randomGrid(random: () => number): GridState {
  const grid = defaultGrid();
  const cells = grid.cells.map((_, index) => (random() < 0.28 ? "wall" as const : random() < 0.1 ? "heavy" as const : "empty" as const));
  const start = { col: Math.floor(random() * grid.cols), row: Math.floor(random() * grid.rows) };
  let goal = { col: Math.floor(random() * grid.cols), row: Math.floor(random() * grid.rows) };
  if (goal.col === start.col && goal.row === start.row) goal = { col: (start.col + 1) % grid.cols, row: start.row };
  cells[start.row * grid.cols + start.col] = "empty"; cells[goal.row * grid.cols + goal.col] = "empty";
  return { ...grid, cells, start, goal };
}

describe("sorting with the user's own numbers", () => {
  it.each(Object.entries(sorters))("%s sorts arbitrary input, including duplicates and sorted data", (_, run) => {
    const random = seeded(7);
    for (const input of [[5, 5, 5], [1, 2, 3, 4], [9, 8, 7, 6, 5], [3, 1], ...Array.from({ length: 12 }, () => makePreset("random", 2 + Math.floor(random() * 14), random)), makePreset("few-unique", 12, random)]) {
      const execution = run(input);
      expect(execution.steps.at(-2)?.values ?? execution.steps.at(-1)?.values).toEqual([...input].sort((a, b) => a - b));
      expect(execution.inputLabel).toContain(input.join(", "));
    }
  });
});

describe("number list parsing", () => {
  it("accepts commas, spaces and new lines", () => { expect(parseNumberList("5, 3 9\n1").values).toEqual([5, 3, 9, 1]); });
  it.each(["", "7", "1, x, 3", "1, 2.5", "0, 4", "1, 1000", Array.from({ length: 25 }, () => "5").join(" ")])("rejects %j with a message", (text) => {
    const result = parseNumberList(text);
    expect(result.values).toBeUndefined();
    expect(result.error).toBeTruthy();
  });
});

describe("map to graph conversion", () => {
  it("leaves walls out and links only side-by-side open cells", () => {
    const grid: GridState = { cols: 3, rows: 1, cells: ["empty", "wall", "empty"], start: { col: 0, row: 0 }, goal: { col: 2, row: 0 } };
    const graph = gridToGraph(grid);
    expect(graph.nodes.map((node) => node.id)).toEqual(["A1", "C1"]);
    expect(graph.edges).toEqual([]);
  });

  it("charges more to cross heavy ground", () => {
    const grid: GridState = { cols: 3, rows: 1, cells: ["empty", "heavy", "empty"], start: { col: 0, row: 0 }, goal: { col: 2, row: 0 } };
    expect(gridToGraph(grid).edges.map((edge) => edge.weight)).toEqual([3, 3]);
  });

  it("reports no route when the goal is walled off, and still finishes", () => {
    const grid: GridState = { cols: 3, rows: 1, cells: ["empty", "wall", "empty"], start: { col: 0, row: 0 }, goal: { col: 2, row: 0 } };
    const graph = gridToGraph(grid);
    for (const run of [runBfs, runDfs, runGreedyBestFirst, runDijkstra, runAStar]) {
      const execution = run(graph);
      expect(pathOf(execution)).toBeNull();
      expect(execution.steps.at(-1)?.type).toBe("complete");
    }
  });

  it("finds the same shortest cost with A* and Dijkstra on many random maps", () => {
    const random = seeded(2026);
    let routed = 0;
    for (let round = 0; round < 60; round++) {
      const graph = gridToGraph(randomGrid(random));
      const dijkstra = pathOf(runDijkstra(graph)); const aStar = pathOf(runAStar(graph));
      expect(Boolean(aStar)).toBe(Boolean(dijkstra));
      if (dijkstra && aStar) { routed++; expect(pathCost(graph, aStar)).toBe(pathCost(graph, dijkstra)); expect(aStar[0]).toBe(graph.start); expect(aStar.at(-1)).toBe(graph.goal); }
    }
    expect(routed).toBeGreaterThan(10);
  });

  it("every search finds a route whenever Dijkstra does", () => {
    const random = seeded(99);
    for (let round = 0; round < 30; round++) {
      const graph = gridToGraph(randomGrid(random));
      const reachable = Boolean(pathOf(runDijkstra(graph)));
      for (const run of [runBfs, runDfs, runGreedyBestFirst]) expect(Boolean(pathOf(run(graph)))).toBe(reachable);
    }
  });

  it("names cells like a chessboard", () => { expect(cellId(0, 0)).toBe("A1"); expect(cellId(11, 7)).toBe("L8"); });
});

describe("choosing another start and goal on the sample graph", () => {
  it("keeps the curated graph for A to F", () => { expect(sampleGraphBetween("A", "F")).toBe(SAMPLE_GRAPH); });

  it("labels the run with the chosen endpoints and keeps A* optimal", () => {
    for (const start of SAMPLE_GRAPH.nodes) for (const goal of SAMPLE_GRAPH.nodes) {
      if (start.id === goal.id) continue;
      const graph = sampleGraphBetween(start.id, goal.id);
      const dijkstra = runDijkstra(graph); const aStar = runAStar(graph);
      expect(dijkstra.inputLabel).toContain(`${start.id} → ${goal.id}`);
      expect(pathCost(graph, pathOf(aStar)!)).toBe(pathCost(graph, pathOf(dijkstra)!));
    }
  });

  it("never overestimates the remaining cost", () => {
    const graph = withHeuristics({ ...SAMPLE_GRAPH, goal: "B" });
    for (const node of graph.nodes) {
      const real = pathCost(graph, pathOf(runDijkstra({ ...graph, start: node.id }))?.length ? pathOf(runDijkstra({ ...graph, start: node.id }))! : [node.id]);
      expect(node.heuristic).toBeLessThanOrEqual(real);
    }
  });
});

describe("pseudocode", () => {
  const everyRun: [string, () => AlgorithmExecution][] = [
    ["bfs", () => runBfs()], ["dfs", () => runDfs()], ["greedy-best-first", () => runGreedyBestFirst()], ["dijkstra", () => runDijkstra()], ["a-star", () => runAStar()],
    ...Object.entries(sorters).map(([id, run]) => [id, () => run()] as [string, () => AlgorithmExecution]),
  ];

  it.each(everyRun)("%s highlights a real line for every step it records", (id, run) => {
    const lines = PSEUDOCODE[id].lines;
    for (const step of run().steps) {
      const line = activeLine(id, step.type);
      expect(line, `${id} step type ${step.type}`).toBeDefined();
      expect(line!).toBeGreaterThanOrEqual(0);
      expect(line!).toBeLessThan(lines.length);
    }
  });
});
