import { describe, expect, it } from "vitest";
import { runDijkstra, runFloydWarshall } from "../pathfinding/pathfindingAlgorithms";
import { runBinarySearch, runLinearSearch } from "../searching/arraySearchAlgorithms";
import { runInsertionSort, runShellSort } from "../sorting/sortingAlgorithms";
import { runKruskal, runPrim } from "../spanning/spanningAlgorithms";
import { makePreset } from "./arrayInput";
import { defaultGrid, edgeKey, gridToGraph, pathCost, SAMPLE_GRAPH } from "./graph";
import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

const routeOf = (execution: AlgorithmExecution) => {
  const value = execution.steps.find((step) => step.type === "path")?.dataStructure?.find((entry) => entry.label === "Path")?.value;
  return value === undefined ? null : String(value).split(" → ");
};
const finalWeight = (execution: AlgorithmExecution) => Number(execution.steps.at(-1)?.dataStructure?.find((entry) => entry.label === "Total weight")?.value);

function randomConnectedGraph(random: () => number, size: number): GraphInput {
  const nodes = Array.from({ length: size }, (_, i) => ({ id: String.fromCharCode(65 + i), x: random() * 100, y: random() * 100, heuristic: 0 }));
  const edges: { from: string; to: string; weight: number }[] = [];
  for (let i = 1; i < size; i++) edges.push({ from: nodes[Math.floor(random() * i)].id, to: nodes[i].id, weight: 1 + Math.floor(random() * 9) });
  for (let extra = 0; extra < size; extra++) {
    const a = Math.floor(random() * size); const b = Math.floor(random() * size);
    if (a !== b && !edges.some((edge) => edgeKey(edge.from, edge.to) === edgeKey(nodes[a].id, nodes[b].id))) edges.push({ from: nodes[a].id, to: nodes[b].id, weight: 1 + Math.floor(random() * 9) });
  }
  return { nodes, edges, start: nodes[0].id, goal: nodes[size - 1].id };
}

describe("Shell sort", () => {
  it("sorts random, duplicate, sorted and reversed input", () => {
    const random = seeded(5);
    for (const input of [[2, 1], [5, 5, 5, 5], [1, 2, 3, 4, 5, 6], [9, 8, 7, 6, 5, 4, 3], ...Array.from({ length: 25 }, () => makePreset("random", 2 + Math.floor(random() * 20), random))]) {
      const execution = runShellSort(input);
      expect(execution.steps.at(-2)?.values ?? execution.steps.at(-1)?.values).toEqual([...input].sort((a, b) => a - b));
      expect(execution.steps.at(-1)?.type).toBe("complete");
    }
  });

  it("starts with a gap of half the length, then halves it down to 1", () => {
    const gaps = runShellSort([8, 7, 6, 5, 4, 3, 2, 1]).steps.filter((step) => step.type === "compare").map((step) => Number(/^Gap (\d+)/.exec(step.explanation)?.[1]));
    expect(gaps[0]).toBe(4);
    expect([...new Set(gaps)]).toEqual([4, 2, 1]);
  });

  it("needs far fewer comparisons than insertion sort on reversed data", () => {
    const reversed = Array.from({ length: 64 }, (_, i) => 64 - i);
    const shell = runShellSort(reversed).steps.at(-1)!.metrics!.comparisons!;
    const insertion = runInsertionSort(reversed).steps.at(-1)!.metrics!.comparisons!;
    expect(insertion).toBe(64 * 63 / 2);
    expect(shell).toBeLessThan(insertion / 2);
  });
});

describe("Prim", () => {
  it("builds a tree as light as Kruskal's on the sample graph and on random connected graphs", () => {
    expect(finalWeight(runPrim(SAMPLE_GRAPH))).toBe(finalWeight(runKruskal(SAMPLE_GRAPH)));
    const random = seeded(77);
    for (let trial = 0; trial < 40; trial++) {
      const graph = randomConnectedGraph(random, 4 + Math.floor(random() * 8));
      const prim = runPrim(graph);
      expect(finalWeight(prim)).toBe(finalWeight(runKruskal(graph)));
      expect(prim.steps.at(-1)!.acceptedEdges).toHaveLength(graph.nodes.length - 1);
    }
  });

  it("grows outward from the start node, always taking the lightest edge that leaves the tree", () => {
    const execution = runPrim(SAMPLE_GRAPH);
    const tree = new Set([SAMPLE_GRAPH.start]);
    for (const step of execution.steps.filter((item) => item.type === "accept")) {
      const [a, b] = step.activeEdge!.split("-");
      expect(tree.has(a) !== tree.has(b)).toBe(true);
      const weight = SAMPLE_GRAPH.edges.find((edge) => edgeKey(edge.from, edge.to) === step.activeEdge)!.weight;
      const cheapest = Math.min(...SAMPLE_GRAPH.edges.filter((edge) => tree.has(edge.from) !== tree.has(edge.to)).map((edge) => edge.weight));
      expect(weight).toBe(cheapest);
      tree.add(a); tree.add(b);
    }
    expect(tree.size).toBe(SAMPLE_GRAPH.nodes.length);
  });

  it("says so when part of the graph cannot be reached", () => {
    const graph: GraphInput = { nodes: [{ id: "A", x: 0, y: 0, heuristic: 0 }, { id: "B", x: 10, y: 0, heuristic: 0 }, { id: "C", x: 50, y: 50, heuristic: 0 }], edges: [{ from: "A", to: "B", weight: 3 }], start: "A", goal: "B" };
    const last = runPrim(graph).steps.at(-1)!;
    expect(last.explanation).toMatch(/1 node is not connected to A.*2 of 3 nodes \(total weight 3\)/);
  });
});

