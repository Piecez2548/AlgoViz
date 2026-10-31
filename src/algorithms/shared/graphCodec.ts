import { arcKey, MAX_NODES, MIN_NODES, validWeight } from "./graphEdit";
import type { GraphEdge, GraphInput, GraphNode } from "./graphTypes";

const ID = /^[A-Za-z0-9]{1,3}$/;
const round = (value: number) => Math.round(value * 10) / 10;

/**
 * A graph as one short string for a link: nodes `id:x:y`, edges `from:to:weight`, then the start and goal,
 * separated by `~`. A directed graph ends with `~d` (`~du` when its edges carry no weights). Example: `A:12:48,B:35:20~A:B:2~A~B`.
 */
export function encodeGraph(graph: GraphInput): string {
  const nodes = graph.nodes.map((node) => `${node.id}:${round(node.x)}:${round(node.y)}`).join(",");
  const edges = graph.edges.map((edge) => `${edge.from}:${edge.to}:${edge.weight}`).join(",");
  return [nodes, edges, graph.start, graph.goal, ...(graph.directed ? [graph.unweighted ? "du" : "d"] : [])].join("~");
}

/** Reads a graph back, or returns null when anything is missing or out of range, so a bad link falls back to the sample. */
export function decodeGraph(text: string | null | undefined): GraphInput | null {
  if (!text) return null;
  const parts = text.split("~");
  if (parts.length !== 4 && !(parts.length === 5 && (parts[4] === "d" || parts[4] === "du"))) return null;
  const [nodeText, edgeText, start, goal] = parts;
  const directed = parts.length === 5;
  const unweighted = parts[4] === "du";
  const nodes: GraphNode[] = [];
  for (const item of nodeText.split(",")) {
    const [id, x, y, ...rest] = item.split(":");
    const px = Number(x); const py = Number(y);
    if (rest.length || !ID.test(id ?? "") || !x || !y || !Number.isFinite(px) || !Number.isFinite(py) || px < 0 || px > 100 || py < 0 || py > 100) return null;
    nodes.push({ id, x: px, y: py, heuristic: 0 });
  }
  if (nodes.length < MIN_NODES || nodes.length > MAX_NODES || new Set(nodes.map((node) => node.id)).size !== nodes.length) return null;
  const ids = new Set(nodes.map((node) => node.id));
  const edges: GraphEdge[] = []; const seen = new Set<string>();
  for (const item of edgeText ? edgeText.split(",") : []) {
    const [from, to, weight, ...rest] = item.split(":");
    const w = Number(weight);
    const key = arcKey({ directed }, from, to);
    if (rest.length || !weight || !ids.has(from) || !ids.has(to) || from === to || !validWeight(w, directed) || seen.has(key)) return null;
    seen.add(key);
    edges.push(directed || from < to ? { from, to, weight: w } : { from: to, to: from, weight: w });
  }
  if (!ids.has(start) || !ids.has(goal) || start === goal) return null;
  return { label: "Your graph", ...(directed ? { directed } : {}), ...(unweighted ? { unweighted } : {}), nodes, edges, start, goal };
}
