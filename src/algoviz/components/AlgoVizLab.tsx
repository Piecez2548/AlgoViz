import { useEffect, useMemo, useState } from "react";
import { defaultGrid, gridToGraph, SAMPLE_GRAPH, sampleGraphBetween } from "../../algorithms/shared/graph";
import type { GraphInput, GridState } from "../../algorithms/shared/graphTypes";
import { SORT_SAMPLE } from "../../algorithms/sorting/sortingAlgorithms";
import { PSEUDOCODE, activeLine } from "../../algorithms/shared/pseudocode";
import type { AlgorithmExecution, AlgorithmStep } from "../../algorithms/shared/types";
import { getStepLabel } from "../../algorithms/shared/utils";
import { ArrayInput, GridBoard, GridToolbar, type GridTool } from "./InputEditors";
import { PlaybackControls } from "./PlaybackControls";
import { usePlayback } from "./usePlayback";

export interface GraphLabOption { id: string; name: string; run: (graph: GraphInput) => AlgorithmExecution }
export interface ArrayLabOption { id: string; name: string; run: (values: readonly number[]) => AlgorithmExecution }
export type LabOption = GraphLabOption | ArrayLabOption;

interface CommonProps {
  defaultAlgorithm: string;
  /** Lets the page keep the URL's ?algorithm= in step with the selection. */
  onAlgorithmChange?: (id: string) => void;
}
type AlgoVizLabProps = CommonProps & (
  | { category: "sorting"; options: readonly ArrayLabOption[]; initialValues?: readonly number[]; onValuesChange?: (values: readonly number[]) => void }
  | { category: "search" | "pathfinding"; options: readonly GraphLabOption[] }
);

const SAMPLE_NODE_IDS = SAMPLE_GRAPH.nodes.map((node) => node.id);

