import { edgeKey } from "./graph";
import type { GraphInput, GraphNode } from "./graphTypes";

export const MAX_NODES = 12;
export const MIN_NODES = 2;
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 99;
export const DEFAULT_WEIGHT = 3;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const clamp = (value: number) => Math.min(96, Math.max(4, Math.round(value * 10) / 10));

/** The first letter not already used, so ids stay short and readable. */
export function nextNodeId(graph: GraphInput): string {
  const used = new Set(graph.nodes.map((node) => node.id));
  return [...LETTERS].find((letter) => !used.has(letter)) ?? `N${graph.nodes.length + 1}`;
}

export const validWeight = (value: number): boolean => Number.isInteger(value) && value >= MIN_WEIGHT && value <= MAX_WEIGHT;

/** Adds a node at (x, y); returns the graph unchanged when it is full. */
export function addNode(graph: GraphInput, x: number, y: number): GraphInput {
  if (graph.nodes.length >= MAX_NODES) return graph;
  const node: GraphNode = { id: nextNodeId(graph), x: clamp(x), y: clamp(y), heuristic: 0 };
  return { ...graph, nodes: [...graph.nodes, node] };
}

/** A free spot for "Add node" without a pointer: the point farthest from every existing node on a coarse grid. */
export function freeSpot(graph: GraphInput): { x: number; y: number } {
  let best = { x: 50, y: 50 }; let bestDistance = -1;
  for (let x = 10; x <= 90; x += 10) for (let y = 10; y <= 90; y += 10) {
    const nearest = Math.min(Infinity, ...graph.nodes.map((node) => Math.hypot(node.x - x, node.y - y)));
    if (nearest > bestDistance) { best = { x, y }; bestDistance = nearest; }
  }
  return best;
}

export function moveNode(graph: GraphInput, id: string, x: number, y: number): GraphInput {
  return { ...graph, nodes: graph.nodes.map((node) => (node.id === id ? { ...node, x: clamp(x), y: clamp(y) } : node)) };
}

/** Removes a node and its edges. If it was the start or goal, another node takes over; never fewer than two nodes. */
export function removeNode(graph: GraphInput, id: string): GraphInput {
  if (graph.nodes.length <= MIN_NODES || !graph.nodes.some((node) => node.id === id)) return graph;
  const nodes = graph.nodes.filter((node) => node.id !== id);
  const pick = (current: string, avoid: string) => (current !== id ? current : nodes.find((node) => node.id !== avoid)!.id);
  const start = pick(graph.start, graph.goal === id ? "" : graph.goal);
  const goal = pick(graph.goal, start);
  return { ...graph, nodes, edges: graph.edges.filter((edge) => edge.from !== id && edge.to !== id), start, goal };
}

/** Adds the edge between two nodes, or changes its weight if it already exists. Ignores loops and bad weights. */
export function setEdge(graph: GraphInput, a: string, b: string, weight: number): GraphInput {
  if (a === b || !validWeight(weight)) return graph;
  if (!graph.nodes.some((node) => node.id === a) || !graph.nodes.some((node) => node.id === b)) return graph;
  const key = edgeKey(a, b);
  const exists = graph.edges.some((edge) => edgeKey(edge.from, edge.to) === key);
  const edges = exists ? graph.edges.map((edge) => (edgeKey(edge.from, edge.to) === key ? { ...edge, weight } : edge)) : [...graph.edges, { from: a < b ? a : b, to: a < b ? b : a, weight }];
  return { ...graph, edges };
}

export function removeEdge(graph: GraphInput, a: string, b: string): GraphInput {
  const key = edgeKey(a, b);
  return { ...graph, edges: graph.edges.filter((edge) => edgeKey(edge.from, edge.to) !== key) };
}

/** Choose the start or goal; picking the node the other end uses swaps them so they always differ. */
export function setEndpoint(graph: GraphInput, which: "start" | "goal", id: string): GraphInput {
  if (!graph.nodes.some((node) => node.id === id)) return graph;
  const other = which === "start" ? "goal" : "start";
  return graph[other] === id ? { ...graph, [which]: id, [other]: graph[which] } : { ...graph, [which]: id };
}
