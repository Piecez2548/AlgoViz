import { DAG_SAMPLE } from "../shared/graph";
import type { GraphInput } from "../shared/graphTypes";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";
import { createAlgorithmStep } from "../shared/utils";

/** The label under which a run reports a dependency loop, so no order exists. */
export const CYCLE_LABEL = "Cycle";

const finish = (algorithmId: string, graph: GraphInput, steps: AlgorithmStep[]): AlgorithmExecution => ({ algorithmId, inputLabel: `${graph.label ?? "Task graph"} · ${graph.nodes.length} tasks, ${graph.edges.length} dependencies`, steps, completed: true });

/** Closes a walk that came back to `at`: the walk lists nodes against the direction of the edges, so reverse it. */
const loopFrom = (walk: readonly string[], at: string): string[] => {
  const loop = walk.slice(walk.indexOf(at));
  return [at, ...loop.slice(1).reverse(), at];
};

/**
 * Kahn's algorithm: a task can go next once nothing it depends on is still waiting. Keep a queue of
 * tasks with no unplaced dependencies, take one, place it, and release the tasks that were waiting on
 * it. If tasks are left over when the queue runs dry, they wait on each other in a loop.
 * Edges point from a task to the tasks that depend on it.
 */
export function runKahn(graph: GraphInput = DAG_SAMPLE): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const waiting = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) waiting.set(edge.to, (waiting.get(edge.to) ?? 0) + 1);
  const queue = graph.nodes.filter((node) => waiting.get(node.id) === 0).map((node) => node.id);
  const order: string[] = [];
  let checks = 0;
  const data = () => [{ label: "Order so far", value: order.join(", ") || "none yet" }, { label: "Queue", value: queue.join(", ") || "empty" }, { label: "Still waiting on", value: graph.nodes.filter((node) => (waiting.get(node.id) ?? 0) > 0).map((node) => `${node.id}:${waiting.get(node.id)}`).join(" ") || "nothing" }];
  const base = () => ({ visited: [...order], frontier: [...queue], dataStructure: data(), metrics: { visitedNodes: order.length, operations: checks } });
  steps.push(createAlgorithmStep(0, "enqueue", queue.length ? `Count how many tasks each one waits for. ${queue.join(", ")} wait${queue.length === 1 ? "s" : ""} for nothing, so ${queue.length === 1 ? "it goes" : "they go"} in the queue.` : "Count how many tasks each one waits for. Every task waits for another one, so the queue starts empty.", { ...base(), currentNode: queue[0] }));
  while (queue.length) {
    const current = queue.shift()!;
    order.push(current);
    steps.push(createAlgorithmStep(steps.length, "dequeue", `Take ${current}: nothing it needs is left, so it is next in the order.`, { ...base(), currentNode: current }));
    for (const edge of graph.edges) {
      if (edge.from !== current) continue;
      checks++;
      const left = (waiting.get(edge.to) ?? 0) - 1;
      waiting.set(edge.to, left);
      if (left === 0) {
        queue.push(edge.to);
        steps.push(createAlgorithmStep(steps.length, "discover", `${edge.to} was only waiting for ${current}. It is free now, so it joins the queue.`, { ...base(), currentNode: current, targetNode: edge.to }));
      } else {
        steps.push(createAlgorithmStep(steps.length, "update", `${edge.to} no longer waits for ${current}, but still waits for ${left} other task${left === 1 ? "" : "s"}.`, { ...base(), currentNode: current, targetNode: edge.to }));
      }
    }
  }
  if (order.length === graph.nodes.length) {
    steps.push(createAlgorithmStep(steps.length, "complete", `Every task is placed. Order: ${order.join(" → ")}.`, { ...base(), dataStructure: [{ label: "Order", value: order.join(" → ") }] }));
    return finish("kahn", graph, steps);
  }
  // Every task still waiting has a dependency among the leftovers, so walking back along them must come round to a loop.
  const left = new Set(graph.nodes.filter((node) => !order.includes(node.id)).map((node) => node.id));
  const walk: string[] = []; let at: string | undefined = [...left][0];
  while (at !== undefined && !walk.includes(at)) { walk.push(at); at = graph.edges.find((edge) => edge.to === at && left.has(edge.from))?.from; }
  const cycle = at === undefined ? [...left] : loopFrom(walk, at);
  steps.push(createAlgorithmStep(steps.length, "reject", `The queue is empty but ${[...left].join(", ")} ${left.size === 1 ? "is" : "are"} not placed. They wait on each other in a loop: ${cycle.join(" → ")}.`, { ...base(), dataStructure: [{ label: CYCLE_LABEL, value: cycle.join(" → ") }, ...data()] }));
  steps.push(createAlgorithmStep(steps.length, "complete", `No order exists: the dependency loop ${cycle.join(" → ")} can never be satisfied.`, { ...base(), dataStructure: [{ label: CYCLE_LABEL, value: cycle.join(" → ") }] }));
  return finish("kahn", graph, steps);
}