export function AlgoVizLab(props: AlgoVizLabProps) {
  const { category, options, defaultAlgorithm, onAlgorithmChange } = props;
  const [algorithmId, setAlgorithmId] = useState(defaultAlgorithm);
  const [values, setValues] = useState<readonly number[]>(props.category === "sorting" ? props.initialValues ?? SORT_SAMPLE : SORT_SAMPLE);
  const [mapKind, setMapKind] = useState<"sample" | "grid">("sample");
  const [endpoints, setEndpoints] = useState({ start: SAMPLE_GRAPH.start, goal: SAMPLE_GRAPH.goal });
  const [grid, setGrid] = useState<GridState>(defaultGrid);
  const [tool, setTool] = useState<GridTool>("wall");

  const graph = useMemo<GraphInput>(() => (mapKind === "grid" ? gridToGraph(grid) : sampleGraphBetween(endpoints.start, endpoints.goal)), [endpoints, grid, mapKind]);
  const option = options.find((candidate) => candidate.id === algorithmId) ?? options[0];
  const execution = useMemo(() => (category === "sorting" ? (option as ArrayLabOption).run(values) : (option as GraphLabOption).run(graph)), [category, graph, option, values]);
  const playback = usePlayback(execution.steps.length, execution);
  const step = execution.steps[playback.stepIndex];
  // Keep the found route on screen for the final "complete" step too.
  const foundPath = useMemo(() => {
    for (let index = playback.stepIndex; index >= 0; index--) if (execution.steps[index].type === "path") return execution.steps[index].visited ?? [];
    return [] as readonly string[];
  }, [execution, playback.stepIndex]);
  const noRoute = category !== "sorting" && !execution.steps.some((candidate) => candidate.type === "path");

  useEffect(() => {
    if (options.some((candidate) => candidate.id === defaultAlgorithm)) setAlgorithmId(defaultAlgorithm);
  }, [defaultAlgorithm, options]);

  const changeValues = (next: readonly number[]) => {
    setValues(next);
    if (props.category === "sorting") props.onValuesChange?.(next);
  };
  const setEndpoint = (key: "start" | "goal", id: string) => {
    const other = key === "start" ? "goal" : "start";
    // Never allow start and goal to be the same node: swap them instead.
    setEndpoints((current) => (current[other] === id ? { ...current, [key]: id, [other]: current[key] } : { ...current, [key]: id }));
  };

  return <section className="algoviz-lab" aria-label={`${category} algorithm visualizer`}>
    <div className="algoviz-lab-toolbar">
      <label className="algoviz-select-label">Algorithm
        <select value={algorithmId} onChange={(event) => { setAlgorithmId(event.target.value); onAlgorithmChange?.(event.target.value); }} aria-label="Choose algorithm">
          {options.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </label>
      {category !== "sorting" && <label className="algoviz-select-label">Map
        <select value={mapKind} onChange={(event) => setMapKind(event.target.value as "sample" | "grid")} aria-label="Choose map">
          <option value="sample">Sample graph</option><option value="grid">Draw your own map</option>
        </select>
      </label>}
      <span className="algoviz-input-label">Input <strong>{execution.inputLabel}</strong></span>
    </div>

    {category === "sorting" && <ArrayInput values={values} onApply={changeValues} />}
    {category !== "sorting" && mapKind === "sample" && <div className="algoviz-input-panel">
      <label className="algoviz-field">Start<select value={endpoints.start} onChange={(event) => setEndpoint("start", event.target.value)}>{SAMPLE_NODE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <label className="algoviz-field">Goal<select value={endpoints.goal} onChange={(event) => setEndpoint("goal", event.target.value)}>{SAMPLE_NODE_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
    </div>}
    {category !== "sorting" && mapKind === "grid" && <GridToolbar tool={tool} onTool={setTool} onClearWalls={() => setGrid((current) => ({ ...current, cells: current.cells.map((cell) => (cell === "wall" ? "empty" : cell)) }))} onReset={() => setGrid(defaultGrid())} />}
    {noRoute && <p className="algoviz-field-error" role="status">No route exists from {graph.start} to {graph.goal} on this map. Open a gap in the walls to connect them.</p>}

    <div className="algoviz-lab-grid">
      <div className="algoviz-stage">
        <div className="algoviz-stage-header" aria-live="polite" aria-atomic="true"><span><i className="algoviz-status-dot" /> Execution surface</span><span>{getStepLabel(step, execution.steps.length)}</span></div>
        {category === "sorting" ? <SortCanvas step={step} /> : mapKind === "grid" ? <GridBoard grid={grid} tool={tool} step={step} route={foundPath} onChange={setGrid} /> : <GraphCanvas graph={graph} step={step} route={foundPath} />}
        <PlaybackControls stepIndex={playback.stepIndex} last={playback.last} isPlaying={playback.isPlaying} speed={playback.speed} onToggle={playback.toggle} onAdvance={playback.advance} onSeek={playback.seek} onSpeed={playback.setSpeed} />
      </div>
      <LabInspector step={step} category={category} algorithmId={algorithmId} />
    </div>
  </section>;
}

function GraphCanvas({ graph, step, route }: { graph: GraphInput; step: AlgorithmStep; route: readonly string[] }) {
  const visited = new Set(step.visited ?? []); const frontier = new Set(step.frontier ?? []); const path = new Set(route);
  const find = (id: string) => graph.nodes.find((item) => item.id === id) ?? graph.nodes[0];
  return <div className="algoviz-graph-canvas"><svg viewBox="0 0 100 100" role="img" aria-label="Graph execution visualization">
    {graph.edges.map((edge) => <g key={`${edge.from}-${edge.to}`}><line className={path.has(edge.from) && path.has(edge.to) ? "algoviz-edge algoviz-edge-path" : "algoviz-edge"} x1={find(edge.from).x} y1={find(edge.from).y} x2={find(edge.to).x} y2={find(edge.to).y} /><text className="algoviz-edge-label" x={(find(edge.from).x + find(edge.to).x) / 2} y={(find(edge.from).y + find(edge.to).y) / 2 - 2}>{edge.weight}</text></g>)}
    {graph.nodes.map((item) => <g key={item.id}><circle className={`algoviz-node ${path.has(item.id) ? "is-path" : ""} ${visited.has(item.id) ? "is-visited" : ""} ${frontier.has(item.id) ? "is-frontier" : ""} ${step.currentNode === item.id ? "is-current" : ""} ${item.id === graph.start ? "is-start" : ""} ${item.id === graph.goal ? "is-goal" : ""}`} cx={item.x} cy={item.y} r="7" /><text className="algoviz-node-label" x={item.x} y={item.y + 1}>{item.id}</text></g>)}
  </svg></div>;
}

function SortCanvas({ step }: { step: AlgorithmStep }) {
  const values = step.values ?? []; const highlights = new Set(step.highlightIndices ?? []); const sorted = new Set(step.sortedIndices ?? []); const max = Math.max(...values, 1);
  return <div className="algoviz-sort-canvas" role="img" aria-label="Sorting array execution visualization">{values.map((value, index) => <div className={`algoviz-sort-bar ${highlights.has(index) ? "is-highlighted" : ""} ${sorted.has(index) ? "is-sorted" : ""}`} key={`${index}-${value}`}><span>{value}</span><i style={{ transform: `scaleY(${Math.max(0.06, value / max)})` }} /></div>)}</div>;
}

function Pseudocode({ algorithmId, step }: { algorithmId: string; step: AlgorithmStep }) {
  const code = PSEUDOCODE[algorithmId];
  if (!code) return null;
  const active = activeLine(algorithmId, step.type);
  return <div className="algoviz-inspector-block"><span>Pseudocode</span><ol className="algoviz-pseudocode">{code.lines.map((line, index) => <li key={index} className={index === active ? "is-active" : ""} aria-current={index === active ? "step" : undefined}><code>{line}</code></li>)}</ol></div>;
}

function LabInspector({ step, category, algorithmId }: { step: AlgorithmStep; category: string; algorithmId: string }) {
  const data = step.dataStructure ?? [];
  return <aside className="algoviz-inspector"><p className="algoviz-eyebrow">Current action</p><h2 aria-live="polite" aria-atomic="true">{step.type === "complete" ? "Complete" : step.type[0].toUpperCase() + step.type.slice(1)}</h2><p className="algoviz-explanation" aria-live="polite" aria-atomic="true">{step.explanation}</p><Pseudocode algorithmId={algorithmId} step={step} /><div className="algoviz-inspector-block"><span>{category === "sorting" ? "Array state" : "Data structure"}</span>{data.length ? data.map((entry) => <div className="algoviz-data-row" key={`${entry.label}-${entry.value}`}><span>{entry.label}</span><strong>{entry.value}</strong></div>) : <p className="algoviz-empty-data">No pending items</p>}</div><div className="algoviz-inspector-block algoviz-metrics"><span>Live metrics</span><div className="algoviz-metric-grid">{category === "sorting" ? <><Metric label="Comparisons" value={step.metrics?.comparisons ?? 0} /><Metric label={algorithmId === "merge" ? "Writes" : "Swaps"} value={step.metrics?.swaps ?? 0} /></> : <Metric label="Visited" value={step.metrics?.visitedNodes ?? step.visited?.length ?? 0} />}<Metric label="Operations" value={step.metrics?.operations ?? 0} /></div></div></aside>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div><strong>{value}</strong><span>{label}</span></div>; }
