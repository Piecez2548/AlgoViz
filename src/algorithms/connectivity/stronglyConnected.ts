import { SCC_SAMPLE } from "../shared/graph";
import type { GraphInput } from "../shared/graphTypes";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";
import { createAlgorithmStep } from "../shared/utils";

const braces = (groups: readonly (readonly string[])[]) => groups.map((group) => `{${[...group].sort().join(", ")}}`).join(" ") || "none yet";

function finish(algorithmId: string, graph: GraphInput, steps: AlgorithmStep[], groups: readonly (readonly string[])[], checks: number): AlgorithmExecution {
  const count = groups.length;
  steps.push(createAlgorithmStep(steps.length, "complete", `Found ${count} strongly connected component${count === 1 ? "" : "s"}: ${braces(groups)}. Inside a component every task can reach every other; between components the edges only go one way.`, { visited: graph.nodes.map((node) => node.id), groups, dataStructure: [{ label: "Components", value: braces(groups) }], metrics: { visitedNodes: graph.nodes.length, operations: checks } }));
  return { algorithmId, inputLabel: `${graph.label ?? "Directed graph"} · ${graph.nodes.length} nodes, ${graph.edges.length} edges`, steps, completed: true };
}

const outgoing = (graph: GraphInput, id: string) => graph.edges.filter((edge) => edge.from === id).map((edge) => edge.to);
const incoming = (graph: GraphInput, id: string) => graph.edges.filter((edge) => edge.to === id).map((edge) => edge.from);

/**
 * Tarjan's algorithm: one depth-first search. Each node gets a number in the order it is reached and a
 * "lowlink", the smallest number it can get back to through the nodes still on the stack. A node whose
 * lowlink equals its own number is the root of a component: everything above it on the stack belongs to it.
 */
export function runTarjan(graph: GraphInput = SCC_SAMPLE): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const number = new Map<string, number>(); const low = new Map<string, number>();
  const stack: string[] = []; const onStack = new Set<string>();
  const groups: string[][] = [];
  let counter = 0; let checks = 0;
  const numbers = () => [...number.keys()].map((id) => `${id}:${number.get(id)}/${low.get(id)}`).join(" ") || "none yet";
  const base = () => ({ visited: [...number.keys()], frontier: [...stack], groups: groups.map((group) => [...group]), dataStructure: [{ label: "Stack", value: stack.join(", ") || "empty" }, { label: "Number / lowlink", value: numbers() }, { label: "Components", value: braces(groups) }], metrics: { visitedNodes: number.size, operations: checks } });
  steps.push(createAlgorithmStep(0, "enqueue", "Search depth-first. Each node gets a number when it is reached and a lowlink: the smallest number it can get back to.", { ...base() }));
  const strong = (v: string) => {
    number.set(v, counter); low.set(v, counter); counter++; stack.push(v); onStack.add(v);
    steps.push(createAlgorithmStep(steps.length, "visit", `Reach ${v}: number ${number.get(v)}, lowlink ${low.get(v)}. Push it on the stack.`, { ...base(), currentNode: v }));
    for (const w of outgoing(graph, v)) {
      checks++;
      if (!number.has(w)) {
        strong(w);
        if (low.get(w)! < low.get(v)!) {
          low.set(v, low.get(w)!);
          steps.push(createAlgorithmStep(steps.length, "update", `Back at ${v}: ${w} can get back to number ${low.get(w)}, so ${v}'s lowlink becomes ${low.get(v)}.`, { ...base(), currentNode: v, targetNode: w }));
        }
      } else if (onStack.has(w)) {
        if (number.get(w)! < low.get(v)!) {
          low.set(v, number.get(w)!);
          steps.push(createAlgorithmStep(steps.length, "update", `${v} → ${w}, and ${w} is still on the stack, so ${v} can get back to number ${number.get(w)}: lowlink ${low.get(v)}.`, { ...base(), currentNode: v, targetNode: w }));
        } else {
          steps.push(createAlgorithmStep(steps.length, "compare", `${v} → ${w}, and ${w} is on the stack, but it does not reach back any further than ${v} already can.`, { ...base(), currentNode: v, targetNode: w }));
        }
      } else {
        steps.push(createAlgorithmStep(steps.length, "reject", `${v} → ${w}, but ${w} already belongs to a finished component, so the edge does not connect them back.`, { ...base(), currentNode: v, targetNode: w }));
      }
    }
    if (low.get(v) === number.get(v)) {
      const component: string[] = [];
      for (let top: string | undefined; top !== v;) { top = stack.pop()!; onStack.delete(top); component.push(top); }
      groups.push(component);
      steps.push(createAlgorithmStep(steps.length, "accept", `${v}'s lowlink equals its own number, so nothing above it reaches back past it: ${braces([component])} is a component. Pop it off the stack.`, { ...base(), currentNode: v }));
    }
  };
  for (const node of graph.nodes) if (!number.has(node.id)) strong(node.id);
  return finish("tarjan", graph, steps, groups, checks);
}

/**
 * Kosaraju's algorithm: two depth-first searches. The first records the order in which nodes finish. The
 * second walks the edges backwards, starting from the node that finished last: everything it reaches
 * that way, and that is not yet in a component, can reach it and is reached from it, so it is one component.
 */
export function runKosaraju(graph: GraphInput = SCC_SAMPLE): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const seen = new Set<string>(); const finished: string[] = [];
  const groups: string[][] = [];
  const assigned = new Set<string>();
  let checks = 0;
  const base = (extraFrontier: readonly string[] = []) => ({ visited: [...seen], frontier: [...extraFrontier], groups: groups.map((group) => [...group]), dataStructure: [{ label: "Finish order", value: finished.join(", ") || "none yet" }, { label: "Components", value: braces(groups) }], metrics: { visitedNodes: seen.size, operations: checks } });
  steps.push(createAlgorithmStep(0, "enqueue", "Pass 1: search depth-first and note the order in which nodes finish.", { ...base() }));
  const first = (v: string, path: string[]) => {
    seen.add(v);
    steps.push(createAlgorithmStep(steps.length, "visit", `Pass 1: explore ${v}.`, { ...base([...path, v]), currentNode: v }));
    for (const w of outgoing(graph, v)) { checks++; if (!seen.has(w)) first(w, [...path, v]); }
    finished.push(v);
    steps.push(createAlgorithmStep(steps.length, "dequeue", `Pass 1: ${v} is finished (number ${finished.length}).`, { ...base(path), currentNode: v }));
  };
  for (const node of graph.nodes) if (!seen.has(node.id)) first(node.id, []);
  steps.push(createAlgorithmStep(steps.length, "enqueue", `Pass 2: walk the edges backwards, starting with the node that finished last (${finished.at(-1)}). Each search that starts fresh finds one component.`, { ...base() }));
  const second = (v: string, root: string, component: string[]) => {
    assigned.add(v); component.push(v);
    steps.push(createAlgorithmStep(steps.length, "visit", `Pass 2: ${v} joins the component of ${root}.`, { ...base(), currentNode: v, groups: [...groups.map((group) => [...group]), [...component]] }));
    for (const u of incoming(graph, v)) {
      checks++;
      if (!assigned.has(u)) second(u, root, component);
    }
  };
  for (const v of [...finished].reverse()) {
    if (assigned.has(v)) continue;
    const component: string[] = [];
    second(v, v, component);
    groups.push(component);
    steps.push(createAlgorithmStep(steps.length, "accept", `Nothing more can be reached backwards from ${v}: ${braces([component])} is a component.`, { ...base(), currentNode: v }));
  }
  return finish("kosaraju", graph, steps, groups, checks);
}
