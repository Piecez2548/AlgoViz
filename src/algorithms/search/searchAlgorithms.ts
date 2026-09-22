import { getNeighbors, reconstructPath, SAMPLE_GRAPH } from "../shared/graph";
import { createAlgorithmStep } from "../shared/utils";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";

function execution(algorithmId: string, steps: AlgorithmStep[]): AlgorithmExecution {
  return { algorithmId, inputLabel: "Sample graph · A → F", steps, completed: true };
}

function pathStep(steps: AlgorithmStep[], path: string[], explanation: string) {
  steps.push(createAlgorithmStep(steps.length, "path", explanation, {
    currentNode: path.at(-1), visited: path, frontier: [],
    dataStructure: [{ label: "Path", value: path.join(" → ") }],
  }));
}

export function runBfs(): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const queue = [SAMPLE_GRAPH.start];
  const discovered = new Set(queue);
  const visited: string[] = [];
  const parent = new Map<string, string>();
  steps.push(createAlgorithmStep(0, "enqueue", "Start with A in the queue.", { currentNode: "A", frontier: queue, dataStructure: [{ label: "Queue", value: queue.join(", ") }] }));
  while (queue.length) {
    const current = queue.shift()!;
    visited.push(current);
    steps.push(createAlgorithmStep(steps.length, "dequeue", `Dequeue ${current} and inspect its neighbors.`, { currentNode: current, visited, frontier: queue, dataStructure: [{ label: "Queue", value: queue.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    if (current === SAMPLE_GRAPH.goal) {
      pathStep(steps, reconstructPath(parent, SAMPLE_GRAPH.start, current), "The goal is found. Trace parent links to reveal the path.");
      break;
    }
    for (const edge of getNeighbors(SAMPLE_GRAPH, current)) {
      if (discovered.has(edge.to)) continue;
      discovered.add(edge.to); parent.set(edge.to, current); queue.push(edge.to);
      steps.push(createAlgorithmStep(steps.length, "discover", `${edge.to} is discovered from ${current} and added to the queue.`, { currentNode: current, targetNode: edge.to, visited, frontier: queue, dataStructure: [{ label: "Queue", value: queue.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    }
  }
  steps.push(createAlgorithmStep(steps.length, "complete", "BFS completed.", { visited, frontier: queue }));
  return execution("bfs", steps);
}

export function runDfs(): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const stack = [SAMPLE_GRAPH.start];
  const discovered = new Set(stack);
  const visited: string[] = [];
  const parent = new Map<string, string>();
  steps.push(createAlgorithmStep(0, "enqueue", "Start with A on the stack.", { currentNode: "A", frontier: stack, dataStructure: [{ label: "Stack", value: stack.join(", ") }] }));
  while (stack.length) {
    const current = stack.pop()!;
    visited.push(current);
    steps.push(createAlgorithmStep(steps.length, "visit", `Visit ${current}; DFS explores deeply before backtracking.`, { currentNode: current, visited, frontier: stack, dataStructure: [{ label: "Stack", value: stack.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    if (current === SAMPLE_GRAPH.goal) {
      pathStep(steps, reconstructPath(parent, SAMPLE_GRAPH.start, current), "The goal is found. Trace the DFS discovery path.");
      break;
    }
    [...getNeighbors(SAMPLE_GRAPH, current)].reverse().forEach((edge) => {
      if (discovered.has(edge.to)) return;
      discovered.add(edge.to); parent.set(edge.to, current); stack.push(edge.to);
      steps.push(createAlgorithmStep(steps.length, "discover", `${edge.to} is pushed after ${current}.`, { currentNode: current, targetNode: edge.to, visited, frontier: stack, dataStructure: [{ label: "Stack", value: stack.join(", ") }], metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    });
  }
  steps.push(createAlgorithmStep(steps.length, "complete", "DFS completed.", { visited, frontier: stack }));
  return execution("dfs", steps);
}

export function runGreedyBestFirst(): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const frontier = [SAMPLE_GRAPH.start];
  const discovered = new Set(frontier);
  const visited: string[] = [];
  const parent = new Map<string, string>();
  steps.push(createAlgorithmStep(0, "enqueue", "Start with A. Greedy search will choose the lowest heuristic next.", { currentNode: "A", frontier, dataStructure: [{ label: "Priority", value: "A (h=7)" }] }));
  while (frontier.length) {
    frontier.sort((a, b) => getNodeHeuristic(a) - getNodeHeuristic(b));
    const current = frontier.shift()!;
    visited.push(current);
    steps.push(createAlgorithmStep(steps.length, "visit", `Choose ${current}; it has the smallest heuristic in the frontier.`, { currentNode: current, visited, frontier, dataStructure: frontier.map((id) => ({ label: id, value: `h=${getNodeHeuristic(id)}` })), metrics: { visitedNodes: visited.length, operations: steps.length + 1 } }));
    if (current === SAMPLE_GRAPH.goal) {
      pathStep(steps, reconstructPath(parent, SAMPLE_GRAPH.start, current), "The goal is found using heuristic guidance.");
      break;
    }
    for (const edge of getNeighbors(SAMPLE_GRAPH, current)) {
      if (discovered.has(edge.to)) continue;
      discovered.add(edge.to); parent.set(edge.to, current); frontier.push(edge.to);
      steps.push(createAlgorithmStep(steps.length, "discover", `${edge.to} enters the frontier with h=${getNodeHeuristic(edge.to)}.`, { currentNode: current, targetNode: edge.to, visited, frontier, dataStructure: frontier.map((id) => ({ label: id, value: `h=${getNodeHeuristic(id)}` })) }));
    }
  }
  steps.push(createAlgorithmStep(steps.length, "complete", "Greedy Best-First Search completed.", { visited, frontier }));
  return execution("greedy-best-first", steps);
}

function getNodeHeuristic(id: string) { return SAMPLE_GRAPH.nodes.find((node) => node.id === id)?.heuristic ?? 0; }
