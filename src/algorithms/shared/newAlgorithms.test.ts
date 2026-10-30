import { describe, expect, it } from "vitest";
import { runBellmanFord, runDijkstra } from "../pathfinding/pathfindingAlgorithms";
import { runKruskal } from "../spanning/spanningAlgorithms";
import { runHeapSort } from "../sorting/sortingAlgorithms";
import { defaultGrid, edgeKey, gridToGraph, pathCost, SAMPLE_GRAPH } from "./graph";
import type { GraphInput, GridState } from "./graphTypes";
import { makePreset } from "./arrayInput";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

function pathOf(execution: AlgorithmExecution): string[] | null {
  const value = execution.steps.find((step) => step.type === "path")?.dataStructure?.[0]?.value;
  return value === undefined ? null : String(value).split(" → ");
}

function randomGrid(random: () => number): GridState {
  const grid = defaultGrid();
  const cells = grid.cells.map(() => (random() < 0.25 ? "wall" as const : random() < 0.1 ? "heavy" as const : "empty" as const));
  const start = { col: Math.floor(random() * grid.cols), row: Math.floor(random() * grid.rows) };
  const goal = { col: (start.col + 1 + Math.floor(random() * (grid.cols - 1))) % grid.cols, row: Math.floor(random() * grid.rows) };
  cells[start.row * grid.cols + start.col] = "empty"; cells[goal.row * grid.cols + goal.col] = "empty";
  return { ...grid, cells, start, goal };
}

/** Random connected weighted graph, so the minimum spanning tree weight is well defined. */
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

/** Independent oracle: Prim's algorithm. */
function primWeight(graph: GraphInput): number {
  const inTree = new Set([graph.nodes[0].id]); let total = 0;
  while (inTree.size < graph.nodes.length) {
    const next = graph.edges.filter((edge) => inTree.has(edge.from) !== inTree.has(edge.to)).sort((a, b) => a.weight - b.weight)[0];
    if (!next) break;
    total += next.weight; inTree.add(inTree.has(next.from) ? next.to : next.from);
  }
  return total;
}

describe("heap sort", () => {
  it("sorts random, duplicate, sorted and reversed input", () => {
    const random = seeded(11);
    for (const input of [[2, 1], [5, 5, 5, 5], [1, 2, 3, 4, 5, 6], [9, 8, 7, 6, 5, 4, 3], ...Array.from({ length: 25 }, () => makePreset("random", 2 + Math.floor(random() * 20), random))]) {
      const execution = runHeapSort(input);
      expect(execution.steps.at(-2)?.values).toEqual([...input].sort((a, b) => a - b));
      expect(execution.steps.at(-1)?.type).toBe("complete");
    }
  });

  it("grows the sorted tail one place per extraction and never moves a placed value", () => {
    const execution = runHeapSort([42, 18, 64, 9, 31, 56, 23]);
    const lengths = execution.steps.map((step) => step.sortedIndices?.length ?? 0);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    const finalValues = execution.steps.at(-2)!.values!;
    for (const step of execution.steps.slice(0, -1)) for (const index of step.sortedIndices ?? []) expect(step.values![index]).toBe(finalValues[index]);
  });

  it("highlights the extraction line only on the swap that moves the root", () => {
    const steps = runHeapSort([42, 18, 64, 9, 31, 56, 23]).steps;
    expect(steps.filter((step) => step.line === 2)).toHaveLength(6);
    expect(steps.filter((step) => step.line !== undefined).every((step) => step.type === "swap")).toBe(true);
  });
});

