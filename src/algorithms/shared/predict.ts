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
const NODE_PICKERS = new Set(["kahn", "bfs", "dfs", "bidirectional-bfs", "greedy-best-first", "dijkstra", "a-star"]);
const PAIR_SWAPPERS = new Set(["bubble", "insertion", "shell"]);

const OTHERS = ["kruskal", "prim", "binary-search", "linear-search", "selection", "quick", "merge", "heap", "counting", "radix", "bellman-ford", "floyd-warshall", "tarjan", "kosaraju", "edmonds-karp", "ford-fulkerson"];

export function canPredict(algorithmId: string): boolean {
  return NODE_PICKERS.has(algorithmId) || PAIR_SWAPPERS.has(algorithmId) || OTHERS.includes(algorithmId);
}

const YES_NO = ["Yes", "No"] as const;

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

  if (algorithmId === "tarjan" || algorithmId === "kosaraju") {
    if (next.type !== "visit" || !next.currentNode || !graph) return null;
    // Kosaraju's second pass hands out components, so "taken" means already in a component rather than already reached.
    const pass2 = algorithmId === "kosaraju" && next.explanation.startsWith("Pass 2");
    const taken = new Set(pass2 ? (step.groups ?? []).flat() : step.visited ?? []);
    const options = sortedOptions(next.currentNode, graph.nodes.map((node) => node.id).filter((id) => !taken.has(id)));
    return options.length < 2 ? null : { prompt: pass2 ? "Which node joins a component next?" : "Which node does the search reach next?", options, answer: options.indexOf(next.currentNode), explanation: next.explanation };
  }

  if (algorithmId === "edmonds-karp" || algorithmId === "ford-fulkerson") {
    if (next.type !== "compare" || !graph) return null;
    const room = Number(next.dataStructure?.find((entry) => entry.label === "Room on it")?.value);
    if (!Number.isFinite(room)) return null;
    // The other choices are capacities from the network that are closest to the right answer.
    const nearest = unique(graph.edges.map((edge) => String(edge.weight))).filter((value) => Number(value) !== room).sort((a, b) => Math.abs(Number(a) - room) - Math.abs(Number(b) - room)).slice(0, MAX_OPTIONS - 1);
    const options = [String(room), ...nearest].sort((a, b) => Number(a) - Number(b));
    if (options.length < 2) return null;
    const how = algorithmId === "edmonds-karp" ? "the path with the fewest edges" : "the first path it finds, searching depth-first";
    return { prompt: `Next it takes ${how} from ${graph.start} to ${graph.goal} that still has room. How much flow can that path carry?`, options, answer: options.indexOf(String(room)), explanation: next.explanation };
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

  if (algorithmId === "linear-search") {
    if (next.type !== "compare" || !next.highlightIndices || !next.values) return null;
    const position = next.highlightIndices[0]; const target = Number(next.dataStructure?.find((entry) => entry.label === "Target")?.value);
    return { prompt: `Next it looks at position ${position}, which holds ${next.values[position]}. The target is ${target}. Is it a match?`, options: [...YES_NO], answer: next.values[position] === target ? 0 : 1, explanation: next.explanation };
  }

  // The questions below are about the comparison on screen; the numbers on its bars decide the answer,
  // and the step's explanation only says which values are being compared.
  if (step.type === "compare" && step.highlightIndices && step.values && step.highlightIndices.length === 2) {
    const [a, b] = step.highlightIndices; const x = step.values[a]; const y = step.values[b];
    if (algorithmId === "selection") return { prompt: `The smallest value so far is ${x}. Is ${y} smaller than it?`, options: [...YES_NO], answer: y < x ? 0 : 1, explanation: `${y} is ${y < x ? "smaller" : "not smaller"} than ${x}, so the smallest value so far ${y < x ? `becomes ${y}` : "stays " + x}.` };
    if (algorithmId === "quick") return { prompt: `The pivot is ${y}. Is ${x} smaller than the pivot?`, options: [...YES_NO], answer: x < y ? 0 : 1, explanation: `${x} is ${x < y ? "smaller" : "not smaller"} than the pivot ${y}, so it ${x < y ? "moves to the left side" : "stays where it is"}.` };
    if (algorithmId === "heap") return { prompt: `The parent is ${x}. Is the child ${y} larger than it?`, options: [...YES_NO], answer: y > x ? 0 : 1, explanation: `${y} is ${y > x ? "larger" : "not larger"} than ${x}, so ${y > x ? "the child is the bigger one" : "the parent stays on top"}.` };
    if (algorithmId === "merge") return { prompt: `Merging two runs: the left one offers ${x} and the right one offers ${y}. Which is written first?`, options: [`The left one (${x})`, `The right one (${y})`], answer: x <= y ? 0 : 1, explanation: `${x <= y ? x : y} is the smaller, so it is written first (ties go to the left run).` };
  }

  if (algorithmId === "counting") {
    const match = /^Count (\d+): it has now been seen (\d+) time/.exec(next.explanation);
    if (next.type !== "visit" || !match) return null;
    const answer = Number(match[2]);
    const options = [answer, answer + 1, answer + 2, answer - 1].filter((count) => count >= 1).slice(0, MAX_OPTIONS).sort((p, q) => p - q).map(String);
    return { prompt: `Next it counts the value ${match[1]}. How many times will it have been seen after that?`, options, answer: options.indexOf(String(answer)), explanation: next.explanation };
  }

  if (algorithmId === "radix") {
    const match = /the (\w+) digit of (\d+): it is (\d)/.exec(next.explanation);
    if (next.type !== "visit" || !match) return null;
    const digit = Number(match[3]);
    const options = [digit, (digit + 1) % 10, (digit + 4) % 10, (digit + 7) % 10].sort((p, q) => p - q).map(String);
    return { prompt: `Next it looks at the ${match[1]} digit of ${match[2]}. Which bucket does it go into?`, options, answer: options.indexOf(String(digit)), explanation: next.explanation };
  }

  if (algorithmId === "bellman-ford") {
    if (next.type !== "update" || !next.targetNode || !graph) return null;
    const reached = new Set(step.visited ?? []);
    const reachable = graph.edges.flatMap((edge) => (reached.has(edge.from) ? [edge.to] : []).concat(!graph.directed && reached.has(edge.to) ? [edge.from] : []));
    const options = sortedOptions(next.targetNode, reachable);
    return options.length < 2 ? null : { prompt: "Which node's distance gets shorter next?", options, answer: options.indexOf(next.targetNode), explanation: next.explanation };
  }

  if (algorithmId === "floyd-warshall") {
    if ((next.type !== "visit" && next.type !== "update") || !next.currentNode) return null;
    return { prompt: `Next it allows routes through ${next.currentNode}. Will any distance from the start get shorter?`, options: [...YES_NO], answer: next.type === "update" ? 0 : 1, explanation: next.explanation };
  }
  return null;
}
