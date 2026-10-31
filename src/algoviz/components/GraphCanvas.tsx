import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { edgeKey } from "../../algorithms/shared/graph";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import type { AlgorithmStep } from "../../algorithms/shared/types";

export type GraphTool = "move" | "node" | "connect";

export interface GraphEditing {
  tool: GraphTool;
  onMove: (id: string, x: number, y: number) => void;
  onAddAt: (x: number, y: number) => void;
  onConnect: (a: string, b: string) => void;
}

const KEY_STEP = 2;

/** Pointer position as a point on the 0–100 canvas. Exported so it can be tested without a layout engine. */
export function toCanvasPoint(clientX: number, clientY: number, rect: Pick<DOMRect, "left" | "top" | "width" | "height">): { x: number; y: number } {
  return { x: ((clientX - rect.left) / (rect.width || 1)) * 100, y: ((clientY - rect.top) / (rect.height || 1)) * 100 };
}

export function GraphCanvas({ graph, step, route, editing }: { graph: GraphInput; step: AlgorithmStep; route: readonly string[]; editing?: GraphEditing }) {
  const visited = new Set(step.visited ?? []); const frontier = new Set(step.frontier ?? []); const path = new Set(route);
  const find = (id: string) => graph.nodes.find((item) => item.id === id) ?? graph.nodes[0];
  const accepted = new Set(step.acceptedEdges ?? []); const rejected = new Set(step.rejectedEdges ?? []);
  const svg = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  // Only the steps of the route are lit, in the direction they were taken.
  const steps = new Set(route.slice(1).map((id, index) => `${route[index]}>${id}`));
  const onRoute = (from: string, to: string) => steps.has(`${from}>${to}`) || (!graph.directed && steps.has(`${to}>${from}`));
  const edgeClass = (from: string, to: string) => {
    const key = edgeKey(from, to);
    if (onRoute(from, to)) return "algoviz-edge algoviz-edge-path";
    return `algoviz-edge${accepted.has(key) ? " algoviz-edge-accepted" : ""}${rejected.has(key) ? " algoviz-edge-rejected" : ""}${step.activeEdge === key ? " algoviz-edge-active" : ""}`;
  };
  const point = (event: PointerEvent) => toCanvasPoint(event.clientX, event.clientY, svg.current!.getBoundingClientRect());
  const choose = (id: string) => {
    if (editing?.tool !== "connect") return;
    if (!pending) { setPending(id); return; }
    if (pending !== id) editing.onConnect(pending, id);
    setPending(null);
  };
  const keyDown = (event: KeyboardEvent, id: string) => {
    if (!editing) return;
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(id); return; }
    const delta: Record<string, [number, number]> = { ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, -KEY_STEP], ArrowDown: [0, KEY_STEP] };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault(); event.stopPropagation();
    const node = find(id);
    editing.onMove(id, node.x + move[0], node.y + move[1]);
  };
  const editable = Boolean(editing);
  return <div className={`algoviz-graph-canvas${editable ? " is-editable" : ""}`}>
    <svg ref={svg} viewBox="0 0 100 100" role={editable ? "group" : "img"} aria-label={editable ? "Graph you can edit. Nodes can be moved with the arrow keys." : "Graph execution visualization"}
      onPointerDown={(event) => { if (editing?.tool === "node" && event.target === svg.current) { const at = point(event); editing.onAddAt(at.x, at.y); } }}
      onPointerMove={(event) => { if (dragging && editing) { const at = point(event); editing.onMove(dragging, at.x, at.y); } }}
      onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
      {graph.directed && <defs>
        <marker id="algoviz-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0,0 L10,5 L0,10 z" style={{ fill: "#8f9bbf" }} /></marker>
        <marker id="algoviz-arrow-path" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--algo-accent)" }} /></marker>
      </defs>}
      {graph.edges.map((edge) => {
        const a = find(edge.from); const b = find(edge.to);
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1; const ux = (b.x - a.x) / length; const uy = (b.y - a.y) / length;
        // A directed edge stops at the rim of the node so its arrowhead stays visible, and its weight sits to one side so two opposite edges do not overlap.
        const endX = graph.directed ? b.x - ux * 7.6 : b.x; const endY = graph.directed ? b.y - uy * 7.6 : b.y;
        const lift = graph.directed ? 3 : 0;
        const lit = onRoute(edge.from, edge.to);
        return <g key={`${edge.from}-${edge.to}`}>
          <line className={edgeClass(edge.from, edge.to)} x1={a.x} y1={a.y} x2={endX} y2={endY} markerEnd={graph.directed ? `url(#${lit ? "algoviz-arrow-path" : "algoviz-arrow"})` : undefined} />
          <text className={`algoviz-edge-label${edge.weight < 0 ? " is-negative" : ""}`} x={(a.x + b.x) / 2 - uy * lift} y={(a.y + b.y) / 2 + ux * lift - (graph.directed ? 0 : 2)}>{edge.weight}</text>
        </g>;
      })}
      {graph.nodes.map((item) => <g key={item.id} {...(editable ? { role: "button", tabIndex: 0, "aria-label": `Node ${item.id}${item.id === graph.start ? ", start" : ""}${item.id === graph.goal ? ", goal" : ""}${pending === item.id ? ", selected" : ""}`, onKeyDown: (event: KeyboardEvent) => keyDown(event, item.id), onClick: () => choose(item.id), onPointerDown: (event: PointerEvent) => { if (editing?.tool === "move") { (event.target as Element).setPointerCapture?.(event.pointerId); setDragging(item.id); } } } : {})}>
        <circle className={`algoviz-node ${path.has(item.id) ? "is-path" : ""} ${visited.has(item.id) ? "is-visited" : ""} ${frontier.has(item.id) ? "is-frontier" : ""} ${step.currentNode === item.id ? "is-current" : ""} ${item.id === graph.start ? "is-start" : ""} ${item.id === graph.goal ? "is-goal" : ""} ${pending === item.id ? "is-pending" : ""}`} cx={item.x} cy={item.y} r="7" />
        <text className="algoviz-node-label" x={item.x} y={item.y + 1}>{item.id}</text>
      </g>)}
    </svg>
  </div>;
}
