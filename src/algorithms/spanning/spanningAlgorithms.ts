import { edgeKey, SAMPLE_GRAPH } from "../shared/graph";
import type { GraphInput } from "../shared/graphTypes";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";
import { createAlgorithmStep } from "../shared/utils";

/**
 * Kruskal's minimum spanning tree: look at the edges from lightest to heaviest and keep an edge only
 * if it joins two groups that are not yet connected (otherwise it would close a loop). A disjoint-set
 * (union-find) structure tracks the groups. A disconnected graph ends with a spanning forest.
 */
export function runKruskal(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const root = new Map(graph.nodes.map((node) => [node.id, node.id]));
  const find = (id: string): string => { let current = id; while (root.get(current) !== current) current = root.get(current)!; return current; };
  const groups = () => {
    const byRoot = new Map<string, string[]>();
    for (const node of graph.nodes) byRoot.set(find(node.id), [...(byRoot.get(find(node.id)) ?? []), node.id]);
    return [...byRoot.values()].map((members) => `{${members.join(", ")}}`).join(" ");
  };
  const sorted = [...graph.edges].sort((a, b) => a.weight - b.weight || edgeKey(a.from, a.to).localeCompare(edgeKey(b.from, b.to)));
  const accepted: string[] = []; const rejected: string[] = [];
  let total = 0; let checks = 0;
  const touched = () => [...new Set(accepted.flatMap((key) => key.split("-")))];
  const data = () => [{ label: "Groups", value: groups() }, { label: "Total weight", value: total }];
  const base = (activeEdge?: string) => ({ activeEdge, visited: touched(), acceptedEdges: accepted, rejectedEdges: rejected, dataStructure: data() });
  steps.push(createAlgorithmStep(0, "enqueue", `Sort the ${sorted.length} edges by weight: ${sorted.map((edge) => `${edgeKey(edge.from, edge.to)} (${edge.weight})`).join(", ")}.`, { ...base(), metrics: { operations: 0 } }));
  for (const edge of sorted) {
    const key = edgeKey(edge.from, edge.to);
    checks++;
    steps.push(createAlgorithmStep(steps.length, "compare", `Look at ${key} with weight ${edge.weight}. Are ${edge.from} and ${edge.to} already connected?`, { ...base(key), currentNode: edge.from, targetNode: edge.to, metrics: { operations: checks } }));
    const a = find(edge.from); const b = find(edge.to);
    if (a === b) {
      rejected.push(key);
      steps.push(createAlgorithmStep(steps.length, "reject", `Yes, so ${key} would close a loop. Skip it.`, { ...base(key), metrics: { operations: checks } }));
    } else {
      root.set(a, b); accepted.push(key); total += edge.weight;
      steps.push(createAlgorithmStep(steps.length, "accept", `No, so keep ${key} and join the two groups. Total weight is now ${total}.`, { ...base(key), metrics: { operations: checks } }));
    }
  }
  const components = new Set(graph.nodes.map((node) => find(node.id))).size;
  steps.push(createAlgorithmStep(steps.length, "complete", components === 1 ? `Minimum spanning tree found: ${accepted.length} edges, total weight ${total}.` : `The graph is not fully connected, so Kruskal built a spanning forest of ${components} trees (total weight ${total}).`, { ...base(), metrics: { operations: checks } }));
  return { algorithmId: "kruskal", inputLabel: `${graph.label ?? "Sample graph"} · ${graph.nodes.length} nodes, ${graph.edges.length} edges`, steps, completed: true };
}

/**
 * Prim's minimum spanning tree: grow one tree outward from the start node. Every round, look at all
 * the edges that leave the tree and keep the lightest one. Unlike Kruskal there are never any loops
 * to reject. Only the start node's side of a disconnected graph can be reached.
 */
export function runPrim(graph: GraphInput = SAMPLE_GRAPH): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const inTree = new Set([graph.start]);
  const accepted: string[] = [];
  let total = 0; let checks = 0;
  const data = () => [{ label: "Tree nodes", value: [...inTree].join(", ") }, { label: "Total weight", value: total }];
  const base = (activeEdge?: string, frontier: readonly string[] = []) => ({ activeEdge, visited: [...inTree], frontier, acceptedEdges: accepted, dataStructure: data() });
  steps.push(createAlgorithmStep(0, "enqueue", `Start the tree at ${graph.start}.`, { ...base(), currentNode: graph.start, metrics: { operations: 0 } }));
  for (;;) {
    const crossing = graph.edges.filter((edge) => inTree.has(edge.from) !== inTree.has(edge.to));
    if (!crossing.length) break;
    checks += crossing.length;
    const best = [...crossing].sort((a, b) => a.weight - b.weight || edgeKey(a.from, a.to).localeCompare(edgeKey(b.from, b.to)))[0];
    const key = edgeKey(best.from, best.to);
    const outside = inTree.has(best.from) ? best.to : best.from;
    const inside = outside === best.from ? best.to : best.from;
    const reach = [...new Set(crossing.map((edge) => (inTree.has(edge.from) ? edge.to : edge.from)))];
    steps.push(createAlgorithmStep(steps.length, "compare", `${crossing.length} edge${crossing.length === 1 ? "" : "s"} leave the tree. The lightest is ${key} with weight ${best.weight}.`, { ...base(key, reach), currentNode: inside, targetNode: outside, metrics: { operations: checks } }));
    inTree.add(outside); accepted.push(key); total += best.weight;
    steps.push(createAlgorithmStep(steps.length, "accept", `Add ${key} and bring ${outside} into the tree. Total weight is now ${total}.`, { ...base(key), currentNode: outside, metrics: { operations: checks } }));
  }
  const missed = graph.nodes.length - inTree.size;
  steps.push(createAlgorithmStep(steps.length, "complete", missed === 0 ? `Minimum spanning tree found: ${accepted.length} edges, total weight ${total}.` : `${missed} node${missed === 1 ? " is" : "s are"} not connected to ${graph.start}, so Prim built a tree for ${inTree.size} of ${graph.nodes.length} nodes (total weight ${total}).`, { ...base(), metrics: { operations: checks } }));
  return { algorithmId: "prim", inputLabel: `${graph.label ?? "Sample graph"} · from ${graph.start}`, steps, completed: true };
}
