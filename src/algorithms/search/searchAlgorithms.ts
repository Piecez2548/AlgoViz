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
