import { useEffect, useMemo, useRef, useState } from "react";
import { defaultGrid, DAG_CYCLE_SAMPLE, DAG_SAMPLE, DIRECTED_CYCLE_SAMPLE, DIRECTED_SAMPLE, FLOW_BRIDGE_SAMPLE, FLOW_SAMPLE, gridToGraph, SAMPLE_GRAPH, sampleGraphBetween, SCC_SAMPLE, withHeuristics } from "../../algorithms/shared/graph";
import { addNode, allowsNegative, DEFAULT_WEIGHT, freeSpot, MAX_NODES, MAX_WEIGHT, MIN_NODES, MIN_WEIGHT, moveNode, removeEdge, removeNode, setEdge, setEndpoint as setGraphEndpoint, validWeight } from "../../algorithms/shared/graphEdit";
import type { GraphInput, GridState } from "../../algorithms/shared/graphTypes";
import type { GraphEditing, GraphTool } from "./GraphCanvas";
import { GridToolbar, type GridTool } from "./InputEditors";

export type MapKind = "sample" | "cycle" | "grid" | "custom";
/** "route" needs a start and goal (search, pathfinding); "tree" is a spanning tree on the whole graph; "directed" is a route on a directed graph that may have negative weights. */
export type MapMode = "off" | "route" | "tree" | "directed" | "dag" | "scc" | "flow";

const SAMPLE_NODE_IDS = SAMPLE_GRAPH.nodes.map((node) => node.id);
const GRAPH_TOOLS: { id: GraphTool; label: string }[] = [{ id: "move", label: "Move nodes" }, { id: "node", label: "Add nodes" }, { id: "connect", label: "Connect nodes" }];

/** The graph your own graph starts from: the sample that fits the kind of graph the lab works on. */
function defaultCustom(mode: MapMode): GraphInput {
  const base = mode === "flow" ? FLOW_SAMPLE : mode === "directed" ? DIRECTED_SAMPLE : mode === "dag" ? DAG_SAMPLE : mode === "scc" ? SCC_SAMPLE : SAMPLE_GRAPH;
  return { ...base, label: "Your graph" };
}

/** Whether a graph from a link suits the kind of graph a lab or comparison works on. */
export function graphFits(mode: MapMode, graph: GraphInput | null | undefined): graph is GraphInput {
  if (!graph) return false;
  if (mode === "route" || mode === "tree") return !graph.directed;
  if (mode === "directed") return Boolean(graph.directed) && !graph.unweighted && !graph.flow;
  if (mode === "dag" || mode === "scc") return Boolean(graph.directed && graph.unweighted);
  if (mode === "flow") return Boolean(graph.directed && graph.flow);
  return false;
}

/** The input a lab or comparison runs on: the sample graph, a drawn map, or a graph you build node by node. */
export function useMapInput(mode: MapMode = "route", initialCustom: GraphInput | null = null) {
  const [mapKind, setMapKind] = useState<MapKind>(initialCustom && mode !== "off" ? "custom" : "sample");
  const [endpoints, setEndpoints] = useState({ start: SAMPLE_GRAPH.start, goal: SAMPLE_GRAPH.goal });
  const [grid, setGrid] = useState<GridState>(defaultGrid);
  const [tool, setTool] = useState<GridTool>("wall");
  const [custom, setCustom] = useState<GraphInput>(initialCustom ?? defaultCustom(mode));
  // A comparison switches between kinds of graph; start again from a sample that fits the new kind.
  const lastMode = useRef(mode);
  useEffect(() => {
    if (lastMode.current === mode) return;
    lastMode.current = mode;
    setMapKind("sample"); setCustom(defaultCustom(mode));
  }, [mode]);
  const [graphTool, setGraphTool] = useState<GraphTool>("move");
  const [edgeWeight, setEdgeWeight] = useState(DEFAULT_WEIGHT);
  const graph = useMemo<GraphInput>(() => {
    if (mode === "off") return SAMPLE_GRAPH;
    if (mode === "flow") return mapKind === "custom" ? custom : mapKind === "cycle" ? FLOW_BRIDGE_SAMPLE : FLOW_SAMPLE;
    if (mode === "scc") return mapKind === "custom" ? custom : mapKind === "cycle" ? DAG_SAMPLE : SCC_SAMPLE;
    if (mode === "dag") return mapKind === "custom" ? custom : mapKind === "cycle" ? DAG_CYCLE_SAMPLE : DAG_SAMPLE;
    if (mode === "directed") return mapKind === "custom" ? custom : mapKind === "cycle" ? DIRECTED_CYCLE_SAMPLE : DIRECTED_SAMPLE;
    if (mapKind === "custom") return withHeuristics(custom);
    if (mapKind === "grid" && mode === "route") return gridToGraph(grid);
    return mode === "tree" ? SAMPLE_GRAPH : sampleGraphBetween(endpoints.start, endpoints.goal);
  }, [custom, endpoints, grid, mapKind, mode]);
  const setEndpoint = (key: "start" | "goal", id: string) => {
    const other = key === "start" ? "goal" : "start";
    // Never allow start and goal to be the same node: swap them instead.
    setEndpoints((current) => (current[other] === id ? { ...current, [key]: id, [other]: current[key] } : { ...current, [key]: id }));
  };
  const editing: GraphEditing = {
    tool: graphTool,
    onMove: (id, x, y) => setCustom((current) => moveNode(current, id, x, y)),
    onAddAt: (x, y) => setCustom((current) => addNode(current, x, y)),
    onConnect: (a, b) => setCustom((current) => setEdge(current, a, b, current.unweighted ? 1 : edgeWeight)),
  };
  return { mode, mapKind, setMapKind, endpoints, setEndpoint, grid, setGrid, tool, setTool, graph, custom, setCustom, graphTool, setGraphTool, edgeWeight, setEdgeWeight, editing };
}
export type MapInputState = ReturnType<typeof useMapInput>;

