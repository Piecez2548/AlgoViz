import { edgeKey, MATCH_SAMPLE } from "../shared/graph";
import type { GraphInput } from "../shared/graphTypes";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";
import { createAlgorithmStep } from "../shared/utils";

/** The label under which a run reports that the graph cannot be split into two sides. */
export const NOT_BIPARTITE_LABEL = "Not bipartite";

export interface Sides { left: string[]; right: string[]; conflict?: undefined }
export interface Conflict { conflict: [string, string]; left?: undefined; right?: undefined }

const neighbours = (graph: GraphInput, id: string) => graph.edges.flatMap((edge) => (edge.from === id ? [edge.to] : edge.to === id ? [edge.from] : []));

/**
 * Splits the nodes into two sides so every edge joins one node from each, by colouring a node's neighbours the
 * opposite colour, component by component. If some edge joins two nodes of the same colour there is no such split.
 */
export function splitSides(graph: GraphInput): Sides | Conflict {
  const colour = new Map<string, 0 | 1>();
  for (const node of graph.nodes) {
    if (colour.has(node.id)) continue;
    colour.set(node.id, 0);
    for (const queue = [node.id]; queue.length;) {
      const current = queue.shift()!;
      for (const other of neighbours(graph, current)) {
        if (!colour.has(other)) { colour.set(other, colour.get(current) === 0 ? 1 : 0); queue.push(other); }
        else if (colour.get(other) === colour.get(current)) return { conflict: [current, other] };
      }
    }
  }
  const ids = graph.nodes.map((node) => node.id);
  return { left: ids.filter((id) => colour.get(id) === 0), right: ids.filter((id) => colour.get(id) === 1) };
}

const pairText = (pairs: readonly (readonly [string, string])[]) => pairs.map(([l, r]) => `${l}–${r}`).join(", ") || "none yet";

function notBipartite(algorithmId: string, graph: GraphInput, conflict: [string, string]): AlgorithmExecution {
  const [a, b] = conflict;
  const steps: AlgorithmStep[] = [
    createAlgorithmStep(0, "enqueue", "Matching pairs a node on one side with a node on the other, so first split the nodes into two sides.", { metrics: { matched: 0, operations: 0 } }),
    createAlgorithmStep(1, "reject", `${a} and ${b} are joined by an edge but would have to be on the same side, so the nodes cannot be split into two sides: the graph is not bipartite.`, { activeEdge: edgeKey(a, b), currentNode: a, targetNode: b, dataStructure: [{ label: NOT_BIPARTITE_LABEL, value: `${a}–${b}` }], metrics: { matched: 0, operations: 0 } }),
    createAlgorithmStep(2, "complete", `No bipartite matching here: the edge ${a}–${b} joins two nodes that would be on the same side. Remove it, or rearrange the edges so the nodes split into two sides.`, { dataStructure: [{ label: NOT_BIPARTITE_LABEL, value: `${a}–${b}` }], metrics: { matched: 0, operations: 0 } }),
  ];
  return { algorithmId, inputLabel: `${graph.label ?? "Graph"} · not bipartite`, steps, completed: true };
}

/** Shared bookkeeping: the matching so far as pairs, what the steps show, and the closing step. */
function runner(algorithmId: string, graph: GraphInput, sides: Sides, closing: (size: number, unmatched: string[]) => string) {
  const steps: AlgorithmStep[] = [];
  const match = new Map<string, string>(); // right node → left node
  let checks = 0;
  const pairs = (): [string, string][] => [...match.entries()].map(([right, left]) => [left, right] as [string, string]);
  const base = (extra: Partial<AlgorithmStep> = {}) => ({ groups: [sides.left, sides.right], acceptedEdges: pairs().map(([l, r]) => edgeKey(l, r)), visited: pairs().flat(), dataStructure: [{ label: "Matched pairs", value: pairText(pairs()) }], metrics: { matched: match.size, operations: checks }, ...extra });
  const add = (type: AlgorithmStep["type"], explanation: string, extra: Partial<AlgorithmStep> = {}) => steps.push(createAlgorithmStep(steps.length, type, explanation, base(extra)));
  const finish = (): AlgorithmExecution => {
    const unmatched = graph.nodes.map((node) => node.id).filter((id) => !pairs().flat().includes(id));
    steps.push(createAlgorithmStep(steps.length, "complete", `Matched ${match.size} pair${match.size === 1 ? "" : "s"}: ${pairText(pairs())}. ${closing(match.size, unmatched)}`, base({ dataStructure: [{ label: "Matched pairs", value: pairText(pairs()) }, { label: "Unmatched", value: unmatched.join(", ") || "none" }] })));
    return { algorithmId, inputLabel: `${graph.label ?? "Bipartite graph"} · ${sides.left.length} + ${sides.right.length} nodes`, steps, completed: true };
  };
  return { match, add, finish, check: () => { checks++; } };
}

