import type { GraphEdge, GraphInput, GraphNode } from "./graphTypes";

export const SAMPLE_GRAPH: GraphInput = {
  nodes: [
    { id: "A", x: 12, y: 48, heuristic: 7 },
    { id: "B", x: 35, y: 20, heuristic: 5 },
    { id: "C", x: 35, y: 76, heuristic: 4 },
    { id: "D", x: 60, y: 20, heuristic: 3 },
    { id: "E", x: 60, y: 76, heuristic: 2 },
    { id: "F", x: 88, y: 48, heuristic: 0 },
  ],
  edges: [
    { from: "A", to: "B", weight: 2 },
    { from: "A", to: "C", weight: 4 },
    { from: "B", to: "D", weight: 2 },
    { from: "B", to: "E", weight: 5 },
    { from: "C", to: "E", weight: 1 },
    { from: "D", to: "F", weight: 3 },
    { from: "E", to: "F", weight: 2 },
  ],
  start: "A",
  goal: "F",
};

export function getGraphNode(graph: GraphInput, id: string): GraphNode {
  return graph.nodes.find((node) => node.id === id) ?? graph.nodes[0];
}

export function getNeighbors(graph: GraphInput, nodeId: string): GraphEdge[] {
  return graph.edges.flatMap((edge) => {
    if (edge.from === nodeId) return [edge];
    if (edge.to === nodeId) return [{ from: nodeId, to: edge.from, weight: edge.weight }];
    return [];
  });
}

export function reconstructPath(parent: ReadonlyMap<string, string>, start: string, goal: string): string[] {
  const path: string[] = [];
  let current: string | undefined = goal;
  while (current) {
    path.unshift(current);
    if (current === start) return path;
    current = parent.get(current);
  }
  return [];
}
