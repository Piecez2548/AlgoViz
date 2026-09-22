export interface GraphNode {
  id: string;
  x: number;
  y: number;
  heuristic: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface GraphInput {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  start: string;
  goal: string;
}
