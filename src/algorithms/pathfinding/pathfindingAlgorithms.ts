import { getGraphNode, getNeighbors, reconstructPath, SAMPLE_GRAPH } from "../shared/graph";
import type { GraphInput } from "../shared/graphTypes";
import { createAlgorithmStep } from "../shared/utils";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";

type QueueItem = { id: string; priority: number };

function run(algorithmId: "dijkstra" | "a-star", graph: GraphInput): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const distance = new Map(graph.nodes.map((node) => [node.id, Infinity]));
  const parent = new Map<string, string>();
  const settled = new Set<string>();
  const queue: QueueItem[] = [{ id: graph.start, priority: 0 }];
  distance.set(graph.start, 0);
  const label = algorithmId === "dijkstra" ? "Dijkstra" : "A*";
  const score = (id: string) => (distance.get(id) ?? Infinity) + (algorithmId === "a-star" ? getGraphNode(graph, id).heuristic : 0);
  steps.push(createAlgorithmStep(0, "enqueue", `${label} starts at ${graph.start} with distance 0.`, { currentNode: graph.start, frontier: [graph.start], dataStructure: [{ label: graph.start, value: "0" }] }));
  while (queue.length) {
    queue.sort((a, b) => a.priority - b.priority);
    const current = queue.shift()!.id;
    if (settled.has(current)) continue;
    settled.add(current);
    const visited = [...settled];
    steps.push(createAlgorithmStep(steps.length, "visit", `${label} settles ${current} with score ${score(current)}.`, { currentNode: current, visited, frontier: queue.map((item) => item.id), dataStructure: [...distance.entries()].filter(([, value]) => Number.isFinite(value)).map(([id, value]) => ({ label: id, value: `${value}${algorithmId === "a-star" ? ` + h${getGraphNode(graph, id).heuristic}` : ""}` })), metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    if (current === graph.goal) {
      const path = reconstructPath(parent, graph.start, current);
      steps.push(createAlgorithmStep(steps.length, "path", `Shortest path found: ${path.join(" → ")}.`, { currentNode: current, visited, frontier: queue.map((item) => item.id), dataStructure: [{ label: "Path", value: path.join(" → ") }] }));
      break;
    }
    for (const edge of getNeighbors(graph, current)) {
      if (settled.has(edge.to)) continue;
      const candidate = (distance.get(current) ?? Infinity) + edge.weight;
      if (candidate >= (distance.get(edge.to) ?? Infinity)) continue;
      distance.set(edge.to, candidate); parent.set(edge.to, current); queue.push({ id: edge.to, priority: candidate + (algorithmId === "a-star" ? getGraphNode(graph, edge.to).heuristic : 0) });
      steps.push(createAlgorithmStep(steps.length, "update", `Update ${edge.to}: distance becomes ${candidate}.`, { currentNode: current, targetNode: edge.to, visited, frontier: queue.map((item) => item.id), dataStructure: [{ label: edge.to, value: `${candidate}` }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    }
  }
  steps.push(createAlgorithmStep(steps.length, "complete", `${label} completed.`, { visited: [...settled], frontier: queue.map((item) => item.id) }));
  return { algorithmId, inputLabel: `${graph.label ?? "Weighted graph"} · ${graph.start} → ${graph.goal}`, steps, completed: true };
}

export const runDijkstra = (graph: GraphInput = SAMPLE_GRAPH) => run("dijkstra", graph);
export const runAStar = (graph: GraphInput = SAMPLE_GRAPH) => run("a-star", graph);

/**
 * Bellman-Ford: instead of always settling the closest node (Dijkstra), sweep over every edge again and
 * again, relaxing any edge that offers a shorter route, until a whole sweep changes nothing. Edges here
 * are two-way with positive weights, so there are no negative cycles to detect; the algorithm
 * stops after at most V - 1 sweeps. Only the relaxations are recorded as steps; the edge checks that
 * change nothing are counted in the metrics.
 */
export function runBellmanFord(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const distance = new Map(graph.nodes.map((node) => [node.id, Infinity]));
  const parent = new Map<string, string>();
  distance.set(graph.start, 0);
  let checks = 0;
  const reached = () => graph.nodes.filter((node) => Number.isFinite(distance.get(node.id) ?? Infinity)).map((node) => node.id);
  const table = () => [...distance.entries()].filter(([, value]) => Number.isFinite(value)).map(([id, value]) => ({ label: id, value: String(value) }));
  steps.push(createAlgorithmStep(0, "enqueue", `Bellman-Ford starts with distance 0 at ${graph.start} and unknown (infinite) distance everywhere else.`, { currentNode: graph.start, visited: reached(), dataStructure: table(), metrics: { visitedNodes: 1, operations: 0 } }));
  const directed = graph.edges.flatMap((edge) => [{ from: edge.from, to: edge.to, weight: edge.weight }, { from: edge.to, to: edge.from, weight: edge.weight }]);
  for (let pass = 1; pass <= graph.nodes.length - 1; pass++) {
    let changed = 0;
    for (const edge of directed) {
      checks++;
      const through = (distance.get(edge.from) ?? Infinity) + edge.weight;
      if (through >= (distance.get(edge.to) ?? Infinity)) continue;
      distance.set(edge.to, through); parent.set(edge.to, edge.from); changed++;
      steps.push(createAlgorithmStep(steps.length, "update", `Pass ${pass}: going ${edge.from} → ${edge.to} is shorter, so ${edge.to}'s distance becomes ${through}.`, { currentNode: edge.from, targetNode: edge.to, visited: reached(), dataStructure: table(), metrics: { visitedNodes: reached().length, operations: checks } }));
    }
    steps.push(createAlgorithmStep(steps.length, "compare", changed ? `Pass ${pass} finished with ${changed} improvement${changed === 1 ? "" : "s"}; sweep again.` : `Pass ${pass} changed nothing, so every distance is final.`, { visited: reached(), dataStructure: table(), metrics: { visitedNodes: reached().length, operations: checks } }));
    if (!changed) break;
  }
  const path = reconstructPath(parent, graph.start, graph.goal);
  if (path.length) steps.push(createAlgorithmStep(steps.length, "path", `Shortest path to ${graph.goal}: ${path.join(" → ")} (cost ${distance.get(graph.goal)}).`, { currentNode: graph.goal, visited: reached(), dataStructure: [{ label: "Path", value: path.join(" → ") }], metrics: { visitedNodes: reached().length, operations: checks } }));
  steps.push(createAlgorithmStep(steps.length, "complete", path.length ? "Bellman-Ford completed." : `Bellman-Ford completed: ${graph.goal} cannot be reached from ${graph.start}.`, { visited: reached(), metrics: { visitedNodes: reached().length, operations: checks } }));
  return { algorithmId: "bellman-ford", inputLabel: `${graph.label ?? "Weighted graph"} · ${graph.start} → ${graph.goal}`, steps, completed: true };
}
