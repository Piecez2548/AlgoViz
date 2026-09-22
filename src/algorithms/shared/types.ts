/**
 * The shared execution contract between an algorithm engine and a visualizer.
 *
 * Algorithms only produce data that describes what happened. Visualizers,
 * playback controls, explanations, and comparison views consume that data.
 */
export type AlgorithmStepType =
  | "visit"
  | "compare"
  | "enqueue"
  | "dequeue"
  | "discover"
  | "update"
  | "swap"
  | "path"
  | "complete";

export type AlgorithmCategory = "search" | "pathfinding" | "sorting";

export interface AlgorithmMetrics {
  comparisons?: number;
  swaps?: number;
  visitedNodes?: number;
  operations?: number;
}

export interface DataStructureEntry {
  label: string;
  value: string | number;
}

export interface AlgorithmStep {
  id: number;
  type: AlgorithmStepType;
  currentNode?: string;
  targetNode?: string;
  visited?: readonly string[];
  frontier?: readonly string[];
  dataStructure?: readonly DataStructureEntry[];
  values?: readonly number[];
  highlightIndices?: readonly number[];
  sortedIndices?: readonly number[];
  explanation: string;
  metrics?: AlgorithmMetrics;
}

export interface AlgorithmExecution {
  algorithmId: string;
  inputLabel: string;
  steps: readonly AlgorithmStep[];
  completed: boolean;
}

export interface AlgorithmDefinition {
  id: string;
  name: string;
  category: AlgorithmCategory;
  summary: string;
  status: "planned" | "available";
}
