import { describe, expect, it } from "vitest";
import { runEdmondsKarp, runFordFulkerson } from "../flow/maxFlow";
import { FLOW_BRIDGE_SAMPLE, FLOW_SAMPLE } from "./graph";
import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const finalStep = (execution: AlgorithmExecution) => execution.steps.at(-1)!;
const valueOf = (execution: AlgorithmExecution) => Number(finalStep(execution).dataStructure?.find((entry) => entry.label === "Max flow")?.value ?? 0);

function randomNetwork(random: () => number, size: number): GraphInput {
  const nodes = Array.from({ length: size }, (_, i) => ({ id: String.fromCharCode(65 + i), x: random() * 100, y: random() * 100, heuristic: 0 }));
  const edges: { from: string; to: string; weight: number }[] = [];
  for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) if (a !== b && random() < 0.4) edges.push({ from: nodes[a].id, to: nodes[b].id, weight: 1 + Math.floor(random() * 9) });
  return { directed: true, flow: true, nodes, edges, start: nodes[0].id, goal: nodes[size - 1].id };
}

/** Independent oracle: by max-flow min-cut, the answer is the cheapest way to cut the source off from the sink. Try every cut. */
function minCut(graph: GraphInput): number {
  const others = graph.nodes.map((node) => node.id).filter((id) => id !== graph.start && id !== graph.goal);
  let best = Infinity;
  for (let mask = 0; mask < 1 << others.length; mask++) {
    const sourceSide = new Set([graph.start, ...others.filter((_, i) => mask & (1 << i))]);
    best = Math.min(best, graph.edges.filter((edge) => sourceSide.has(edge.from) && !sourceSide.has(edge.to)).reduce((sum, edge) => sum + edge.weight, 0));
  }
  return best;
}

describe.each([["Edmonds-Karp", runEdmondsKarp], ["Ford-Fulkerson", runFordFulkerson]])("%s", (_name, run) => {
  it("finds the textbook maximum flow of 23 on the sample", () => {
    expect(valueOf(run(FLOW_SAMPLE))).toBe(23);
  });

  it("is limited by the narrow bridge, and the cut it reports is that edge", () => {
    const execution = run(FLOW_BRIDGE_SAMPLE);
    expect(valueOf(execution)).toBe(5);
    expect(finalStep(execution).dataStructure!.find((entry) => entry.label === "Cut edges")!.value).toBe("D→E (5)");
    expect(finalStep(execution).groups).toEqual([["A", "B", "C", "D"], ["E", "F"]]);
  });

  it("matches the cheapest cut on random networks, and the flow it ends with is a valid flow", () => {
    const random = seeded(8);
    let positive = 0;
    for (let trial = 0; trial < 150; trial++) {
      const graph = randomNetwork(random, 3 + Math.floor(random() * 5));
      const execution = run(graph);
      expect(valueOf(execution), `trial ${trial}`).toBe(minCut(graph));
      if (valueOf(execution) > 0) positive++;
      const flows = finalStep(execution).flows!;
      for (const edge of graph.edges) {
        const f = flows[`${edge.from}>${edge.to}`];
        expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThanOrEqual(edge.weight);
      }
      for (const node of graph.nodes) {
        if (node.id === graph.start || node.id === graph.goal) continue;
        const inflow = graph.edges.filter((edge) => edge.to === node.id).reduce((sum, edge) => sum + flows[`${edge.from}>${edge.to}`], 0);
        const outflow = graph.edges.filter((edge) => edge.from === node.id).reduce((sum, edge) => sum + flows[`${edge.from}>${edge.to}`], 0);
        expect(inflow, `conservation at ${node.id} in trial ${trial}`).toBe(outflow);
      }
      const leaving = graph.edges.filter((edge) => edge.from === graph.start).reduce((sum, edge) => sum + flows[`${edge.from}>${edge.to}`], 0);
      const entering = graph.edges.filter((edge) => edge.to === graph.start).reduce((sum, edge) => sum + flows[`${edge.from}>${edge.to}`], 0);
      expect(leaving - entering).toBe(valueOf(execution));
    }
    expect(positive).toBeGreaterThan(80);
  });

  it("reports the cut capacity equal to the flow, and says so when no flow can pass", () => {
    const execution = run(FLOW_SAMPLE);
    const text = finalStep(execution).explanation;
    expect(text).toMatch(/a total capacity of 23: the same as the flow/);
    const none: GraphInput = { ...FLOW_SAMPLE, edges: [{ from: "A", to: "B", weight: 3 }] };
    expect(finalStep(run(none)).explanation).toBe("No path from A to F has any room, so no flow can pass.");
  });

  it("never lets the total go down, and sends exactly what each round announced", () => {
    const execution = run(FLOW_SAMPLE);
    let total = 0;
    for (const step of execution.steps) {
      expect(step.metrics!.flow!).toBeGreaterThanOrEqual(total);
      total = step.metrics!.flow!;
    }
    const sends = execution.steps.filter((step) => step.type === "update");
    expect(sends.length).toBeGreaterThan(2);
    expect(Number(/Send (\d+)/.exec(sends[0].explanation)![1])).toBe(sends[0].metrics!.flow);
  });
});

