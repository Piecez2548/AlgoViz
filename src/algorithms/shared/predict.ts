import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";

export interface Question {
  prompt: string;
  options: readonly string[];
  /** Index into `options`. */
  answer: number;
  /** What actually happened, taken from the recorded step. */
  explanation: string;
}

const MAX_OPTIONS = 4;
/** Algorithms where the questions below describe the run exactly. */
const NODE_PICKERS = new Set(["bfs", "dfs", "bidirectional-bfs", "greedy-best-first", "dijkstra", "a-star"]);
const PAIR_SWAPPERS = new Set(["bubble", "insertion", "shell"]);

export function canPredict(algorithmId: string): boolean {
  return NODE_PICKERS.has(algorithmId) || PAIR_SWAPPERS.has(algorithmId) || ["kruskal", "prim", "binary-search"].includes(algorithmId);
}

const unique = (items: readonly string[]) => [...new Set(items)];
const sortedOptions = (correct: string, candidates: readonly string[]) => {
  const others = unique(candidates).filter((item) => item !== correct).slice(0, MAX_OPTIONS - 1);
  return [correct, ...others].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

/**
 * A question about what happens after the step at `index`, answered from the steps that were actually
 * recorded. The step being shown never gives the answer away. Returns null where no good question exists.
 */
export function questionAt(algorithmId: string, execution: AlgorithmExecution, index: number, graph?: GraphInput): Question | null {
  const steps = execution.steps;
  const step = steps[index]; const next = steps[index + 1];
  if (!step || !next) return null;

  if (NODE_PICKERS.has(algorithmId)) {
    if ((next.type !== "dequeue" && next.type !== "visit") || !next.currentNode) return null;
    const seen = new Set(step.visited ?? []);
    const waiting = step.frontier ?? [];
    const others = [...waiting, ...(graph?.nodes.map((node) => node.id) ?? [])].filter((id) => !seen.has(id));
    const options = sortedOptions(next.currentNode, others);
    return options.length < 2 ? null : { prompt: "Which node does the algorithm take next?", options, answer: options.indexOf(next.currentNode), explanation: next.explanation };
  }

  if (PAIR_SWAPPERS.has(algorithmId)) {
    if (step.type !== "compare" || !step.highlightIndices || !step.values) return null;
    const [a, b] = step.highlightIndices;
    const swapped = next.type === "swap" && next.highlightIndices?.[0] === a && next.highlightIndices?.[1] === b;
    return { prompt: `It compares ${step.values[a]} and ${step.values[b]}. Will it swap them?`, options: ["Yes, swap them", "No, leave them"], answer: swapped ? 0 : 1, explanation: next.explanation };
  }

  if (algorithmId === "kruskal") {
    if (step.type !== "compare" || !step.activeEdge || (next.type !== "accept" && next.type !== "reject")) return null;
    return { prompt: `Will edge ${step.activeEdge} be kept or skipped?`, options: ["Keep it", "Skip it"], answer: next.type === "accept" ? 0 : 1, explanation: next.explanation };
  }

  if (algorithmId === "prim") {
    const pick = next.type === "compare" ? next.targetNode : undefined;
    if (!pick || !graph) return null;
    const inTree = new Set(step.visited ?? []);
    const reachable = graph.edges.flatMap((edge) => (inTree.has(edge.from) && !inTree.has(edge.to) ? [edge.to] : inTree.has(edge.to) && !inTree.has(edge.from) ? [edge.from] : []));
    const options = sortedOptions(pick, reachable);
    return options.length < 2 ? null : { prompt: "Which node joins the tree next?", options, answer: options.indexOf(pick), explanation: `${next.explanation} ${steps[index + 2]?.explanation ?? ""}`.trim() };
  }

  if (algorithmId === "binary-search") {
    const after = steps[index + 2];
    if (next.type !== "compare" || !next.highlightIndices || !next.activeRange || !next.values || !after) return null;
    const target = Number(next.dataStructure?.find((entry) => entry.label === "Target")?.value);
    const middle = next.highlightIndices[0];
    const options = ["Keep the left half", "Keep the right half", "Found it", "Nothing is left"];
    const answer = after.type === "complete" ? (after.highlightIndices?.length ? 2 : 3) : after.activeRange![0] > next.activeRange[0] ? 1 : 0;
    return { prompt: `Next it checks position ${middle}, which holds ${next.values[middle]}. The target is ${target}. What happens after that?`, options, answer, explanation: `${next.explanation}` };
  }
  return null;
}
