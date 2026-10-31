import type { GraphEdge, GraphInput, GraphNode, GridCell, GridPoint, GridState } from "./graphTypes";

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

/** Directed graph with one negative edge (C → B, −3). Dijkstra settles B too early and misses the cheaper route through C. */
export const DIRECTED_SAMPLE: GraphInput = {
  label: "Directed sample",
  directed: true,
  nodes: SAMPLE_GRAPH.nodes.map((node) => ({ ...node, heuristic: 0 })),
  edges: [
    { from: "A", to: "B", weight: 4 },
    { from: "A", to: "C", weight: 5 },
    { from: "C", to: "B", weight: -3 },
    { from: "B", to: "D", weight: 3 },
    { from: "D", to: "F", weight: 2 },
    { from: "C", to: "E", weight: 2 },
    { from: "E", to: "F", weight: 6 },
  ],
  start: "A",
  goal: "F",
};

/** The same graph with an extra edge E → C (−5): going C → E → C costs −3 each lap. */
export const DIRECTED_CYCLE_SAMPLE: GraphInput = { ...DIRECTED_SAMPLE, label: "Directed sample with a negative cycle", edges: [...DIRECTED_SAMPLE.edges, { from: "E", to: "C", weight: -5 }] };

export function getGraphNode(graph: GraphInput, id: string): GraphNode {
  return graph.nodes.find((node) => node.id === id) ?? graph.nodes[0];
}

export function getNeighbors(graph: GraphInput, nodeId: string): GraphEdge[] {
  return graph.edges.flatMap((edge) => {
    if (edge.from === nodeId) return [edge];
    if (!graph.directed && edge.to === nodeId) return [{ from: nodeId, to: edge.from, weight: edge.weight }];
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

/** Total weight along `path`, or Infinity when two consecutive nodes are not connected. */
export function pathCost(graph: GraphInput, path: readonly string[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index++) {
    const edge = getNeighbors(graph, path[index - 1]).find((candidate) => candidate.to === path[index]);
    if (!edge) return Infinity;
    total += edge.weight;
  }
  return total;
}

/**
 * Straight-line distance to the goal, scaled by the cheapest cost per unit of distance on any
 * edge. No path can be cheaper than that, so A* stays optimal on graphs the user rearranges.
 * Rounded down so the estimate never overshoots.
 */
export function withHeuristics(graph: GraphInput): GraphInput {
  // Weights can be negative on a directed graph, so no straight-line estimate is safe; those graphs are not used with A*.
  if (graph.directed) return graph;
  const goal = getGraphNode(graph, graph.goal);
  const ratios = graph.edges.flatMap((edge) => {
    const from = getGraphNode(graph, edge.from); const to = getGraphNode(graph, edge.to);
    const length = Math.hypot(from.x - to.x, from.y - to.y);
    return length > 0 ? [edge.weight / length] : [];
  });
  const ratio = ratios.length ? Math.min(...ratios) : 0;
  return { ...graph, nodes: graph.nodes.map((node) => ({ ...node, heuristic: Math.floor(Math.hypot(node.x - goal.x, node.y - goal.y) * ratio * 10) / 10 })) };
}

/** The sample graph with a different start and goal (the curated heuristics only fit goal F). */
export function sampleGraphBetween(start: string, goal: string): GraphInput {
  if (start === SAMPLE_GRAPH.start && goal === SAMPLE_GRAPH.goal) return SAMPLE_GRAPH;
  return withHeuristics({ ...SAMPLE_GRAPH, start, goal });
}

export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const HEAVY_COST = 5;

/** Chess-style cell name: column letter then row number, e.g. C4. */
export function cellId(col: number, row: number): string {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

export function cellIndex(grid: Pick<GridState, "cols">, col: number, row: number): number {
  return row * grid.cols + col;
}

export function defaultGrid(): GridState {
  const cells: GridCell[] = Array.from({ length: GRID_COLS * GRID_ROWS }, () => "empty");
  // A short wall with a gap gives the algorithms something to route around.
  for (let row = 1; row < 7; row++) cells[cellIndex({ cols: GRID_COLS }, 5, row)] = "wall";
  cells[cellIndex({ cols: GRID_COLS }, 5, 4)] = "empty";
  return { cols: GRID_COLS, rows: GRID_ROWS, cells, start: { col: 1, row: 4 }, goal: { col: 10, row: 4 } };
}

export function samePoint(a: GridPoint, b: GridPoint): boolean { return a.col === b.col && a.row === b.row; }

/**
 * Turns a map into the graph the algorithms already understand: every open cell is a node, each
 * pair of side-by-side open cells an edge. An edge costs the average of its two cells (rounded up),
 * so crossing heavy terrain is dearer than open ground. The heuristic is Manhattan distance
 * times the cheapest edge, which never overestimates.
 */
export function gridToGraph(grid: GridState): GraphInput {
  const cost = (cell: GridCell) => (cell === "heavy" ? HEAVY_COST : 1);
  const open = (col: number, row: number) => col >= 0 && row >= 0 && col < grid.cols && row < grid.rows && grid.cells[cellIndex(grid, col, row)] !== "wall";
  const edges: GraphEdge[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (!open(col, row)) continue;
      for (const [nextCol, nextRow] of [[col + 1, row], [col, row + 1]]) {
        if (!open(nextCol, nextRow)) continue;
        const weight = Math.ceil((cost(grid.cells[cellIndex(grid, col, row)]) + cost(grid.cells[cellIndex(grid, nextCol, nextRow)])) / 2);
        edges.push({ from: cellId(col, row), to: cellId(nextCol, nextRow), weight });
      }
    }
  }
  const minWeight = edges.length ? Math.min(...edges.map((edge) => edge.weight)) : 1;
  const nodes: GraphNode[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (!open(col, row)) continue;
      const distance = Math.abs(col - grid.goal.col) + Math.abs(row - grid.goal.row);
      nodes.push({ id: cellId(col, row), x: ((col + 0.5) / grid.cols) * 100, y: ((row + 0.5) / grid.rows) * 100, heuristic: distance * minWeight });
    }
  }
  return { label: "Grid map", nodes, edges, start: cellId(grid.start.col, grid.start.row), goal: cellId(grid.goal.col, grid.goal.row) };
}

/** Order-independent name for an undirected edge, e.g. edgeKey("B", "A") === "A-B". */
export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