/**
 * Kuhn's algorithm: take the nodes on the left one at a time and look for an augmenting path: a partner that is
 * free, or one that is taken by somebody who can move to another free partner (and so on). Flipping that path
 * adds one pair. If no augmenting path exists for any node, the matching cannot be made bigger.
 */
export function runKuhn(graph: GraphInput = MATCH_SAMPLE): AlgorithmExecution {
  const sides = splitSides(graph);
  if (sides.conflict) return notBipartite("kuhn", graph, sides.conflict);
  const { match, add, finish, check } = runner("kuhn", graph, sides, () => "No left node can find an augmenting path any more, so no bigger matching exists.");
  add("enqueue", `Split the nodes into two sides: ${sides.left.join(", ")} on the left and ${sides.right.join(", ")} on the right. Each left node looks for a partner in turn.`);
  const find = (u: string, seen: Set<string>): [string, string][] | null => {
    for (const v of neighbours(graph, u)) {
      check();
      if (seen.has(v)) continue;
      seen.add(v);
      add("compare", `${u} – ${v}: is ${v} free?`, { activeEdge: edgeKey(u, v), currentNode: u, targetNode: v });
      const holder = match.get(v);
      if (holder === undefined) return [[u, v]];
      add("update", `${v} is already matched with ${holder}. Ask ${holder} to look for another partner.`, { activeEdge: edgeKey(u, v), currentNode: holder, targetNode: v });
      const rest = find(holder, seen);
      if (rest) return [[u, v], ...rest];
    }
    return null;
  };
  for (const u of sides.left) {
    add("visit", `Look for a partner for ${u}.`, { currentNode: u });
    const path = find(u, new Set());
    if (!path) { add("reject", `No partner can be freed up for ${u}, so ${u} stays unmatched for now.`, { currentNode: u }); continue; }
    const moves = path.slice(1).map(([left, right], index) => `${left} moves from ${path[index][1]} to ${right}`);
    for (const [left, right] of path) match.set(right, left);
    add("accept", `Pair ${u} with ${path[0][1]}${moves.length ? `; ${moves.join(", ")}` : ""}. The matching grows to ${match.size}.`, { currentNode: u });
  }
  return finish();
}

/**
 * Greedy matching: give each left node the first partner that is still free, and never change a pair once made.
 * The result is maximal (no pair can simply be added) but not always maximum.
 */
export function runGreedyMatching(graph: GraphInput = MATCH_SAMPLE): AlgorithmExecution {
  const sides = splitSides(graph);
  if (sides.conflict) return notBipartite("greedy-matching", graph, sides.conflict);
  const { match, add, finish, check } = runner("greedy-matching", graph, sides, (_size, unmatched) => (unmatched.some((id) => sides.left.includes(id)) ? "Greedy never moves a pair that is already made, so a left node can be left out even though a bigger matching exists." : "Greedy never moves a pair that is already made, so on other graphs it can come out smaller than the best possible."));
  add("enqueue", `Split the nodes into two sides: ${sides.left.join(", ")} on the left and ${sides.right.join(", ")} on the right. Each left node takes the first partner that is still free.`);
  for (const u of sides.left) {
    add("visit", `Look for a partner for ${u}.`, { currentNode: u });
    let paired = false;
    for (const v of neighbours(graph, u)) {
      check();
      add("compare", `${u} – ${v}: is ${v} free?`, { activeEdge: edgeKey(u, v), currentNode: u, targetNode: v });
      if (match.has(v)) continue;
      match.set(v, u); paired = true;
      add("accept", `${v} is free: pair ${u} with ${v}. The matching grows to ${match.size}.`, { currentNode: u, targetNode: v });
      break;
    }
    if (!paired) add("reject", `Every partner ${u} could have is taken, so ${u} stays unmatched.`, { currentNode: u });
  }
  return finish();
}