describe("how the two differ", () => {
  it("Edmonds-Karp always takes a path with the fewest edges; Ford-Fulkerson takes the first it finds", () => {
    const ek = runEdmondsKarp(FLOW_SAMPLE).steps.filter((step) => step.type === "compare");
    const edges = (step: (typeof ek)[number]) => step.visited!.length - 1;
    // Fewest edges first: the lengths of its paths never shrink from one round to the next.
    for (let i = 1; i < ek.length; i++) expect(edges(ek[i])).toBeGreaterThanOrEqual(edges(ek[i - 1]));
    expect(edges(ek[0])).toBe(3);
    const ff = runFordFulkerson(FLOW_SAMPLE).steps.filter((step) => step.type === "compare");
    expect(ff[0].explanation).toMatch(/the first path found is/);
    expect(runFordFulkerson(FLOW_SAMPLE).steps.at(-1)!.metrics!.flow).toBe(runEdmondsKarp(FLOW_SAMPLE).steps.at(-1)!.metrics!.flow);
  });

  it("reaches the best answer on a network where one greedy path blocks another", () => {
    // A → B → D → F and A → C → E → F carry 2 together; A → C → B → D → F would block that if flow could not be taken back.
    const graph: GraphInput = { directed: true, flow: true, start: "A", goal: "F", nodes: ["A", "B", "C", "D", "E", "F"].map((id, i) => ({ id, x: 10 + i * 14, y: 50, heuristic: 0 })), edges: [{ from: "A", to: "B", weight: 1 }, { from: "A", to: "C", weight: 1 }, { from: "B", to: "D", weight: 1 }, { from: "C", to: "B", weight: 1 }, { from: "C", to: "E", weight: 1 }, { from: "D", to: "F", weight: 1 }, { from: "E", to: "F", weight: 1 }] };
    expect(valueOf(runFordFulkerson(graph))).toBe(2);
    expect(valueOf(runEdmondsKarp(graph))).toBe(2);
  });
});

describe("the sample where depth-first needs many rounds", () => {
  it("reaches the same flow in 9 rounds with Ford-Fulkerson against 3 with Edmonds-Karp", async () => {
    const { FLOW_ZIGZAG_SAMPLE } = await import("./graph");
    const rounds = (execution: AlgorithmExecution) => execution.steps.filter((step) => step.type === "update").length;
    const ek = runEdmondsKarp(FLOW_ZIGZAG_SAMPLE); const ff = runFordFulkerson(FLOW_ZIGZAG_SAMPLE);
    expect(valueOf(ek)).toBe(valueOf(ff));
    expect(valueOf(ek)).toBe(minCut(FLOW_ZIGZAG_SAMPLE));
    expect(rounds(ek)).toBe(3);
    expect(rounds(ff)).toBe(9);
    // Some of those rounds are spent undoing flow that an earlier round put on a thin edge.
    expect(ff.steps.some((step) => step.type === "compare" && /takes back flow on/.test(step.explanation))).toBe(true);
  });
});
