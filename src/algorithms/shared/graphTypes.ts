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
  /** Short name shown next to the input, e.g. "Grid map". */
  label?: string;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  start: string;
  goal: string;
}

export type GridCell = "empty" | "wall" | "heavy";
export interface GridPoint { col: number; row: number }
export interface GridState {
  cols: number;
  rows: number;
  /** Row-major, length cols * rows. */
  cells: readonly GridCell[];
  start: GridPoint;
  goal: GridPoint;
}