/**
 * Hopcroft-Karp: work in phases. Each phase first searches outward from every free left node, layer by layer, to
 * find how short the shortest augmenting path is. Then it looks for paths of exactly that length, from each free left
 * node in turn, and flips all it finds. Fewer phases are needed than Kuhn needs single searches: O(E · √V).
 */
export function runHopcroftKarp(graph: GraphInput = MATCH_SAMPLE): AlgorithmExecution {
  const sides = splitSides(graph);
  if (sides.conflict) return notBipartite("hopcroft-karp", graph, sides.conflict);
  const { match, add, finish, check } = runner("hopcroft-karp", graph, sides, () => "No free left node can reach a free partner any more, so no bigger matching exists.");
  const mate = new Map<string, string>(); // left node → right node
  add("enqueue", `Split the nodes into two sides: ${sides.left.join(", ")} on the left and ${sides.right.join(", ")} on the right. Work in phases: find the shortest augmenting paths, then flip as many of them as possible.`);
  for (let phase = 1; ; phase++) {
    // Layer the left nodes: free ones are layer 0, and each taken partner's owner is one layer further out.
    const layer = new Map<string, number>();
    const queue = sides.left.filter((id) => !mate.has(id));
    for (const id of queue) layer.set(id, 0);
    let shortest = Infinity;
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head]; const depth = layer.get(u)!;
      if (depth > shortest) break;
      for (const v of neighbours(graph, u)) {
        check();
        const holder = match.get(v);
        if (holder === undefined) shortest = depth;
        else if (!layer.has(holder)) { layer.set(holder, depth + 1); queue.push(holder); }
      }
    }
    if (shortest === Infinity) break;
    const free = sides.left.filter((id) => !mate.has(id));
    add("enqueue", `Phase ${phase}: search outward from ${free.join(", ")} layer by layer. The nearest free partner is ${shortest + 1} step${shortest === 0 ? "" : "s"} of pairing away, so this phase only uses paths that short.`, { line: 2, dataStructure: [{ label: "Matched pairs", value: pairText([...match.entries()].map(([r, l]) => [l, r] as [string, string])) }, { label: "Phase", value: String(phase) }, { label: "Free left nodes", value: free.join(", ") }, { label: "Shortest path", value: `${shortest + 1} pairing${shortest === 0 ? "" : "s"}` }] });
    const find = (u: string): [string, string][] | null => {
      for (const v of neighbours(graph, u)) {
        check();
        const holder = match.get(v);
        // Only follow the layers: a free partner counts at the shortest depth, a taken one only if its owner is one layer further out.
        if (holder === undefined ? layer.get(u) !== shortest : layer.get(holder) !== layer.get(u)! + 1) continue;
        add("compare", `${u} – ${v}: is ${v} free?`, { activeEdge: edgeKey(u, v), currentNode: u, targetNode: v });
        if (holder === undefined) return [[u, v]];
        add("update", `${v} is already matched with ${holder}. Ask ${holder} to look for another partner.`, { activeEdge: edgeKey(u, v), currentNode: holder, targetNode: v });
        const rest = find(holder);
        if (rest) return [[u, v], ...rest];
      }
      layer.set(u, Infinity); // a dead end for the rest of this phase
      return null;
    };
    for (const u of free) {
      add("visit", `Look for a shortest path from ${u}.`, { currentNode: u });
      const path = find(u);
      if (!path) { add("reject", `No path of the right length starts at ${u} any more, so ${u} waits for a later phase.`, { currentNode: u }); continue; }
      const moves = path.slice(1).map(([left, right], index) => `${left} moves from ${path[index][1]} to ${right}`);
      for (const [left, right] of path) { match.set(right, left); mate.set(left, right); }
      add("accept", `Pair ${u} with ${path[0][1]}${moves.length ? `; ${moves.join(", ")}` : ""}. The matching grows to ${match.size}.`, { currentNode: u });
    }
  }
  return finish();
}
