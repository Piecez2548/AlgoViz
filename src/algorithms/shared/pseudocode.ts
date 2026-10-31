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
    lines: ["set the start distance to 0, all others to infinity", "repeat at most V − 1 times:", "  for every edge (both ways, unless the graph is directed):", "    if going through it is shorter, update the distance", "  if a whole pass changed nothing: stop"],
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
  counting: {
    lines: ["make a counter for every possible value", "for each value in the array:", "  add one to its counter", "for each value from smallest to largest:", "  write it back as many times as its counter says"],
    lineFor: { visit: 2, swap: 4, complete: 4 },
  },
  radix: {
    lines: ["for each digit, from the ones digit upwards:", "  put every value in a bucket for that digit", "    look at the digit and pick the bucket", "  collect the buckets in order, keeping each bucket's order", "after the highest digit the array is sorted"],
    lineFor: { visit: 2, swap: 3, complete: 4 },
  },
  "bidirectional-bfs": {
    lines: ["put the start in one queue and the goal in another", "while neither queue is empty and the searches have not met:", "  take the smaller queue and expand its whole level", "    for each neighbor: if the other search has reached it, the searches meet", "    otherwise mark it reached and queue it", "join the two routes at the meeting point"],
    lineFor: { enqueue: 0, dequeue: 2, discover: 3, path: 5, complete: 5 },
  },
  kahn: {
    lines: ["count how many tasks each task waits for", "put every task that waits for nothing in a queue", "while the queue is not empty:", "  take a task and place it next in the order", "  for each task that was waiting for it: wait for one less", "  if one now waits for nothing, queue it", "tasks left over when the queue is empty: they wait on each other (a loop)"],
    lineFor: { enqueue: 1, dequeue: 3, update: 4, discover: 5, reject: 6, complete: 6 },
  },
  "dfs-topological": {
    lines: ["for each task not yet explored:", "  start exploring it", "  explore every task it points to first", "  if one of them is still being explored: that is a loop", "  when all of those are finished, put this task in front of the order"],
    lineFor: { enqueue: 0, visit: 1, reject: 3, dequeue: 4, complete: 4 },
  },
  tarjan: {
    lines: ["search depth-first; give each node a number and a lowlink", "push each node on a stack when it is reached", "after each edge v → w: lowlink(v) = the smaller of lowlink(v) and what w can get back to", "if lowlink(v) equals v's own number:", "  pop the stack down to v: that is one component"],
    lineFor: { enqueue: 0, visit: 1, update: 2, compare: 2, reject: 2, accept: 4, complete: 4 },
  },
  kosaraju: {
    lines: ["pass 1: search depth-first and note the order nodes finish", "pass 2: take the node that finished last", "  walk the edges backwards from it", "  everything reached that is not in a component yet joins this one", "repeat for the next node that is not in a component"],
    lineFor: { enqueue: 0, visit: 2, dequeue: 0, accept: 4, complete: 4 },
  },
  "edmonds-karp": {
    lines: ["start with no flow on any edge", "while there is a path from the source to the sink with room left:", "  take the one with the fewest edges (breadth-first)", "  find its narrowest step: that is how much fits", "  send that much along it (take back flow on any edge used in reverse)", "no path left: the flow is the most possible"],
    lineFor: { enqueue: 0, compare: 2, update: 4, complete: 5 },
  },
  "ford-fulkerson": {
    lines: ["start with no flow on any edge", "while there is a path from the source to the sink with room left:", "  take the first one found (depth-first)", "  find its narrowest step: that is how much fits", "  send that much along it (take back flow on any edge used in reverse)", "no path left: the flow is the most possible"],
    lineFor: { enqueue: 0, compare: 2, update: 4, complete: 5 },
  },
  kuhn: {
    lines: ["split the nodes into a left side and a right side", "for each left node in turn:", "  look at each partner it could have", "  if the partner is free: take it", "  if the partner is taken: ask whoever has it to move to another partner", "  if that works, flip the chain of pairs: one more pair", "if no partner can be freed up, the node stays unmatched"],
    lineFor: { enqueue: 0, visit: 1, compare: 2, update: 4, accept: 5, reject: 6, complete: 6 },
  },
  "hopcroft-karp": {
    lines: ["split the nodes into a left side and a right side", "repeat in phases:", "  search outward from the free left nodes, layer by layer, until a free partner turns up", "  if none can be reached: stop, the matching is the biggest possible", "  for each free left node, follow the layers to a free partner", "  flip the chain of pairs: one more pair", "  if no path of that length is left, the node waits for the next phase"],
    lineFor: { enqueue: 0, visit: 4, compare: 4, update: 4, accept: 5, reject: 6, complete: 3 },
  },
  "greedy-matching": {
    lines: ["split the nodes into a left side and a right side", "for each left node in turn:", "  look at each partner it could have", "  take the first one that is still free", "  never change a pair once it is made", "if every partner is taken, the node stays unmatched"],
    lineFor: { enqueue: 0, visit: 1, compare: 2, accept: 3, reject: 5, complete: 4 },
  },
  quick: {
    lines: ["pick the last value as the pivot", "for each value before the pivot:", "  compare it with the pivot", "  if smaller, move it to the left side", "put the pivot between the two sides, then sort each side"],
    lineFor: { compare: 2, swap: 3, complete: 4 },
  },
};

export function activeLine(algorithmId: string, step: Pick<AlgorithmStep, "type" | "line">): number | undefined {
  return step.line ?? PSEUDOCODE[algorithmId]?.lineFor[step.type];
}
