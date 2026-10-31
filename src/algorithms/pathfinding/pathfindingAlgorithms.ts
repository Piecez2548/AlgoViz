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
 * are two-way with positive weights unless the graph is directed, where weights may be negative. After
 * V - 1 sweeps nothing should improve; if a V-th sweep still does, a negative cycle is reachable and is reported.
 * The algorithm stops early after a sweep that changes nothing. Only the relaxations are recorded as steps; the edge checks that
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
  const arcs = graph.directed ? [...graph.edges] : graph.edges.flatMap((edge) => [{ from: edge.from, to: edge.to, weight: edge.weight }, { from: edge.to, to: edge.from, weight: edge.weight }]);
  // V - 1 sweeps are enough when there is no negative cycle, so a sweep from the V-th on that still improves something proves there is one.
  // Keep sweeping until the parent links form a loop: a loop in the parent links is always a negative cycle.
  const findCycle = (): string[] | null => {
    const state = new Map<string, number>();
    for (const node of graph.nodes) {
      const walk: string[] = []; let at: string | undefined = node.id;
      while (at !== undefined && !state.get(at)) { state.set(at, 1); walk.push(at); at = parent.get(at); }
      if (at !== undefined && state.get(at) === 1) { const loop = walk.slice(walk.indexOf(at)); return [at, ...loop.slice(1).reverse(), at]; }
      for (const id of walk) state.set(id, 2);
    }
    return null;
  };
  let cycle: string[] | null = null;
  const unsettled = new Set<string>();
  const n = graph.nodes.length;
  for (let pass = 1; pass <= 3 * n; pass++) {
    let changed = 0;
    for (const edge of arcs) {
      checks++;
      const through = (distance.get(edge.from) ?? Infinity) + edge.weight;
      if (through >= (distance.get(edge.to) ?? Infinity)) continue;
      distance.set(edge.to, through); parent.set(edge.to, edge.from); changed++;
      if (pass >= n) unsettled.add(edge.to);
      steps.push(createAlgorithmStep(steps.length, "update", `Pass ${pass}: going ${edge.from} → ${edge.to} is shorter, so ${edge.to}'s distance becomes ${through}.`, { currentNode: edge.from, targetNode: edge.to, visited: reached(), dataStructure: table(), metrics: { visitedNodes: reached().length, operations: checks } }));
    }
    cycle = changed && pass >= n ? findCycle() : null;
    if (cycle) {
      steps.push(createAlgorithmStep(steps.length, "compare", `Pass ${pass} still made ${changed} improvement${changed === 1 ? "" : "s"}, although a shortest route needs at most ${n - 1} edges. Some loop keeps getting cheaper: the negative cycle ${cycle.join(" → ")}.`, { visited: [...new Set(cycle)], dataStructure: [{ label: "Negative cycle", value: cycle.join(" → ") }], metrics: { visitedNodes: reached().length, operations: checks } }));
      break;
    }
    steps.push(createAlgorithmStep(steps.length, "compare", changed ? `Pass ${pass} finished with ${changed} improvement${changed === 1 ? "" : "s"}; sweep again.` : `Pass ${pass} changed nothing, so every distance is final.`, { visited: reached(), dataStructure: table(), metrics: { visitedNodes: reached().length, operations: checks } }));
    if (!changed) break;
  }
  // Every node a negative cycle can reach has no smallest distance. Is the goal one of them?
  const doomed = new Set<string>(cycle ?? []);
  for (const id of unsettled) doomed.add(id);
  const queue = [...doomed];
  for (let head = 0; head < queue.length; head++) for (const edge of arcs) if (edge.from === queue[head] && !doomed.has(edge.to)) { doomed.add(edge.to); queue.push(edge.to); }
  const blocked = doomed.has(graph.goal);
  const path = blocked ? [] : reconstructPath(parent, graph.start, graph.goal);
  if (path.length) steps.push(createAlgorithmStep(steps.length, "path", `Shortest path to ${graph.goal}: ${path.join(" → ")} (cost ${distance.get(graph.goal)}).`, { currentNode: graph.goal, visited: reached(), dataStructure: [{ label: "Path", value: path.join(" → ") }], metrics: { visitedNodes: reached().length, operations: checks } }));
  const loopText = cycle ? cycle.join(" → ") : "";
  const cycleName = cycle ? `the negative cycle ${loopText}` : "a negative cycle";
  const ending = blocked ? `Bellman-Ford stopped: ${cycleName} can be reached from ${graph.start} and leads to ${graph.goal}, so the distance can be made as small as you like and there is no cheapest route.` : path.length ? (cycle ? `Bellman-Ford completed. ${cycleName[0].toUpperCase()}${cycleName.slice(1)} exists, but it cannot lead to ${graph.goal}, so this route is still the cheapest.` : "Bellman-Ford completed.") : `Bellman-Ford completed: ${graph.goal} cannot be reached from ${graph.start}.`;
  steps.push(createAlgorithmStep(steps.length, "complete", ending, { visited: blocked && cycle ? [...new Set(cycle)] : reached(), ...(blocked ? { dataStructure: [{ label: "Negative cycle", value: cycle ? loopText : "not found" }] } : {}), metrics: { visitedNodes: reached().length, operations: checks } }));
  return { algorithmId: "bellman-ford", inputLabel: `${graph.label ?? "Weighted graph"} · ${graph.start} → ${graph.goal}`, steps, completed: true };
}

