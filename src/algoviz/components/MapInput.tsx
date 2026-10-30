import { useMemo, useState } from "react";
import { defaultGrid, gridToGraph, SAMPLE_GRAPH, sampleGraphBetween } from "../../algorithms/shared/graph";
import type { GraphInput, GridState } from "../../algorithms/shared/graphTypes";
import { GridToolbar, type GridTool } from "./InputEditors";

export type MapKind = "sample" | "grid";

const SAMPLE_NODE_IDS = SAMPLE_GRAPH.nodes.map((node) => node.id);

/** The map a lab or comparison runs on: the sample graph with a chosen start and goal, or a drawn map. */
export function useMapInput(enabled = true) {
  const [mapKind, setMapKind] = useState<MapKind>("sample");
  const [endpoints, setEndpoints] = useState({ start: SAMPLE_GRAPH.start, goal: SAMPLE_GRAPH.goal });
  const [grid, setGrid] = useState<GridState>(defaultGrid);
  const [tool, setTool] = useState<GridTool>("wall");
  const graph = useMemo<GraphInput>(() => (!enabled ? SAMPLE_GRAPH : mapKind === "grid" ? gridToGraph(grid) : sampleGraphBetween(endpoints.start, endpoints.goal)), [enabled, endpoints, grid, mapKind]);
  const setEndpoint = (key: "start" | "goal", id: string) => {
    const other = key === "start" ? "goal" : "start";
    // Never allow start and goal to be the same node: swap them instead.
    setEndpoints((current) => (current[other] === id ? { ...current, [key]: id, [other]: current[key] } : { ...current, [key]: id }));
  };
  return { mapKind, setMapKind, endpoints, setEndpoint, grid, setGrid, tool, setTool, graph };
}
export type MapInputState = ReturnType<typeof useMapInput>;

export function MapSelect({ map }: { map: MapInputState }) {
  return <label className="algoviz-select-label">Map
    <select value={map.mapKind} onChange={(event) => map.setMapKind(event.target.value as MapKind)} aria-label="Choose map">
      <option value="sample">Sample graph</option><option value="grid">Draw your own map</option>
    </select>
  </label>;
}

/** Start/goal pickers for the sample graph, or the drawing tools for a drawn map. */
export function MapControls({ map }: { map: MapInputState }) {
  if (map.mapKind === "grid") {
    return <GridToolbar tool={map.tool} onTool={map.setTool} onClearWalls={() => map.setGrid((current) => ({ ...current, cells: current.cells.map((cell) => (cell === "wall" ? "empty" : cell)) }))} onReset={() => map.setGrid(defaultGrid())} />;
  }
  return <div className="algoviz-input-panel">
    <label className="algoviz-field">Start<select value={map.endpoints.start} onChange={(event) => map.setEndpoint("start", event.target.value)}>{SAMPLE_NODE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
    <label className="algoviz-field">Goal<select value={map.endpoints.goal} onChange={(event) => map.setEndpoint("goal", event.target.value)}>{SAMPLE_NODE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
  </div>;
}