describe("Floyd-Warshall", () => {
  it("finds a route exactly as cheap as Dijkstra's on random maps, and agrees when there is none", () => {
    const random = seeded(31);
    for (let trial = 0; trial < 30; trial++) {
      const grid = defaultGrid();
      const cells = grid.cells.map(() => (random() < 0.3 ? "wall" as const : random() < 0.1 ? "heavy" as const : "empty" as const));
      const start = { col: Math.floor(random() * grid.cols), row: Math.floor(random() * grid.rows) };
      const goal = { col: (start.col + 1 + Math.floor(random() * (grid.cols - 1))) % grid.cols, row: Math.floor(random() * grid.rows) };
      cells[start.row * grid.cols + start.col] = "empty"; cells[goal.row * grid.cols + goal.col] = "empty";
      const graph = gridToGraph({ ...grid, cells, start, goal });
      const floyd = routeOf(runFloydWarshall(graph)); const dijkstra = routeOf(runDijkstra(graph));
      expect(floyd === null).toBe(dijkstra === null);
      if (floyd && dijkstra) {
        expect(floyd[0]).toBe(graph.start); expect(floyd.at(-1)).toBe(graph.goal);
        expect(pathCost(graph, floyd)).toBe(pathCost(graph, dijkstra));
      }
    }
  });

  it("goes through every node once and counts every pair it checks", () => {
    const execution = runFloydWarshall(SAMPLE_GRAPH);
    const n = SAMPLE_GRAPH.nodes.length;
    expect(execution.steps.filter((step) => step.type === "visit" || step.type === "update")).toHaveLength(n);
    const checks = execution.steps.at(-1)!.metrics!.operations!;
    expect(checks).toBeGreaterThan(n * n);
    expect(checks).toBeLessThanOrEqual(n * n * n);
  });
});

describe("array search", () => {
  it("finds present values and rejects absent ones, in sorted order whatever order was typed", () => {
    const random = seeded(9);
    for (let trial = 0; trial < 60; trial++) {
      const values = makePreset("random", 2 + Math.floor(random() * 22), random);
      const sorted = [...values].sort((a, b) => a - b);
      const target = trial % 2 ? sorted[Math.floor(random() * sorted.length)] : 1000 + trial;
      for (const execution of [runBinarySearch(values, target), runLinearSearch(values, target)]) {
        expect(execution.steps[0].values).toEqual(sorted);
        const found = execution.steps.at(-1)!.explanation.startsWith("Found");
        expect(found).toBe(sorted.includes(target));
        if (found) expect(sorted[execution.steps.at(-1)!.highlightIndices![0]]).toBe(target);
      }
    }
  });

  it("needs at most log2(n) + 1 comparisons for binary search but n for linear search when the value is absent", () => {
    const values = Array.from({ length: 24 }, (_, i) => (i + 1) * 3);
    for (const target of [1, 4, 40, 72, 73]) {
      const binary = runBinarySearch(values, target).steps.at(-1)!.metrics!.comparisons!;
      expect(binary).toBeLessThanOrEqual(Math.floor(Math.log2(24)) + 1);
    }
    expect(runLinearSearch(values, 4).steps.at(-1)!.metrics!.comparisons).toBe(24);
    expect(runLinearSearch(values, 9).steps.at(-1)!.metrics!.comparisons).toBe(3);
  });

  it("halves the range every step and rules out the discarded half", () => {
    const values = Array.from({ length: 16 }, (_, i) => i + 1);
    const ranges = runBinarySearch(values, 16).steps.filter((step) => step.type === "compare").map((step) => step.activeRange!);
    const widths = ranges.map(([low, high]) => high - low + 1);
    expect(widths).toEqual([16, 8, 4, 2, 1]);
    for (let i = 1; i < ranges.length; i++) expect(ranges[i][0]).toBeGreaterThanOrEqual(ranges[i - 1][0]);
  });
});
