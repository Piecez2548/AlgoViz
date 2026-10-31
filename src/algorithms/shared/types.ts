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
  | "accept"
  | "reject"
  | "complete";

export type AlgorithmCategory = "search" | "pathfinding" | "spanning" | "sorting" | "array-search" | "negative-weights" | "ordering" | "topological-sort" | "components" | "strongly-connected" | "flow" | "max-flow";

export interface AlgorithmMetrics {
  comparisons?: number;
  swaps?: number;
  visitedNodes?: number;
  /** Total flow sent so far, in a flow network. */
  flow?: number;
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
  /** Flow on each edge, keyed "from>to", in a flow network. */
  flows?: Readonly<Record<string, number>>;
  /** Groups of nodes found so far, drawn in their own colour and numbered. */
  groups?: readonly (readonly string[])[];
  /** First and last position still being searched; positions outside it are ruled out. */
  activeRange?: readonly [number, number];
  /** Edge being examined, written as edgeKey(a, b), e.g. "A-B". */
  activeEdge?: string;
  acceptedEdges?: readonly string[];
  rejectedEdges?: readonly string[];
  /** Pseudocode line to highlight, when the step type alone is ambiguous. */
  line?: number;
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