/**
 * Depth-first topological sort: explore from a task as deep as possible along the edges; a task is
 * finished once everything it leads to is finished, and finished tasks are placed in front of the ones
 * finished before them. Meeting a task that is still being explored means a loop.
 */
export function runDfsTopological(graph: GraphInput = DAG_SAMPLE): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const state = new Map<string, "exploring" | "done">();
  const path: string[] = [];
  const placed: string[] = [];
  let checks = 0;
  let cycle: string[] | null = null;
  const data = () => [{ label: "Order so far", value: placed.join(", ") || "none yet" }, { label: "Exploring", value: path.join(" → ") || "nothing" }];
  const base = () => ({ visited: [...state.keys()].filter((id) => state.get(id) === "done"), frontier: [...path], dataStructure: data(), metrics: { visitedNodes: placed.length, operations: checks } });
  steps.push(createAlgorithmStep(0, "enqueue", "Explore each task in turn, following dependencies as deep as they go. A task is placed once everything that depends on it is placed.", { ...base() }));
  const explore = (id: string) => {
    state.set(id, "exploring"); path.push(id);
    steps.push(createAlgorithmStep(steps.length, "visit", `Start exploring ${id}.`, { ...base(), currentNode: id }));
    for (const edge of graph.edges) {
      if (edge.from !== id || cycle) continue;
      checks++;
      const seen = state.get(edge.to);
      if (seen === "exploring") {
        cycle = [...path.slice(path.indexOf(edge.to)), edge.to];
        steps.push(createAlgorithmStep(steps.length, "reject", `${edge.to} is still being explored, so ${id} leads back to it: a loop ${cycle.join(" → ")}.`, { ...base(), currentNode: id, targetNode: edge.to, dataStructure: [{ label: CYCLE_LABEL, value: cycle.join(" → ") }, ...data()] }));
      } else if (!seen) explore(edge.to);
    }
    if (cycle) return;
    state.set(id, "done"); path.pop(); placed.unshift(id);
    steps.push(createAlgorithmStep(steps.length, "dequeue", `${id} is finished: everything that depends on it is already placed, so it goes in front of them.`, { ...base(), currentNode: id }));
  };
  for (const node of graph.nodes) { if (!state.has(node.id) && !cycle) explore(node.id); }
  if (cycle) {
    steps.push(createAlgorithmStep(steps.length, "complete", `No order exists: the dependency loop ${(cycle as string[]).join(" → ")} can never be satisfied.`, { ...base(), dataStructure: [{ label: CYCLE_LABEL, value: (cycle as string[]).join(" → ") }] }));
  } else {
    steps.push(createAlgorithmStep(steps.length, "complete", `Every task is placed. Order: ${placed.join(" → ")}.`, { ...base(), dataStructure: [{ label: "Order", value: placed.join(" → ") }] }));
  }
  return finish("dfs-topological", graph, steps);
}
