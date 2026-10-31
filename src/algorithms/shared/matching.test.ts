import { describe, expect, it } from "vitest";
import { runEdmondsKarp } from "../flow/maxFlow";
import { NOT_BIPARTITE_LABEL, runGreedyMatching, runKuhn, splitSides } from "../matching/bipartiteMatching";
import { MATCH_HALL_SAMPLE, MATCH_SAMPLE } from "./graph";
import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const finalStep = (execution: AlgorithmExecution) => execution.steps.at(-1)!;
const sizeOf = (execution: AlgorithmExecution) => Math.max(0, ...execution.steps.map((step) => step.metrics?.matched ?? 0));
const pairsOf = (execution: AlgorithmExecution) => String(finalStep(execution).dataStructure!.find((entry) => entry.label === "Matched pairs")!.value).split(", ").filter((text) => text !== "none yet").map((text) => text.split("–") as [string, string]);

function randomBipartite(random: () => number, leftCount: number, rightCount: number, density: number): GraphInput {
  const left = Array.from({ length: leftCount }, (_, i) => `L${i}`); const right = Array.from({ length: rightCount }, (_, i) => `R${i}`);
  const nodes = [...left, ...right].map((id, i) => ({ id, x: id.startsWith("L") ? 20 : 80, y: 10 + i * 7, heuristic: 0 }));
  const edges: { from: string; to: string; weight: number }[] = [];
  for (const l of left) for (const r of right) if (random() < density) edges.push({ from: l, to: r, weight: 1 });
  return { unweighted: true, nodes, edges, start: nodes[0].id, goal: nodes.at(-1)!.id };
}

/** Independent oracle: the biggest matching is the maximum flow of source → left → right → sink with every capacity 1. */
function flowOracle(graph: GraphInput): number {
  const sides = splitSides(graph); if (sides.conflict) throw new Error("not bipartite");
  const network: GraphInput = {
    directed: true, flow: true, start: "S", goal: "T",
    nodes: [{ id: "S", x: 0, y: 0, heuristic: 0 }, ...graph.nodes, { id: "T", x: 100, y: 0, heuristic: 0 }],
    edges: [...sides.left.map((id) => ({ from: "S", to: id, weight: 1 })), ...graph.edges.map((edge) => (sides.left.includes(edge.from) ? { from: edge.from, to: edge.to, weight: 1 } : { from: edge.to, to: edge.from, weight: 1 })), ...sides.right.map((id) => ({ from: id, to: "T", weight: 1 }))],
  };
  return Number(finalStep(runEdmondsKarp(network)).dataStructure!.find((entry) => entry.label === "Max flow")?.value ?? 0);
}

describe("splitting into two sides", () => {
  it("puts the people on one side and the jobs on the other", () => {
    const sides = splitSides(MATCH_SAMPLE);
    expect(sides).toEqual({ left: ["A", "B", "C", "D"], right: ["1", "2", "3", "4"] });
  });

  it("finds the edge that stops a triangle from being split, and both algorithms say so", () => {
    const triangle: GraphInput = { unweighted: true, start: "A", goal: "C", nodes: ["A", "B", "C"].map((id, i) => ({ id, x: 10 + i * 30, y: 50, heuristic: 0 })), edges: [{ from: "A", to: "B", weight: 1 }, { from: "B", to: "C", weight: 1 }, { from: "A", to: "C", weight: 1 }] };
    expect(splitSides(triangle).conflict).toBeDefined();
    for (const run of [runKuhn, runGreedyMatching]) {
      const execution = run(triangle);
      expect(finalStep(execution).dataStructure!.some((entry) => entry.label === NOT_BIPARTITE_LABEL)).toBe(true);
      expect(finalStep(execution).explanation).toMatch(/^No bipartite matching here: the edge /);
    }
  });
});

describe("Kuhn's algorithm", () => {
  it("pairs all four people with a job on the sample, moving earlier pairs when it has to", () => {
    const execution = runKuhn(MATCH_SAMPLE);
    expect(sizeOf(execution)).toBe(4);
    expect(execution.steps.some((step) => step.type === "update")).toBe(true);
    expect(execution.steps.some((step) => step.type === "accept" && /moves from/.test(step.explanation))).toBe(true);
  });

  it("leaves one person out when three want only two jobs, whatever it tries", () => {
    const execution = runKuhn(MATCH_HALL_SAMPLE);
    expect(sizeOf(execution)).toBe(3);
    expect(execution.steps.some((step) => step.type === "reject")).toBe(true);
    expect(finalStep(execution).dataStructure!.find((entry) => entry.label === "Unmatched")!.value).toMatch(/[ABC]/);
  });

  it("matches the maximum flow on random two-sided graphs, with a valid matching every time", () => {
    const random = seeded(61);
    let positive = 0;
    for (let trial = 0; trial < 150; trial++) {
      const graph = randomBipartite(random, 1 + Math.floor(random() * 5), 1 + Math.floor(random() * 5), 0.2 + random() * 0.5);
      const execution = runKuhn(graph);
      expect(sizeOf(execution), `trial ${trial}`).toBe(flowOracle(graph));
      const pairs = pairsOf(execution);
      expect(pairs.length).toBe(sizeOf(execution));
      expect(new Set(pairs.map(([l]) => l)).size).toBe(pairs.length);
      expect(new Set(pairs.map(([, r]) => r)).size).toBe(pairs.length);
      for (const [l, r] of pairs) expect(graph.edges.some((edge) => (edge.from === l && edge.to === r) || (edge.from === r && edge.to === l)), `${l}–${r}`).toBe(true);
      if (pairs.length > 0) positive++;
    }
    expect(positive).toBeGreaterThan(100);
  });

  it("never shows one node in two pairs at once while it flips a chain", () => {
    const execution = runKuhn(MATCH_SAMPLE);
    for (const step of execution.steps) {
      const nodes = (step.visited ?? []);
      expect(new Set(nodes).size).toBe(nodes.length);
    }
  });
});

describe("greedy matching", () => {
  it("gives B no job on the sample, so it matches 3 where Kuhn matches 4", () => {
    const greedy = runGreedyMatching(MATCH_SAMPLE);
    expect(sizeOf(greedy)).toBe(3);
    expect(finalStep(greedy).explanation).toMatch(/Greedy never moves a pair that is already made/);
    expect(sizeOf(runKuhn(MATCH_SAMPLE))).toBe(4);
  });

  it("is always maximal (no edge has both ends free) and never beats the best, on random graphs", () => {
    const random = seeded(5);
    let smaller = 0;
    for (let trial = 0; trial < 100; trial++) {
      const graph = randomBipartite(random, 2 + Math.floor(random() * 4), 2 + Math.floor(random() * 4), 0.2 + random() * 0.4);
      const execution = runGreedyMatching(graph);
      const used = new Set(pairsOf(execution).flat());
      expect(graph.edges.every((edge) => used.has(edge.from) || used.has(edge.to)), `trial ${trial}`).toBe(true);
      expect(sizeOf(execution)).toBeLessThanOrEqual(flowOracle(graph));
      if (sizeOf(execution) < flowOracle(graph)) smaller++;
    }
    expect(smaller).toBeGreaterThan(0);
  });
});
