import { describe, expect, it } from "vitest";
import { runKosaraju, runTarjan } from "../connectivity/stronglyConnected";
import { DAG_SAMPLE, SCC_SAMPLE } from "./graph";
import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
/** The partition as a sorted list of sorted groups, so two runs can be compared whatever order they found them in. */
const partition = (groups: readonly (readonly string[])[]) => groups.map((group) => [...group].sort().join("")).sort();
const found = (execution: AlgorithmExecution) => partition(execution.steps.at(-1)!.groups!);

function randomDigraph(random: () => number, size: number, density: number): GraphInput {
  const nodes = Array.from({ length: size }, (_, i) => ({ id: String.fromCharCode(65 + i), x: random() * 100, y: random() * 100, heuristic: 0 }));
  const edges: { from: string; to: string; weight: number }[] = [];
  for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) if (a !== b && random() < density) edges.push({ from: nodes[a].id, to: nodes[b].id, weight: 1 });
  return { directed: true, unweighted: true, nodes, edges, start: nodes[0].id, goal: nodes[size - 1].id };
}

/** Independent oracle: two nodes share a component exactly when each can reach the other. */
function oracle(graph: GraphInput): string[] {
  const ids = graph.nodes.map((node) => node.id); const n = ids.length;
  const reach = ids.map((a, i) => ids.map((b, j) => i === j || graph.edges.some((edge) => edge.from === a && edge.to === b)));
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true;
  const groups: string[][] = []; const done = new Set<number>();
  for (let i = 0; i < n; i++) { if (done.has(i)) continue; const group = ids.filter((_, j) => reach[i][j] && reach[j][i]); group.forEach((id) => done.add(ids.indexOf(id))); groups.push(group); }
  return partition(groups);
}

describe.each([["Tarjan", runTarjan], ["Kosaraju", runKosaraju]])("%s", (_name, run) => {
  it("finds the three loops and the lone node in the sample", () => {
    expect(found(run(SCC_SAMPLE))).toEqual(["ABC", "DE", "FG", "H"]);
  });

  it("puts every node alone when there are no loops", () => {
    expect(found(run(DAG_SAMPLE))).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("matches an independent reachability check on 150 random directed graphs", () => {
    const random = seeded(4);
    let merged = 0;
    for (let trial = 0; trial < 150; trial++) {
      const graph = randomDigraph(random, 2 + Math.floor(random() * 9), 0.1 + random() * 0.3);
      const expected = oracle(graph);
      expect(found(run(graph)), `trial ${trial}`).toEqual(expected);
      if (expected.some((group) => group.length > 1)) merged++;
    }
    expect(merged).toBeGreaterThan(40);
  });

  it("shows each component as its own group in the steps, and the groups only ever grow", () => {
    const execution = run(SCC_SAMPLE);
    let placed = 0;
    for (const step of execution.steps) {
      const count = (step.groups ?? []).flat().length;
      // Kosaraju shows the component being built as a group too, so the count never shrinks.
      expect(count).toBeGreaterThanOrEqual(placed);
      placed = count;
    }
    expect(execution.steps.at(-1)!.explanation).toMatch(/^Found 4 strongly connected components: /);
  });
});

describe("Tarjan's steps", () => {
  it("only closes a component when a node's lowlink equals its own number", () => {
    const execution = runTarjan(SCC_SAMPLE);
    const closed = execution.steps.filter((step) => step.type === "accept");
    expect(closed).toHaveLength(4);
    for (const step of closed) expect(step.explanation).toMatch(/lowlink equals its own number/);
  });
});

describe("Kosaraju's steps", () => {
  it("runs two passes and finds the first component from the node that finished last", () => {
    const execution = runKosaraju(SCC_SAMPLE);
    const turn = execution.steps.findIndex((step) => step.explanation.startsWith("Pass 2: walk the edges backwards"));
    expect(turn).toBeGreaterThan(0);
    expect(execution.steps.slice(0, turn).every((step) => !step.groups?.length)).toBe(true);
    expect(execution.steps.filter((step) => step.type === "accept")).toHaveLength(4);
    expect(execution.steps.at(-1)!.groups!.at(0)).toContain("A");
  });
});
