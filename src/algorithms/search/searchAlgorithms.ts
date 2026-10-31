import { getNeighbors, reconstructPath, SAMPLE_GRAPH } from "../shared/graph";
import type { GraphInput } from "../shared/graphTypes";
import { createAlgorithmStep } from "../shared/utils";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";

function execution(algorithmId: string, graph: GraphInput, steps: AlgorithmStep[]): AlgorithmExecution {
  return { algorithmId, inputLabel: `${graph.label ?? "Sample graph"} · ${graph.start} → ${graph.goal}`, steps, completed: true };
}

function pathStep(steps: AlgorithmStep[], path: string[], explanation: string) {
  steps.push(createAlgorithmStep(steps.length, "path", explanation, {
    currentNode: path.at(-1), visited: path, frontier: [],
    dataStructure: [{ label: "Path", value: path.join(" → ") }],
  }));
}

export function runBfs(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const queue = [graph.start];
  const discovered = new Set(queue);
  const visited: string[] = [];
  const parent = new Map<string, string>();
  steps.push(createAlgorithmStep(0, "enqueue", `Start with ${graph.start} in the queue.`, { currentNode: graph.start, frontier: queue, dataStructure: [{ label: "Queue", value: queue.join(", ") }] }));
  while (queue.length) {
    const current = queue.shift()!;
    visited.push(current);
    steps.push(createAlgorithmStep(steps.length, "dequeue", `Dequeue ${current} and inspect its neighbors.`, { currentNode: current, visited, frontier: queue, dataStructure: [{ label: "Queue", value: queue.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    if (current === graph.goal) {
      pathStep(steps, reconstructPath(parent, graph.start, current), "The goal is found. Trace parent links to reveal the path.");
      break;
    }
    for (const edge of getNeighbors(graph, current)) {
      if (discovered.has(edge.to)) continue;
      discovered.add(edge.to); parent.set(edge.to, current); queue.push(edge.to);
      steps.push(createAlgorithmStep(steps.length, "discover", `${edge.to} is discovered from ${current} and added to the queue.`, { currentNode: current, targetNode: edge.to, visited, frontier: queue, dataStructure: [{ label: "Queue", value: queue.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    }
  }
  steps.push(createAlgorithmStep(steps.length, "complete", "BFS completed.", { visited, frontier: queue }));
  return execution("bfs", graph, steps);
}

export function runDfs(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const stack = [graph.start];
  const discovered = new Set(stack);
  const visited: string[] = [];
  const parent = new Map<string, string>();
  steps.push(createAlgorithmStep(0, "enqueue", `Start with ${graph.start} on the stack.`, { currentNode: graph.start, frontier: stack, dataStructure: [{ label: "Stack", value: stack.join(", ") }] }));
  while (stack.length) {
    const current = stack.pop()!;
    visited.push(current);
    steps.push(createAlgorithmStep(steps.length, "visit", `Visit ${current}; DFS explores deeply before backtracking.`, { currentNode: current, visited, frontier: stack, dataStructure: [{ label: "Stack", value: stack.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    if (current === graph.goal) {
      pathStep(steps, reconstructPath(parent, graph.start, current), "The goal is found. Trace the DFS discovery path.");
      break;
    }
    [...getNeighbors(graph, current)].reverse().forEach((edge) => {
      if (discovered.has(edge.to)) return;
      discovered.add(edge.to); parent.set(edge.to, current); stack.push(edge.to);
      steps.push(createAlgorithmStep(steps.length, "discover", `${edge.to} is pushed after ${current}.`, { currentNode: current, targetNode: edge.to, visited, frontier: stack, dataStructure: [{ label: "Stack", value: stack.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    });
  }
  steps.push(createAlgorithmStep(steps.length, "complete", "DFS completed.", { visited, frontier: stack }));
  return execution("dfs", graph, steps);
}

export function runGreedyBestFirst(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const frontier = [graph.start];
  const discovered = new Set(frontier);
  const visited: string[] = [];
  const parent = new Map<string, string>();
  steps.push(createAlgorithmStep(0, "enqueue", `Start with ${graph.start}. Greedy search will choose the lowest heuristic next.`, { currentNode: graph.start, frontier, dataStructure: [{ label: "Priority", value: `${graph.start} (h=${getNodeHeuristic(graph, graph.start)})` }] }));
  while (frontier.length) {
    frontier.sort((a, b) => getNodeHeuristic(graph, a) - getNodeHeuristic(graph, b));
    const current = frontier.shift()!;
    visited.push(current);
    steps.push(createAlgorithmStep(steps.length, "visit", `Choose ${current}; it has the smallest heuristic in the frontier.`, { currentNode: current, visited, frontier, dataStructure: frontier.map((id) => ({ label: id, value: `h=${getNodeHeuristic(graph, id)}` })), metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    if (current === graph.goal) {
      pathStep(steps, reconstructPath(parent, graph.start, current), "The goal is found using heuristic guidance.");
      break;
    }
    for (const edge of getNeighbors(graph, current)) {
      if (discovered.has(edge.to)) continue;
      discovered.add(edge.to); parent.set(edge.to, current); frontier.push(edge.to);
      steps.push(createAlgorithmStep(steps.length, "discover", `${edge.to} enters the frontier with h=${getNodeHeuristic(graph, edge.to)}.`, { currentNode: current, targetNode: edge.to, visited, frontier, dataStructure: frontier.map((id) => ({ label: id, value: `h=${getNodeHeuristic(graph, id)}` })) }));
    }
  }
  steps.push(createAlgorithmStep(steps.length, "complete", "Greedy Best-First Search completed.", { visited, frontier }));
  return execution("greedy-best-first", graph, steps);
}

function getNodeHeuristic(graph: GraphInput, id: string) { return graph.nodes.find((node) => node.id === id)?.heuristic ?? 0; }

/**
 * Bidirectional BFS: search from the start and from the goal at the same time and stop where the two
 * searches meet. Each turn the side with the shorter queue expands a whole level; once a meeting is
 * found the level is finished and the shortest of the meetings wins, so the route has as few edges as
 * BFS finds, while far fewer nodes are usually visited.
 */
export function runBidirectionalBfs(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const side = (name: string, root: string) => ({ name, queue: [root], dist: new Map([[root, 0]]), parent: new Map<string, string>() });
  const forward = side("start side", graph.start); const backward = side("goal side", graph.goal);
  const visited = new Set<string>();
  const frontier = () => [...forward.queue, ...backward.queue];
  const queues = () => [{ label: "Start-side queue", value: forward.queue.join(", ") }, { label: "Goal-side queue", value: backward.queue.join(", ") }];
  const chain = (parent: ReadonlyMap<string, string>, from: string) => { const out = [from]; for (let next = parent.get(from); next !== undefined; next = parent.get(next)) out.push(next); return out; };
  steps.push(createAlgorithmStep(0, "enqueue", `Search from both ends at once: ${graph.start} going forward and ${graph.goal} going backward.`, { currentNode: graph.start, targetNode: graph.goal, frontier: frontier(), dataStructure: queues() }));
  let best: { path: string[]; hops: number } | null = null;
  while (!best && forward.queue.length && backward.queue.length) {
    const turn = forward.queue.length <= backward.queue.length ? forward : backward;
    const other = turn === forward ? backward : forward;
    const level = turn.queue.splice(0, turn.queue.length);
    for (const current of level) {
      visited.add(current);
      steps.push(createAlgorithmStep(steps.length, "dequeue", `From the ${turn.name}: take ${current} and inspect its neighbors.`, { currentNode: current, visited: [...visited], frontier: frontier(), dataStructure: queues(), metrics: { visitedNodes: visited.size, operations: steps.length + 1 } }));
      for (const edge of getNeighbors(graph, current)) {
        const neighbor = edge.to;
        const reach = other.dist.get(neighbor);
        if (reach !== undefined) {
          const hops = turn.dist.get(current)! + 1 + reach;
          if (!best || hops < best.hops) best = { hops, path: turn === forward ? [...chain(forward.parent, current).reverse(), ...chain(backward.parent, neighbor)] : [...chain(forward.parent, neighbor).reverse(), ...chain(backward.parent, current)] };
          steps.push(createAlgorithmStep(steps.length, "discover", `${neighbor} was already reached from the ${other.name}: the two searches meet here.`, { currentNode: current, targetNode: neighbor, visited: [...visited], frontier: frontier(), dataStructure: queues(), metrics: { visitedNodes: visited.size, operations: steps.length + 1 } }));
        }
        if (turn.dist.has(neighbor)) continue;
        turn.dist.set(neighbor, turn.dist.get(current)! + 1); turn.parent.set(neighbor, current); turn.queue.push(neighbor);
        steps.push(createAlgorithmStep(steps.length, "discover", `${neighbor} is discovered from ${current} and added to the ${turn.name}'s queue.`, { currentNode: current, targetNode: neighbor, visited: [...visited], frontier: frontier(), dataStructure: queues(), metrics: { visitedNodes: visited.size, operations: steps.length + 1 } }));
      }
    }
  }
  if (graph.start === graph.goal) best = { hops: 0, path: [graph.start] };
  if (best) pathStep(steps, best.path, `The searches met. Joining their routes gives ${best.path.join(" → ")}.`);
  steps.push(createAlgorithmStep(steps.length, "complete", best ? "Bidirectional BFS completed." : `Bidirectional BFS completed: the two searches never met, so ${graph.goal} cannot be reached from ${graph.start}.`, { visited: [...visited], frontier: frontier() }));
  return execution("bidirectional-bfs", graph, steps);
}
