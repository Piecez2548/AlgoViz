import { describe, expect, it } from "vitest";
import { runBfs } from "../search/searchAlgorithms";
import { runBellmanFord, runDijkstra, runFloydWarshall } from "../pathfinding/pathfindingAlgorithms";
import { DIRECTED_CYCLE_SAMPLE, DIRECTED_SAMPLE, getNeighbors, pathCost } from "./graph";
import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const routeOf = (execution: AlgorithmExecution) => {
  const value = execution.steps.find((step) => step.type === "path")?.dataStructure?.find((entry) => entry.label === "Path")?.value;
  return value === undefined ? null : String(value).split(" → ");
};
const cycleOf = (execution: AlgorithmExecution) => execution.steps.at(-1)!.dataStructure?.find((entry) => entry.label === "Negative cycle")?.value;

/** Independent oracle: all-pairs distances by repeated relaxation, and whether any node can reach a negative loop. */
function oracle(graph: GraphInput) {
  const ids = graph.nodes.map((node) => node.id); const n = ids.length;
  const d = ids.map((a) => ids.map((b) => (a === b ? 0 : Infinity)));
  for (const edge of graph.edges) d[ids.indexOf(edge.from)][ids.indexOf(edge.to)] = Math.min(d[ids.indexOf(edge.from)][ids.indexOf(edge.to)], edge.weight);
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  const s = ids.indexOf(graph.start); const g = ids.indexOf(graph.goal);
  const cycle = ids.some((_, i) => d[i][i] < 0 && Number.isFinite(d[s][i]) && Number.isFinite(d[i][g]));
  return { cycle, cost: d[s][g] };
}

/** Random directed graph with weights from -4 to 9, so negative edges and negative cycles both turn up. */
function randomDirected(random: () => number, size: number): GraphInput {
  const nodes = Array.from({ length: size }, (_, i) => ({ id: String.fromCharCode(65 + i), x: random() * 100, y: random() * 100, heuristic: 0 }));
  const edges: { from: string; to: string; weight: number }[] = [];
  for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) if (a !== b && random() < 0.35) edges.push({ from: nodes[a].id, to: nodes[b].id, weight: Math.floor(random() * 14) - 4 });
  return { directed: true, nodes, edges, start: nodes[0].id, goal: nodes[size - 1].id };
}

describe("directed graphs", () => {
  it("only follow an edge in its own direction", () => {
    expect(getNeighbors(DIRECTED_SAMPLE, "B").map((edge) => edge.to)).toEqual(["D"]);
    expect(getNeighbors({ ...DIRECTED_SAMPLE, directed: false }, "B").map((edge) => edge.to).sort()).toEqual(["A", "C", "D"]);
  });
});

describe("negative weights", () => {
  it("Bellman-Ford finds the cheaper route through the negative edge that Dijkstra misses", () => {
    const route = routeOf(runBellmanFord(DIRECTED_SAMPLE))!;
    expect(route).toEqual(["A", "C", "B", "D", "F"]);
    expect(pathCost(DIRECTED_SAMPLE, route)).toBe(7);
    const dijkstra = routeOf(runDijkstra(DIRECTED_SAMPLE))!;
    expect(pathCost(DIRECTED_SAMPLE, dijkstra)).toBe(9);
  });

  it("Floyd-Warshall agrees with Bellman-Ford on the sample", () => {
    expect(routeOf(runFloydWarshall(DIRECTED_SAMPLE))).toEqual(["A", "C", "B", "D", "F"]);
  });

  it("matches an independent oracle on random directed graphs: same cost, or both report a negative cycle", () => {
    const random = seeded(99);
    let cycles = 0; let routes = 0;
    for (let trial = 0; trial < 200; trial++) {
      const graph = randomDirected(random, 3 + Math.floor(random() * 6));
      const expected = oracle(graph);
      const bellman = runBellmanFord(graph); const floyd = runFloydWarshall(graph);
      if (expected.cycle) {
        cycles++;
        expect(cycleOf(bellman), `bellman ${trial}`).toBeDefined();
        expect(cycleOf(floyd), `floyd ${trial}`).toBeDefined();
        expect(routeOf(bellman)).toBeNull(); expect(routeOf(floyd)).toBeNull();
      } else {
        expect(cycleOf(bellman), `bellman ${trial}`).toBeUndefined();
        expect(cycleOf(floyd), `floyd ${trial}`).toBeUndefined();
        for (const execution of [bellman, floyd]) {
          const route = routeOf(execution);
          expect(route === null).toBe(!Number.isFinite(expected.cost));
          if (route) { routes++; expect(pathCost(graph, route)).toBe(expected.cost); }
        }
      }
    }
    expect(cycles).toBeGreaterThan(20);
    expect(routes).toBeGreaterThan(20);
  });

  it("names a real negative cycle: it is a closed loop of edges whose weights add up below zero", () => {
    const execution = runBellmanFord(DIRECTED_CYCLE_SAMPLE);
    const cycle = String(cycleOf(execution)).split(" → ");
    expect(cycle[0]).toBe(cycle.at(-1));
    expect(pathCost(DIRECTED_CYCLE_SAMPLE, cycle)).toBeLessThan(0);
    expect(execution.steps.at(-1)!.explanation).toMatch(/negative cycle .* can be reached from A/);
    expect(routeOf(execution)).toBeNull();
  });

  it("ignores a negative cycle that the route cannot touch", () => {
    const graph: GraphInput = { directed: true, nodes: ["A", "B", "X", "Y"].map((id, i) => ({ id, x: 10 + i * 20, y: 50, heuristic: 0 })), edges: [{ from: "A", to: "B", weight: 2 }, { from: "X", to: "Y", weight: -3 }, { from: "Y", to: "X", weight: 1 }], start: "A", goal: "B" };
    expect(routeOf(runFloydWarshall(graph))).toEqual(["A", "B"]);
    expect(cycleOf(runFloydWarshall(graph))).toBeUndefined();
    expect(runFloydWarshall(graph).steps.at(-1)!.explanation).toMatch(/X, Y lie on a negative cycle, but not on any route/);
    expect(routeOf(runBellmanFord(graph))).toEqual(["A", "B"]);
  });

  it("leaves two-way graphs alone: no negative cycle is ever reported for positive weights", () => {
    const graph = { ...DIRECTED_SAMPLE, directed: false, edges: DIRECTED_SAMPLE.edges.map((edge) => ({ ...edge, weight: Math.abs(edge.weight) })) };
    expect(cycleOf(runBellmanFord(graph))).toBeUndefined();
    expect(routeOf(runBellmanFord(graph))).not.toBeNull();
    expect(routeOf(runBfs(graph))).not.toBeNull();
  });
});
