import { useMemo, useState } from "react";
import { defaultGrid, gridToGraph, SAMPLE_GRAPH, sampleGraphBetween, withHeuristics } from "../../algorithms/shared/graph";
import { addNode, DEFAULT_WEIGHT, freeSpot, MAX_NODES, MAX_WEIGHT, MIN_NODES, MIN_WEIGHT, moveNode, removeEdge, removeNode, setEdge, setEndpoint as setGraphEndpoint, validWeight } from "../../algorithms/shared/graphEdit";
import type { GraphInput, GridState } from "../../algorithms/shared/graphTypes";
import type { GraphEditing, GraphTool } from "./GraphCanvas";
import { GridToolbar, type GridTool } from "./InputEditors";

export type MapKind = "sample" | "grid" | "custom";
/** "route" needs a start and goal (search, pathfinding); "tree" is a spanning tree on the whole graph. */
export type MapMode = "off" | "route" | "tree";

const SAMPLE_NODE_IDS = SAMPLE_GRAPH.nodes.map((node) => node.id);
const GRAPH_TOOLS: { id: GraphTool; label: string }[] = [{ id: "move", label: "Move nodes" }, { id: "node", label: "Add nodes" }, { id: "connect", label: "Connect nodes" }];

/** The input a lab or comparison runs on: the sample graph, a drawn map, or a graph you build node by node. */
export function useMapInput(mode: MapMode = "route", initialCustom: GraphInput | null = null) {
  const [mapKind, setMapKind] = useState<MapKind>(initialCustom && mode !== "off" ? "custom" : "sample");
  const [endpoints, setEndpoints] = useState({ start: SAMPLE_GRAPH.start, goal: SAMPLE_GRAPH.goal });
  const [grid, setGrid] = useState<GridState>(defaultGrid);
  const [tool, setTool] = useState<GridTool>("wall");
  const [custom, setCustom] = useState<GraphInput>(initialCustom ?? { ...SAMPLE_GRAPH, label: "Your graph" });
  const [graphTool, setGraphTool] = useState<GraphTool>("move");
  const [edgeWeight, setEdgeWeight] = useState(DEFAULT_WEIGHT);
  const graph = useMemo<GraphInput>(() => {
    if (mode === "off") return SAMPLE_GRAPH;
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
    onConnect: (a, b) => setCustom((current) => setEdge(current, a, b, edgeWeight)),
  };
  return { mode, mapKind, setMapKind, endpoints, setEndpoint, grid, setGrid, tool, setTool, graph, custom, setCustom, graphTool, setGraphTool, edgeWeight, setEdgeWeight, editing };
}
export type MapInputState = ReturnType<typeof useMapInput>;

export function MapSelect({ map }: { map: MapInputState }) {
  return <label className="algoviz-select-label">{map.mode === "tree" ? "Graph" : "Map"}
    <select value={map.mapKind} onChange={(event) => map.setMapKind(event.target.value as MapKind)} aria-label="Choose map">
      <option value="sample">Sample graph</option>
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
  if (map.mode === "tree") return null;
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
  const weightOk = validWeight(map.edgeWeight);
  return <div className="algoviz-custom-graph">
    <div className="algoviz-input-panel">
      <fieldset className="algoviz-tools"><legend>With the pointer</legend>
        {GRAPH_TOOLS.map((item) => <label key={item.id} className={map.graphTool === item.id ? "is-active" : ""}><input type="radio" name="graph-tool" checked={map.graphTool === item.id} onChange={() => map.setGraphTool(item.id)} />{item.label}</label>)}
      </fieldset>
      <label className="algoviz-field">Weight for new edges
        <input type="number" min={MIN_WEIGHT} max={MAX_WEIGHT} value={Number.isNaN(map.edgeWeight) ? "" : map.edgeWeight} onChange={(event) => map.setEdgeWeight(event.target.value === "" ? NaN : Number(event.target.value))} aria-invalid={!weightOk} />
      </label>
      <label className="algoviz-field">Start<select value={custom.start} onChange={(event) => setCustom((current) => setGraphEndpoint(current, "start", event.target.value))}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <label className="algoviz-field">Goal<select value={custom.goal} onChange={(event) => setCustom((current) => setGraphEndpoint(current, "goal", event.target.value))}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <p className="algoviz-field-help">Drag a node to move it, or focus it and use the arrow keys. With “Add nodes”, click empty space. With “Connect nodes”, pick two nodes in turn (Enter or Space with the keyboard). Weights are whole numbers from {MIN_WEIGHT} to {MAX_WEIGHT}.</p>
      {!weightOk && <p className="algoviz-field-error" role="alert">The weight must be a whole number from {MIN_WEIGHT} to {MAX_WEIGHT}.</p>}
    </div>
    <div className="algoviz-input-panel">
      <button type="button" className="algoviz-button" disabled={custom.nodes.length >= MAX_NODES} onClick={() => { const spot = freeSpot(custom); setCustom((current) => addNode(current, spot.x, spot.y)); }}>Add node</button>
      <label className="algoviz-field">Edge from<select value={pickFrom} onChange={(event) => setFrom(event.target.value)}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <label className="algoviz-field">Edge to<select value={pickTo} onChange={(event) => setTo(event.target.value)}>{ids.filter((id) => id !== pickFrom).map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <button type="button" className="algoviz-button" disabled={!weightOk} onClick={() => setCustom((current) => setEdge(current, pickFrom, pickTo, map.edgeWeight))}>Set edge</button>
      <button type="button" className="algoviz-button algoviz-button-quiet" onClick={() => setCustom({ ...SAMPLE_GRAPH, label: "Your graph" })}>Reset to sample graph</button>
      <p className="algoviz-field-help">{custom.nodes.length} of {MAX_NODES} nodes · {custom.edges.length} edges. Setting an edge that exists changes its weight.</p>
    </div>
    <details className="algoviz-chart-data">
      <summary>Nodes and edges ({custom.nodes.length} nodes, {custom.edges.length} edges)</summary>
      <ul className="algoviz-chip-list" aria-label="Nodes">
        {ids.map((id) => <li key={id}><span>{id}</span><button type="button" className="algoviz-button algoviz-button-quiet" aria-label={`Remove node ${id}`} disabled={custom.nodes.length <= MIN_NODES} onClick={() => setCustom((current) => removeNode(current, id))}>Remove</button></li>)}
      </ul>
      <ul className="algoviz-chip-list" aria-label="Edges">
        {custom.edges.map((edge) => <li key={`${edge.from}-${edge.to}`}><span>{edge.from}–{edge.to}</span>
          <input type="number" min={MIN_WEIGHT} max={MAX_WEIGHT} value={edge.weight} aria-label={`Weight of ${edge.from}–${edge.to}`} onChange={(event) => setCustom((current) => setEdge(current, edge.from, edge.to, Number(event.target.value)))} />
          <button type="button" className="algoviz-button algoviz-button-quiet" aria-label={`Remove edge ${edge.from}–${edge.to}`} onClick={() => setCustom((current) => removeEdge(current, edge.from, edge.to))}>Remove</button></li>)}
        {!custom.edges.length && <li>No edges yet. Connect two nodes to add one.</li>}
      </ul>
    </details>
  </div>;
}