describe("Bellman-Ford", () => {
  it("finds the same shortest cost as Dijkstra between every pair on the sample graph", () => {
    for (const start of SAMPLE_GRAPH.nodes) for (const goal of SAMPLE_GRAPH.nodes) {
      if (start.id === goal.id) continue;
      const graph = { ...SAMPLE_GRAPH, start: start.id, goal: goal.id };
      expect(pathCost(graph, pathOf(runBellmanFord(graph))!)).toBe(pathCost(graph, pathOf(runDijkstra(graph))!));
    }
  });

  it("agrees with Dijkstra on random maps, including unreachable goals", () => {
    const random = seeded(404); let routed = 0;
    for (let round = 0; round < 40; round++) {
      const graph = gridToGraph(randomGrid(random));
      const bellman = pathOf(runBellmanFord(graph)); const dijkstra = pathOf(runDijkstra(graph));
      expect(Boolean(bellman)).toBe(Boolean(dijkstra));
      if (bellman && dijkstra) { routed++; expect(pathCost(graph, bellman)).toBe(pathCost(graph, dijkstra)); }
    }
    expect(routed).toBeGreaterThan(8);
  });

  it("never lengthens a distance, stops after a pass with no change, and stays a manageable length", () => {
    const execution = runBellmanFord(gridToGraph(defaultGrid()));
    expect(execution.steps.length).toBeLessThan(1500);
    const seen = new Map<string, number>();
    for (const step of execution.steps) for (const entry of step.dataStructure ?? []) {
      if (entry.label === "Path") continue;
      const value = Number(entry.value);
      expect(value).toBeLessThanOrEqual(seen.get(entry.label) ?? Infinity);
      seen.set(entry.label, value);
    }
    const passes = execution.steps.filter((step) => step.type === "compare");
    expect(passes.at(-1)?.explanation).toContain("changed nothing");
  });

  it("explains an unreachable goal instead of inventing a path", () => {
    const grid: GridState = { cols: 3, rows: 1, cells: ["empty", "wall", "empty"], start: { col: 0, row: 0 }, goal: { col: 2, row: 0 } };
    const execution = runBellmanFord(gridToGraph(grid));
    expect(pathOf(execution)).toBeNull();
    expect(execution.steps.at(-1)?.explanation).toContain("cannot be reached");
  });
});

describe("Kruskal", () => {
  it("builds the known minimum tree of the sample graph", () => {
    const execution = runKruskal();
    const last = execution.steps.at(-1)!;
    expect(last.type).toBe("complete");
    expect([...last.acceptedEdges!].sort()).toEqual(["A-B", "B-D", "C-E", "D-F", "E-F"]);
    expect([...last.rejectedEdges!].sort()).toEqual(["A-C", "B-E"]);
    expect(last.dataStructure?.find((entry) => entry.label === "Total weight")?.value).toBe(10);
    expect(last.explanation).toContain("Minimum spanning tree found");
  });

  it("matches an independent Prim's algorithm on random connected graphs and never forms a loop", () => {
    const random = seeded(77);
    for (let round = 0; round < 40; round++) {
      const graph = randomConnectedGraph(random, 3 + Math.floor(random() * 8));
      const last = runKruskal(graph).steps.at(-1)!;
      expect(last.dataStructure?.find((entry) => entry.label === "Total weight")?.value).toBe(primWeight(graph));
      expect(last.acceptedEdges).toHaveLength(graph.nodes.length - 1);
    }
  });

  it("records a snapshot per step instead of sharing one growing list", () => {
    const steps = runKruskal().steps;
    expect(steps[0].acceptedEdges).toEqual([]);
    const counts = steps.map((step) => step.acceptedEdges?.length ?? 0);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(new Set(counts).size).toBeGreaterThan(3);
  });

  it("looks at every edge once and marks the one being examined", () => {
    const steps = runKruskal().steps;
    const examined = steps.filter((step) => step.type === "compare");
    expect(examined).toHaveLength(SAMPLE_GRAPH.edges.length);
    for (const step of examined) expect(step.activeEdge).toBeTruthy();
  });

  it("reports a spanning forest when the graph is not connected", () => {
    const graph: GraphInput = { nodes: [{ id: "A", x: 10, y: 10, heuristic: 0 }, { id: "B", x: 30, y: 10, heuristic: 0 }, { id: "C", x: 60, y: 60, heuristic: 0 }], edges: [{ from: "A", to: "B", weight: 4 }], start: "A", goal: "C" };
    const last = runKruskal(graph).steps.at(-1)!;
    expect(last.explanation).toContain("spanning forest of 2 trees");
  });
});
