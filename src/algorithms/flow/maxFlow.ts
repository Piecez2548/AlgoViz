import { FLOW_SAMPLE } from "../shared/graph";
import type { GraphInput } from "../shared/graphTypes";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";
import { createAlgorithmStep } from "../shared/utils";

/** One way to move along the residual graph: forward along an edge with room left, or back along one that carries flow. */
interface Arc { edge: number; forward: boolean; from: string; to: string; room: number }

const braces = (ids: readonly string[]) => `{${ids.join(", ")}}`;

/**
 * Maximum flow from the start (source) to the goal (sink), where each edge's weight is its capacity.
 * Repeatedly find a path with room left in the residual graph, send as much as its narrowest edge
 * allows, and stop when no path is left. The paths can be chosen breadth-first (Edmonds-Karp: always
 * a path with the fewest edges) or depth-first (Ford-Fulkerson: the first path found).
 * At the end the nodes the source can still reach and the rest form a minimum cut, whose capacity equals the flow.
 */
function maxFlow(algorithmId: string, label: string, graph: GraphInput, order: "bfs" | "dfs"): AlgorithmExecution {
  const steps: AlgorithmStep[] = [];
  const edges = graph.edges;
  const flow = edges.map(() => 0);
  let checks = 0; let total = 0; let rounds = 0;

  const arcsFrom = (id: string): Arc[] => edges.flatMap((edge, index) => {
    const out: Arc[] = [];
    if (edge.from === id && edge.weight - flow[index] > 0) out.push({ edge: index, forward: true, from: id, to: edge.to, room: edge.weight - flow[index] });
    if (edge.to === id && flow[index] > 0) out.push({ edge: index, forward: false, from: id, to: edge.from, room: flow[index] });
    return out;
  });
  const snapshot = () => Object.fromEntries(edges.map((edge, index) => [`${edge.from}>${edge.to}`, flow[index]]));
  const base = () => ({ flows: snapshot(), metrics: { flow: total, operations: checks, visitedNodes: 0 } });

  /** Finds a path with room left, or null. Breadth-first takes the one with fewest edges; depth-first the first it runs into. */
  const search = (): Arc[] | null => {
    const via = new Map<string, Arc>(); const seen = new Set([graph.start]);
    if (order === "bfs") {
      for (const queue = [graph.start]; queue.length;) {
        const current = queue.shift()!;
        for (const arc of arcsFrom(current)) {
          checks++;
          if (seen.has(arc.to)) continue;
          seen.add(arc.to); via.set(arc.to, arc);
          if (arc.to === graph.goal) return trace(via);
          queue.push(arc.to);
        }
      }
      return null;
    }
    const walk = (current: string): boolean => {
      for (const arc of arcsFrom(current)) {
        checks++;
        if (seen.has(arc.to)) continue;
        seen.add(arc.to); via.set(arc.to, arc);
        if (arc.to === graph.goal || walk(arc.to)) return true;
      }
      return false;
    };
    return walk(graph.start) ? trace(via) : null;
  };
  const trace = (via: ReadonlyMap<string, Arc>): Arc[] => {
    const path: Arc[] = [];
    for (let at = graph.goal; at !== graph.start; at = via.get(at)!.from) path.unshift(via.get(at)!);
    return path;
  };

  steps.push(createAlgorithmStep(0, "enqueue", `${label} starts with no flow on any edge. Each round it finds a path from ${graph.start} to ${graph.goal} with room left and sends flow along it.`, { ...base(), currentNode: graph.start, targetNode: graph.goal, dataStructure: [{ label: "Flow so far", value: 0 }] }));
  for (let path = search(); path; path = search()) {
    rounds++;
    const bottleneck = Math.min(...path.map((arc) => arc.room));
    const nodes = [path[0].from, ...path.map((arc) => arc.to)];
    const undoes = path.filter((arc) => !arc.forward).map((arc) => `${arc.to}→${arc.from}`);
    const keys = path.map((arc) => `${edges[arc.edge].from}-${edges[arc.edge].to}`);
    steps.push(createAlgorithmStep(steps.length, "compare", `Round ${rounds}: ${order === "bfs" ? "the path with the fewest edges" : "the first path found"} is ${nodes.join(" → ")}. Its narrowest step has room for ${bottleneck}${undoes.length ? `, and it takes back flow on ${undoes.join(", ")}` : ""}.`, { ...base(), visited: nodes, acceptedEdges: keys, currentNode: graph.start, targetNode: graph.goal, dataStructure: [{ label: "Augmenting path", value: nodes.join(" → ") }, { label: "Room on it", value: bottleneck }, { label: "Flow so far", value: total }] }));
    for (const arc of path) flow[arc.edge] += arc.forward ? bottleneck : -bottleneck;
    total += bottleneck;
    steps.push(createAlgorithmStep(steps.length, "update", `Send ${bottleneck} along it. The flow from ${graph.start} to ${graph.goal} is now ${total}.`, { ...base(), visited: nodes, acceptedEdges: keys, dataStructure: [{ label: "Flow so far", value: total }, { label: "Rounds", value: rounds }] }));
  }
  // What the source can still reach now, against the rest, is a minimum cut.
  const reach = new Set([graph.start]);
  for (const queue = [graph.start]; queue.length;) for (const arc of arcsFrom(queue.shift()!)) if (!reach.has(arc.to)) { reach.add(arc.to); queue.push(arc.to); }
  const sourceSide = graph.nodes.map((node) => node.id).filter((id) => reach.has(id));
  const sinkSide = graph.nodes.map((node) => node.id).filter((id) => !reach.has(id));
  const cut = edges.filter((edge) => reach.has(edge.from) && !reach.has(edge.to));
  const capacity = cut.reduce((sum, edge) => sum + edge.weight, 0);
  const cutText = cut.map((edge) => `${edge.from}→${edge.to} (${edge.weight})`).join(" + ") || "no edges";
  steps.push(createAlgorithmStep(steps.length, "complete", total === 0 ? `No path from ${graph.start} to ${graph.goal} has any room, so no flow can pass.` : `No path with room is left, so ${total} is the most that can flow. The nodes ${graph.start} can still reach, ${braces(sourceSide)}, are cut off from ${braces(sinkSide)} by ${cutText}, a total capacity of ${capacity}: the same as the flow.`, { ...base(), visited: graph.nodes.map((node) => node.id), groups: [sourceSide, sinkSide], dataStructure: [{ label: "Max flow", value: total }, { label: "Minimum cut", value: `${braces(sourceSide)} | ${braces(sinkSide)}` }, { label: "Cut edges", value: cutText }, { label: "Rounds", value: rounds }] }));
  return { algorithmId, inputLabel: `${graph.label ?? "Flow network"} · ${graph.start} → ${graph.goal}`, steps, completed: true };
}

export const runEdmondsKarp = (graph: GraphInput = FLOW_SAMPLE): AlgorithmExecution => maxFlow("edmonds-karp", "Edmonds-Karp", graph, "bfs");
export const runFordFulkerson = (graph: GraphInput = FLOW_SAMPLE): AlgorithmExecution => maxFlow("ford-fulkerson", "Ford-Fulkerson", graph, "dfs");
