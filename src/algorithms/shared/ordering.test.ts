import { describe, expect, it } from "vitest";
import { CYCLE_LABEL, runDfsTopological, runKahn } from "../ordering/orderingAlgorithms";
import { DAG_CYCLE_SAMPLE, DAG_SAMPLE } from "./graph";
import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const entry = (execution: AlgorithmExecution, label: string) => execution.steps.at(-1)!.dataStructure?.find((item) => item.label === label)?.value;
const orderOf = (execution: AlgorithmExecution) => { const value = entry(execution, "Order"); return value === undefined ? null : String(value).split(" → "); };
const cycleOf = (execution: AlgorithmExecution) => { const value = entry(execution, CYCLE_LABEL); return value === undefined ? null : String(value).split(" → "); };

/** Random directed graph; with `acyclic` every edge goes from a lower to a higher node, so no loop can form. */
function randomTasks(random: () => number, size: number, acyclic: boolean): GraphInput {
  const nodes = Array.from({ length: size }, (_, i) => ({ id: String.fromCharCode(65 + i), x: random() * 100, y: random() * 100, heuristic: 0 }));
  const edges: { from: string; to: string; weight: number }[] = [];
  for (let a = 0; a < size; a++) for (let b = 0; b < size; b++) if (a !== b && (!acyclic || a < b) && random() < 0.25) edges.push({ from: nodes[a].id, to: nodes[b].id, weight: 1 });
  return { directed: true, unweighted: true, nodes, edges, start: nodes[0].id, goal: nodes[size - 1].id };
}

/** Independent oracle: a graph has a loop exactly when some task can reach itself. */
function hasLoop(graph: GraphInput): boolean {
  const ids = graph.nodes.map((node) => node.id);
  const reach = ids.map((a) => ids.map((b) => graph.edges.some((edge) => edge.from === a && edge.to === b)));
  for (let k = 0; k < ids.length; k++) for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true;
  return ids.some((_, i) => reach[i][i]);
}

describe.each([["Kahn", runKahn], ["Depth-first ordering", runDfsTopological]])("%s", (_name, run) => {
  it("orders the sample tasks so every task comes after the ones it depends on", () => {
    const order = orderOf(run(DAG_SAMPLE))!;
    expect([...order].sort()).toEqual(DAG_SAMPLE.nodes.map((node) => node.id));
    for (const edge of DAG_SAMPLE.edges) expect(order.indexOf(edge.from)).toBeLessThan(order.indexOf(edge.to));
  });

  it("gives a valid order for random acyclic graphs and finds a real loop in cyclic ones, agreeing with an independent check", () => {
    const random = seeded(17);
    let loops = 0; let orders = 0;
    for (let trial = 0; trial < 120; trial++) {
      const graph = randomTasks(random, 2 + Math.floor(random() * 9), trial % 2 === 0);
      const execution = run(graph);
      if (hasLoop(graph)) {
        loops++;
        expect(orderOf(execution), `order ${trial}`).toBeNull();
        const cycle = cycleOf(execution)!;
        expect(cycle, `cycle ${trial}`).not.toBeNull();
        expect(cycle[0]).toBe(cycle.at(-1));
        for (let i = 1; i < cycle.length; i++) expect(graph.edges.some((edge) => edge.from === cycle[i - 1] && edge.to === cycle[i]), `edge ${cycle[i - 1]}→${cycle[i]}`).toBe(true);
      } else {
        orders++;
        const order = orderOf(execution)!;
        expect(order, `order ${trial}`).not.toBeNull();
        expect([...order].sort()).toEqual(graph.nodes.map((node) => node.id).sort());
        for (const edge of graph.edges) expect(order.indexOf(edge.from)).toBeLessThan(order.indexOf(edge.to));
      }
    }
    expect(loops).toBeGreaterThan(10);
    expect(orders).toBeGreaterThan(40);
  });

  it("reports the loop that the extra rule creates in the sample, and no order", () => {
    const execution = run(DAG_CYCLE_SAMPLE);
    expect(orderOf(execution)).toBeNull();
    expect(execution.steps.at(-1)!.explanation).toMatch(/^No order exists: the dependency loop /);
    expect(cycleOf(execution)!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Kahn's algorithm steps", () => {
  it("starts from the tasks that wait for nothing and releases tasks as soon as their last dependency is placed", () => {
    const execution = runKahn(DAG_SAMPLE);
    expect(execution.steps[0].frontier).toEqual(["A"]);
    const took = execution.steps.filter((step) => step.type === "dequeue").map((step) => step.currentNode);
    expect(took).toHaveLength(6);
    const released = execution.steps.filter((step) => step.type === "discover").map((step) => step.targetNode);
    // D needs both B and C, so it is only released by the later of the two.
    expect(released.filter((id) => id === "D")).toHaveLength(1);
    expect(execution.steps.some((step) => step.type === "update" && step.targetNode === "D")).toBe(true);
    expect(execution.steps.at(-1)!.metrics!.operations).toBe(DAG_SAMPLE.edges.length);
  });
});
