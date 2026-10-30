import type { AlgorithmStep, AlgorithmStepType } from "./types";

export interface Pseudocode {
  lines: readonly string[];
  /** Which line each kind of recorded step corresponds to. */
  lineFor: Partial<Record<AlgorithmStepType, number>>;
}

const graphSearch = (take: string, put: string): Pseudocode["lines"] => [
  `${put} the start node`,
  "while there is something waiting:",
  `  ${take} the next node`,
  "  if it is the goal: trace the path and stop",
  "  for each neighbor not yet seen:",
  `    mark it seen and ${put.toLowerCase()} it`,
];

const shortest = (extra: string): Pseudocode["lines"] => [
  "set the start distance to 0, all others to infinity",
  "while the queue is not empty:",
  `  take the node with the lowest ${extra}`,
  "  if it is the goal: trace the path and stop",
  "  for each neighbor:",
  "    if going through this node is cheaper, update its distance",
];

export const PSEUDOCODE: Readonly<Record<string, Pseudocode>> = {
  bfs: { lines: graphSearch("Dequeue", "Enqueue"), lineFor: { enqueue: 0, dequeue: 2, discover: 5, path: 3, complete: 1 } },
  dfs: { lines: graphSearch("Pop", "Push"), lineFor: { enqueue: 0, dequeue: 2, visit: 2, discover: 5, path: 3, complete: 1 } },
  "greedy-best-first": {
    lines: ["add the start node to the frontier", "while the frontier is not empty:", "  choose the node with the smallest heuristic", "  if it is the goal: trace the path and stop", "  for each neighbor not yet seen:", "    add it to the frontier"],
    lineFor: { enqueue: 0, visit: 2, discover: 5, path: 3, complete: 1 },
  },
  dijkstra: { lines: shortest("distance"), lineFor: { enqueue: 0, visit: 2, update: 5, path: 3, complete: 1 } },
  "a-star": { lines: shortest("distance plus heuristic"), lineFor: { enqueue: 0, visit: 2, update: 5, path: 3, complete: 1 } },
  bubble: {
    lines: ["repeat until nothing is left unsorted:", "  for each neighbouring pair in the unsorted part:", "    compare the pair", "    if the left is larger: swap them", "  the largest value is now in place"],
    lineFor: { compare: 2, swap: 3, complete: 4 },
  },
  selection: {
    lines: ["for each position from the left:", "  find the smallest value to its right", "    compare each candidate with the minimum", "  swap the minimum into this position", "the sorted part grows by one"],
    lineFor: { compare: 2, swap: 3, complete: 4 },
  },
  insertion: {
    lines: ["for each value from the second:", "  while it is smaller than the one before it:", "    compare it with the one before", "    swap them", "the sorted part grows by one"],
    lineFor: { compare: 2, swap: 3, complete: 4 },
  },
  merge: {
    lines: ["split the array into two halves", "sort each half the same way", "while both halves have values:", "  compare the front of each half", "  write the smaller one to the result"],
    lineFor: { compare: 3, swap: 4, complete: 1 },
  },
  heap: {
    lines: ["build a max-heap from the array", "repeat until one value is left:", "  swap the largest value (the root) with the last unsorted one", "  shrink the heap by one", "  sift the new root down: compare it with its children", "    swap with the larger child if it is bigger"],
    lineFor: { compare: 4, swap: 5, complete: 1 },
  },
  "bellman-ford": {
    lines: ["set the start distance to 0, all others to infinity", "repeat at most V − 1 times:", "  for every edge, in both directions:", "    if going through it is shorter, update the distance", "  if a whole pass changed nothing: stop"],
    lineFor: { enqueue: 0, update: 3, compare: 4, path: 4, complete: 4 },
  },
  kruskal: {
    lines: ["sort all edges from lightest to heaviest", "for each edge in that order:", "  look at its two ends", "  if they are already connected: skip it (it would close a loop)", "  otherwise: keep the edge and join the two groups", "the kept edges form the spanning tree"],
    lineFor: { enqueue: 0, compare: 2, reject: 3, accept: 4, complete: 5 },
  },
  shell: {
    lines: ["start with a gap of half the array length", "repeat until the gap has been 1:", "  for each value, compare it with the one a gap behind", "    compare the pair", "    if out of order: swap, then keep going back by the gap", "  halve the gap"],
    lineFor: { compare: 3, swap: 4, complete: 1 },
  },
  prim: {
    lines: ["start the tree at the start node", "while some node is outside the tree:", "  look at every edge from the tree to the outside", "  pick the lightest one", "  add it and the node it reaches to the tree", "no edge leaves the tree: done"],
    lineFor: { enqueue: 0, compare: 3, accept: 4, complete: 5 },
  },
  "floyd-warshall": {
    lines: ["set every pair distance to the direct edge, or infinity", "for each node k, in turn:", "  for every pair (i, j):", "    if i → k → j is shorter than i → j, use it", "after the last k, every pair has its shortest distance"],
    lineFor: { enqueue: 0, visit: 1, update: 3, path: 4, complete: 4 },
  },
  "linear-search": {
    lines: ["for each position from the left:", "  compare the value with the target", "  if equal: stop, found", "reached the end: not found"],
    lineFor: { compare: 1, complete: 2 },
  },
  "binary-search": {
    lines: ["keep a range of positions, at first all of them", "while the range is not empty:", "  look at the middle value", "  if equal to the target: stop, found", "  if smaller: keep the right half, otherwise the left half", "range empty: not found"],
    lineFor: { compare: 2, complete: 3 },
  },
  quick: {
    lines: ["pick the last value as the pivot", "for each value before the pivot:", "  compare it with the pivot", "  if smaller, move it to the left side", "put the pivot between the two sides, then sort each side"],
    lineFor: { compare: 2, swap: 3, complete: 4 },
  },
};

export function activeLine(algorithmId: string, step: Pick<AlgorithmStep, "type" | "line">): number | undefined {
  return step.line ?? PSEUDOCODE[algorithmId]?.lineFor[step.type];
}