/**
 * Floyd-Warshall: shortest distances between every pair of nodes. For each node k in turn, ask for
 * every pair (i, j) whether going i → k → j beats the best known route. After the last k all pairs are
 * final. The display follows the distances from the start node (the row the route comes from); the
 * other pairs are updated too, and every pair check is counted in the metrics.
 */
export function runFloydWarshall(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const n = graph.nodes.length;
  const index = new Map(graph.nodes.map((node, position) => [node.id, position]));
  const start = index.get(graph.start)!; const goal = index.get(graph.goal)!;
  const dist = new Float64Array(n * n).fill(Infinity);
  const next = new Int32Array(n * n).fill(-1);
  for (let i = 0; i < n; i++) { dist[i * n + i] = 0; next[i * n + i] = i; }
  for (const edge of graph.edges) {
    const a = index.get(edge.from)!; const b = index.get(edge.to)!;
    if (edge.weight < dist[a * n + b]) { dist[a * n + b] = edge.weight; next[a * n + b] = b; }
    if (!graph.directed && edge.weight < dist[b * n + a]) { dist[b * n + a] = edge.weight; next[b * n + a] = a; }
  }
  let checks = 0; let improvedPairs = 0;
  const reached = () => graph.nodes.filter((_, position) => Number.isFinite(dist[start * n + position])).map((node) => node.id);
  const table = () => [...graph.nodes.map((node, position) => ({ label: node.id, value: String(dist[start * n + position]) })).filter((entry) => entry.value !== "Infinity"), { label: "Pairs improved", value: improvedPairs }];
  steps.push(createAlgorithmStep(0, "enqueue", `Floyd-Warshall starts from the direct edge weights between every pair of nodes. Distances shown are from ${graph.start}.`, { currentNode: graph.start, visited: reached(), dataStructure: table(), metrics: { visitedNodes: reached().length, operations: 0 } }));
  for (let k = 0; k < n; k++) {
    let improved = 0; let fromStart = 0;
    for (let i = 0; i < n; i++) {
      const viaFirst = dist[i * n + k];
      if (viaFirst === Infinity) continue;
      for (let j = 0; j < n; j++) {
        checks++;
        const through = viaFirst + dist[k * n + j];
        if (through >= dist[i * n + j]) continue;
        dist[i * n + j] = through; next[i * n + j] = next[i * n + k]; improved++; improvedPairs++;
        if (i === start) fromStart++;
      }
    }
    const node = graph.nodes[k].id;
    steps.push(createAlgorithmStep(steps.length, fromStart ? "update" : "visit", `Allow routes through ${node}: ${improved} pair${improved === 1 ? "" : "s"} got shorter${improved ? `, ${fromStart} of them from ${graph.start}` : ""}.`, { currentNode: node, visited: reached(), dataStructure: table(), metrics: { visitedNodes: reached().length, operations: checks } }));
  }
  // A node whose distance to itself became negative lies on a negative cycle. It only matters if the start can reach it and it can reach the goal.
  const onCycle = graph.nodes.filter((_, i) => dist[i * n + i] < 0).map((node) => node.id);
  const blocking = graph.nodes.filter((_, i) => dist[i * n + i] < 0 && Number.isFinite(dist[start * n + i]) && Number.isFinite(dist[i * n + goal])).map((node) => node.id);
  const route: string[] = [];
  if (!blocking.length && Number.isFinite(dist[start * n + goal])) { let at = start; route.push(graph.nodes[at].id); while (at !== goal) { at = next[at * n + goal]; route.push(graph.nodes[at].id); } }
  if (route.length) steps.push(createAlgorithmStep(steps.length, "path", `Shortest path to ${graph.goal}: ${route.join(" → ")} (cost ${dist[start * n + goal]}).`, { currentNode: graph.goal, visited: reached(), dataStructure: [{ label: "Path", value: route.join(" → ") }], metrics: { visitedNodes: reached().length, operations: checks } }));
  const ending = blocking.length ? `Floyd-Warshall stopped: ${blocking.join(" and ")} lie on a negative cycle that the route from ${graph.start} to ${graph.goal} can pass through, so there is no cheapest route.` : route.length ? `Floyd-Warshall completed: every pair now has its shortest distance.${onCycle.length ? ` (${onCycle.join(", ")} lie on a negative cycle, but not on any route from ${graph.start} to ${graph.goal}.)` : ""}` : `Floyd-Warshall completed: ${graph.goal} cannot be reached from ${graph.start}.`;
  steps.push(createAlgorithmStep(steps.length, "complete", ending, { visited: reached(), ...(blocking.length ? { dataStructure: [{ label: "Negative cycle", value: `through ${blocking.join(", ")}` }] } : {}), metrics: { visitedNodes: reached().length, operations: checks } }));
  return { algorithmId: "floyd-warshall", inputLabel: `${graph.label ?? "Weighted graph"} · ${graph.start} → ${graph.goal}`, steps, completed: true };
}