export function MapSelect({ map }: { map: MapInputState }) {
  return <label className="algoviz-select-label">{map.mode === "route" ? "Map" : "Graph"}
    <select value={map.mapKind} onChange={(event) => map.setMapKind(event.target.value as MapKind)} aria-label="Choose map">
      <option value="sample">{map.mode === "directed" ? "Sample with a negative edge" : map.mode === "dag" ? "Sample task graph" : map.mode === "scc" ? "Sample with loops" : map.mode === "flow" ? "Sample flow network" : "Sample graph"}</option>
      {map.mode === "directed" && <option value="cycle">Sample with a negative cycle</option>}
      {map.mode === "dag" && <option value="cycle">Sample with a loop</option>}
      {map.mode === "scc" && <option value="cycle">Sample with no loops</option>}
      {map.mode === "flow" && <option value="cycle">Sample with a narrow bridge</option>}
      {map.mode === "route" && <option value="grid">Draw your own map</option>}
      <option value="custom">Build your own graph</option>
    </select>
  </label>;
}

/** Start/goal pickers for the sample graph, drawing tools for a map, or node and edge editing for your own graph. */
export function MapControls({ map }: { map: MapInputState }) {
  if (map.mode === "off") return null;
  if (map.mapKind === "grid" && map.mode === "route") {
    return <GridToolbar tool={map.tool} onTool={map.setTool} onClearWalls={() => map.setGrid((current) => ({ ...current, cells: current.cells.map((cell) => (cell === "wall" ? "empty" : cell)) }))} onReset={() => map.setGrid(defaultGrid())} />;
  }
  if (map.mapKind === "custom") return <CustomGraphControls map={map} />;
  if (map.mode === "tree" || map.mode === "directed" || map.mode === "dag" || map.mode === "scc" || map.mode === "flow") return null;
  return <div className="algoviz-input-panel">
    <label className="algoviz-field">Start<select value={map.endpoints.start} onChange={(event) => map.setEndpoint("start", event.target.value)}>{SAMPLE_NODE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
    <label className="algoviz-field">Goal<select value={map.endpoints.goal} onChange={(event) => map.setEndpoint("goal", event.target.value)}>{SAMPLE_NODE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
  </div>;
}

function CustomGraphControls({ map }: { map: MapInputState }) {
  const { custom, setCustom } = map;
  const ids = custom.nodes.map((node) => node.id);
  const [from, setFrom] = useState(custom.start); const [to, setTo] = useState(custom.goal);
  // Keep the pickers on nodes that still exist after a removal.
  const pickFrom = ids.includes(from) ? from : ids[0]; const pickTo = ids.includes(to) && to !== pickFrom ? to : ids.find((id) => id !== pickFrom)!;
  const directed = Boolean(custom.directed);
  const unweighted = Boolean(custom.unweighted);
  const flow = Boolean(custom.flow);
  const negativeOk = allowsNegative(custom);
  const noun = flow ? "Capacity" : "Weight";
  const minWeight = negativeOk ? -MAX_WEIGHT : MIN_WEIGHT;
  const weightOk = unweighted || validWeight(map.edgeWeight, negativeOk);
  const dash = directed ? "→" : "–";
  const sample = (): GraphInput => ({ ...(map.mode === "flow" ? FLOW_SAMPLE : map.mode === "scc" ? SCC_SAMPLE : unweighted ? DAG_SAMPLE : directed ? DIRECTED_SAMPLE : SAMPLE_GRAPH), label: "Your graph" });
  return <div className="algoviz-custom-graph">
    <div className="algoviz-input-panel">
      <fieldset className="algoviz-tools"><legend>With the pointer</legend>
        {GRAPH_TOOLS.map((item) => <label key={item.id} className={map.graphTool === item.id ? "is-active" : ""}><input type="radio" name="graph-tool" checked={map.graphTool === item.id} onChange={() => map.setGraphTool(item.id)} />{item.label}</label>)}
      </fieldset>
      {!unweighted && <label className="algoviz-field">{noun} for new edges
        <input type="number" min={minWeight} max={MAX_WEIGHT} value={Number.isNaN(map.edgeWeight) ? "" : map.edgeWeight} onChange={(event) => map.setEdgeWeight(event.target.value === "" ? NaN : Number(event.target.value))} aria-invalid={!weightOk} />
      </label>}
      {!unweighted && <label className="algoviz-field">{flow ? "Source" : "Start"}<select value={custom.start} onChange={(event) => setCustom((current) => setGraphEndpoint(current, "start", event.target.value))}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>}
      {!unweighted && <label className="algoviz-field">{flow ? "Sink" : "Goal"}<select value={custom.goal} onChange={(event) => setCustom((current) => setGraphEndpoint(current, "goal", event.target.value))}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>}
      <p className="algoviz-field-help">Drag a node to move it, or focus it and use the arrow keys. With “Add nodes”, click empty space. With “Connect nodes”, pick two nodes in turn (Enter or Space with the keyboard). {unweighted ? " Each edge means the first task must be done before the second." : ` ${noun}s are whole numbers from ${minWeight} to ${MAX_WEIGHT}.`}{flow ? " Each edge is a one-way pipe that carries at most its capacity." : directed && !unweighted ? " Each edge can only be followed from its first node to its second; negative weights are allowed." : ""}</p>
      {!weightOk && <p className="algoviz-field-error" role="alert">The {noun.toLowerCase()} must be a whole number from {minWeight} to {MAX_WEIGHT}.</p>}
    </div>
    <div className="algoviz-input-panel">
      <button type="button" className="algoviz-button" disabled={custom.nodes.length >= MAX_NODES} onClick={() => { const spot = freeSpot(custom); setCustom((current) => addNode(current, spot.x, spot.y)); }}>Add node</button>
      <label className="algoviz-field">Edge from<select value={pickFrom} onChange={(event) => setFrom(event.target.value)}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <label className="algoviz-field">Edge to<select value={pickTo} onChange={(event) => setTo(event.target.value)}>{ids.filter((id) => id !== pickFrom).map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <button type="button" className="algoviz-button" disabled={!weightOk} onClick={() => setCustom((current) => setEdge(current, pickFrom, pickTo, unweighted ? 1 : map.edgeWeight))}>{unweighted ? "Add dependency" : "Set edge"}</button>
      <button type="button" className="algoviz-button algoviz-button-quiet" onClick={() => setCustom(sample())}>Reset to sample graph</button>
      <p className="algoviz-field-help">{custom.nodes.length} of {MAX_NODES} nodes · {custom.edges.length} edges. Setting an edge that exists changes its weight.</p>
    </div>
    <details className="algoviz-chart-data">
      <summary>Nodes and edges ({custom.nodes.length} nodes, {custom.edges.length} edges)</summary>
      <ul className="algoviz-chip-list" aria-label="Nodes">
        {ids.map((id) => <li key={id}><span>{id}</span><button type="button" className="algoviz-button algoviz-button-quiet" aria-label={`Remove node ${id}`} disabled={custom.nodes.length <= MIN_NODES} onClick={() => setCustom((current) => removeNode(current, id))}>Remove</button></li>)}
      </ul>
      <ul className="algoviz-chip-list" aria-label="Edges">
        {custom.edges.map((edge) => <li key={`${edge.from}-${edge.to}`}><span>{edge.from}{dash}{edge.to}</span>
          {!unweighted && <input type="number" min={minWeight} max={MAX_WEIGHT} value={edge.weight} aria-label={`${noun} of ${edge.from}${dash}${edge.to}`} onChange={(event) => setCustom((current) => setEdge(current, edge.from, edge.to, Number(event.target.value)))} />}
          <button type="button" className="algoviz-button algoviz-button-quiet" aria-label={`Remove edge ${edge.from}${dash}${edge.to}`} onClick={() => setCustom((current) => removeEdge(current, edge.from, edge.to))}>Remove</button></li>)}
        {!custom.edges.length && <li>No edges yet. Connect two nodes to add one.</li>}
      </ul>
    </details>
  </div>;
}
