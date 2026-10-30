import { ROUTE_ALGORITHMS, SORTING_ALGORITHMS } from "../registry";
import { cellIndex, gridToGraph, pathCost } from "./graph";
import type { GraphInput, GridCell, GridState } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

/** What one finished run cost, read from the steps it recorded rather than asserted. */
export interface Measure {
  /** Moments the algorithm recorded for display. Not a time or CPU measure. */
  steps: number;
  comparisons: number;
  /** Swaps for most sorts; writes for merge sort. */
  swaps: number;
  /** Nodes the run touched before it stopped. */
  visited: number;
  /** Total weight of the route it found, or null when it found none. */
  cost: number | null;
}

export function measure(execution: AlgorithmExecution, graph?: GraphInput): Measure {
  const steps = execution.steps;
  const last = steps.at(-1)?.metrics;
  const visited = Math.max(0, ...steps.filter((step) => step.type !== "path").map((step) => step.metrics?.visitedNodes ?? step.visited?.length ?? 0));
  const route = steps.find((step) => step.type === "path")?.dataStructure?.find((entry) => entry.label === "Path")?.value;
  const cost = route !== undefined && graph ? pathCost(graph, String(route).split(" → ")) : null;
  return { steps: steps.length, comparisons: last?.comparisons ?? 0, swaps: last?.swaps ?? 0, visited, cost: cost !== null && Number.isFinite(cost) ? cost : null };
}

export type SortMetric = "comparisons" | "swaps" | "steps";
export type GraphMetric = "visited" | "steps";
export type SortShape = "random" | "sorted" | "reversed" | "nearly" | "few-unique";
export type GridObstacles = "none" | "scattered";

export interface GrowthPoint { n: number; value: number }
export interface GrowthSeries { id: string; name: string; points: readonly GrowthPoint[] }

export const SORT_SIZES: readonly number[] = [8, 16, 24, 32, 48, 64];
/** Map sides; the chart's x value is the number of cells (side × side). */
export const MAP_SIDES: readonly number[] = [4, 6, 8, 10, 12, 14, 16];

// Small deterministic generator so the chart is the same every time it is drawn.
function seeded(seed: number) { let state = seed; return () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296; }; }

/**
 * Input of `n` numbers in the chosen shape. Values are distinct (1..n) except for "few-unique", so
 * the counts match the textbook behaviour. Random data is averaged over a few shuffles.
 */
export function sortInputs(shape: SortShape, n: number): number[][] {
  const ascending = Array.from({ length: n }, (_, index) => index + 1);
  switch (shape) {
    case "sorted": return [ascending];
    case "reversed": return [[...ascending].reverse()];
    case "nearly": { const out = [...ascending]; for (let i = 0; i + 3 < n; i += 4) [out[i], out[i + 1]] = [out[i + 1], out[i]]; return [out]; }
    case "few-unique": { const random = seeded(2000 + n); return [Array.from({ length: n }, () => [12, 47, 83][Math.floor(random() * 3)])]; }
    default: return Array.from({ length: 3 }, (_, trial) => {
      const random = seeded(1000 + n * 7 + trial); const out = [...ascending];
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
      return out;
    });
  }
}

export function sortGrowth(ids: readonly string[], shape: SortShape, metric: SortMetric, sizes: readonly number[] = SORT_SIZES): GrowthSeries[] {
  return SORTING_ALGORITHMS.filter((algorithm) => ids.includes(algorithm.id)).map((algorithm) => ({
    id: algorithm.id,
    name: algorithm.name,
    points: sizes.map((n) => {
      const inputs = sortInputs(shape, n);
      const total = inputs.reduce((sum, input) => sum + measure(algorithm.run(input))[metric], 0);
      return { n, value: Math.round((total / inputs.length) * 10) / 10 };
    }),
  }));
}

/**
 * A side × side map from the middle of the left edge to the middle of the right edge, optionally with
 * scattered walls. (Corner to corner would make every cell lie on a shortest path, which hides how
 * much less A* explores.)
 */
export function squareMap(side: number, obstacles: GridObstacles): GridState {
  const random = seeded(side * 31 + 5);
  const middle = Math.floor(side / 2);
  const cells: GridCell[] = Array.from({ length: side * side }, () => (obstacles === "scattered" && random() < 0.22 ? "wall" : "empty"));
  const grid: GridState = { cols: side, rows: side, cells, start: { col: 0, row: middle }, goal: { col: side - 1, row: middle } };
  const open = [...cells];
  open[cellIndex(grid, 0, middle)] = "empty"; open[cellIndex(grid, side - 1, middle)] = "empty";
  return { ...grid, cells: open };
}

export function graphGrowth(ids: readonly string[], obstacles: GridObstacles, metric: GraphMetric, sides: readonly number[] = MAP_SIDES): GrowthSeries[] {
  const graphs = sides.map((side) => ({ n: side * side, graph: gridToGraph(squareMap(side, obstacles)) }));
  return ROUTE_ALGORITHMS.filter((algorithm) => ids.includes(algorithm.id)).map((algorithm) => ({
    id: algorithm.id,
    name: algorithm.name,
    points: graphs.map(({ n, graph }) => ({ n, value: measure(algorithm.run(graph), graph)[metric] })),
  }));
}
