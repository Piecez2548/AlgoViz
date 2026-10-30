import { useEffect, useMemo, useState } from "react";
import { edgeKey } from "../../algorithms/shared/graph";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import { SEARCH_TARGET_SAMPLE } from "../../algorithms/searching/arraySearchAlgorithms";
import { SORT_SAMPLE } from "../../algorithms/sorting/sortingAlgorithms";
import { PSEUDOCODE, activeLine } from "../../algorithms/shared/pseudocode";
import type { AlgorithmExecution, AlgorithmStep } from "../../algorithms/shared/types";
import { getStepLabel } from "../../algorithms/shared/utils";
import { MAX_VALUE } from "../../algorithms/shared/arrayInput";
import { ArrayInput, GridBoard } from "./InputEditors";
import { MapControls, MapSelect, useMapInput } from "./MapInput";
import { PlaybackControls } from "./PlaybackControls";
import { usePlayback } from "./usePlayback";

export interface GraphLabOption { id: string; name: string; run: (graph: GraphInput) => AlgorithmExecution }
export interface ArrayLabOption { id: string; name: string; run: (values: readonly number[]) => AlgorithmExecution }
export interface TargetLabOption { id: string; name: string; run: (values: readonly number[], target: number) => AlgorithmExecution }
export type LabOption = GraphLabOption | ArrayLabOption | TargetLabOption;

interface CommonProps {
  defaultAlgorithm: string;
  /** Lets the page keep the URL's ?algorithm= in step with the selection. */
  onAlgorithmChange?: (id: string) => void;
}
type AlgoVizLabProps = CommonProps & (
  | { category: "sorting"; options: readonly ArrayLabOption[]; initialValues?: readonly number[]; onValuesChange?: (values: readonly number[]) => void }
  | { category: "array-search"; options: readonly TargetLabOption[]; initialValues?: readonly number[]; initialTarget?: number; onValuesChange?: (values: readonly number[]) => void; onTargetChange?: (target: number) => void }
  | { category: "search" | "pathfinding" | "spanning"; options: readonly GraphLabOption[] }
);

export function AlgoVizLab(props: AlgoVizLabProps) {
  const { category, options, defaultAlgorithm, onAlgorithmChange } = props;
  const [algorithmId, setAlgorithmId] = useState(defaultAlgorithm);
  const isArray = category === "sorting" || category === "array-search";
  const [values, setValues] = useState<readonly number[]>(props.category === "sorting" || props.category === "array-search" ? props.initialValues ?? SORT_SAMPLE : SORT_SAMPLE);
  const [target, setTarget] = useState<number>(props.category === "array-search" ? props.initialTarget ?? SEARCH_TARGET_SAMPLE : SEARCH_TARGET_SAMPLE);

  // Spanning trees always use the sample graph; the drawn map and start/goal picks do not apply to them.
  const usesMap = category === "search" || category === "pathfinding";
  const map = useMapInput(usesMap);
  const { graph, mapKind, grid, tool } = map;
  const option = options.find((candidate) => candidate.id === algorithmId) ?? options[0];
  const execution = useMemo(() => (category === "array-search" ? (option as TargetLabOption).run(values, target) : category === "sorting" ? (option as ArrayLabOption).run(values) : (option as GraphLabOption).run(graph)), [category, graph, option, target, values]);
  const playback = usePlayback(execution.steps.length, execution);
  const step = execution.steps[playback.stepIndex];
  // Keep the found route on screen for the final "complete" step too. The route comes from the
  // step's recorded "Path" entry, because Dijkstra and A* report every settled node as "visited".
  const foundPath = useMemo(() => {
    for (let index = playback.stepIndex; index >= 0; index--) {
      const candidate = execution.steps[index];
      if (candidate.type === "path") return String(candidate.dataStructure?.find((entry) => entry.label === "Path")?.value ?? "").split(" → ").filter(Boolean);
    }
    return [] as readonly string[];
  }, [execution, playback.stepIndex]);
  const noRoute = usesMap && !execution.steps.some((candidate) => candidate.type === "path");

  useEffect(() => {
    if (options.some((candidate) => candidate.id === defaultAlgorithm)) setAlgorithmId(defaultAlgorithm);
  }, [defaultAlgorithm, options]);

  const changeValues = (next: readonly number[]) => {
    setValues(next);
    if (props.category === "sorting" || props.category === "array-search") props.onValuesChange?.(next);
  };

  return <section className="algoviz-lab" aria-label={`${category} algorithm visualizer`}>
    <div className="algoviz-lab-toolbar">
      <label className="algoviz-select-label">Algorithm
        <select value={algorithmId} onChange={(event) => { setAlgorithmId(event.target.value); onAlgorithmChange?.(event.target.value); }} aria-label="Choose algorithm">
          {options.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </label>
      {usesMap && <MapSelect map={map} />}
      <span className="algoviz-input-label">Input <strong>{execution.inputLabel}</strong></span>
    </div>

    {isArray && <ArrayInput values={values} onApply={changeValues} />}
    {category === "array-search" && <TargetInput target={target} onApply={(next) => { setTarget(next); if (props.category === "array-search") props.onTargetChange?.(next); }} />}
    {usesMap && <MapControls map={map} />}
    {noRoute && <p className="algoviz-field-error" role="status">No route exists from {graph.start} to {graph.goal} on this map. Open a gap in the walls to connect them.</p>}

    <div className="algoviz-lab-grid">
      <div className="algoviz-stage">
        <div className="algoviz-stage-header" aria-live="polite" aria-atomic="true"><span><i className="algoviz-status-dot" /> Execution surface</span><span>{getStepLabel(step, execution.steps.length)}</span></div>
        {isArray ? <SortCanvas step={step} /> : usesMap && mapKind === "grid" ? <GridBoard grid={grid} tool={tool} step={step} route={foundPath} onChange={map.setGrid} /> : <GraphCanvas graph={graph} step={step} route={foundPath} />}
        <PlaybackControls stepIndex={playback.stepIndex} last={playback.last} isPlaying={playback.isPlaying} speed={playback.speed} onToggle={playback.toggle} onAdvance={playback.advance} onSeek={playback.seek} onSpeed={playback.setSpeed} />
      </div>
      <LabInspector step={step} category={category} algorithmId={algorithmId} />
    </div>
  </section>;
}

function GraphCanvas({ graph, step, route }: { graph: GraphInput; step: AlgorithmStep; route: readonly string[] }) {
  const visited = new Set(step.visited ?? []); const frontier = new Set(step.frontier ?? []); const path = new Set(route);
  const find = (id: string) => graph.nodes.find((item) => item.id === id) ?? graph.nodes[0];
  const accepted = new Set(step.acceptedEdges ?? []); const rejected = new Set(step.rejectedEdges ?? []);
  const edgeClass = (from: string, to: string) => {
    const key = edgeKey(from, to);
    if (path.has(from) && path.has(to)) return "algoviz-edge algoviz-edge-path";
    return `algoviz-edge${accepted.has(key) ? " algoviz-edge-accepted" : ""}${rejected.has(key) ? " algoviz-edge-rejected" : ""}${step.activeEdge === key ? " algoviz-edge-active" : ""}`;
  };
  return <div className="algoviz-graph-canvas"><svg viewBox="0 0 100 100" role="img" aria-label="Graph execution visualization">
    {graph.edges.map((edge) => <g key={`${edge.from}-${edge.to}`}><line className={edgeClass(edge.from, edge.to)} x1={find(edge.from).x} y1={find(edge.from).y} x2={find(edge.to).x} y2={find(edge.to).y} /><text className="algoviz-edge-label" x={(find(edge.from).x + find(edge.to).x) / 2} y={(find(edge.from).y + find(edge.to).y) / 2 - 2}>{edge.weight}</text></g>)}
    {graph.nodes.map((item) => <g key={item.id}><circle className={`algoviz-node ${path.has(item.id) ? "is-path" : ""} ${visited.has(item.id) ? "is-visited" : ""} ${frontier.has(item.id) ? "is-frontier" : ""} ${step.currentNode === item.id ? "is-current" : ""} ${item.id === graph.start ? "is-start" : ""} ${item.id === graph.goal ? "is-goal" : ""}`} cx={item.x} cy={item.y} r="7" /><text className="algoviz-node-label" x={item.x} y={item.y + 1}>{item.id}</text></g>)}
  </svg></div>;
}

function SortCanvas({ step }: { step: AlgorithmStep }) {
  const values = step.values ?? []; const highlights = new Set(step.highlightIndices ?? []); const sorted = new Set(step.sortedIndices ?? []); const max = Math.max(...values, 1); const range = step.activeRange;
  return <div className="algoviz-sort-canvas" role="img" aria-label="Sorting array execution visualization">{values.map((value, index) => <div className={`algoviz-sort-bar ${highlights.has(index) ? "is-highlighted" : ""} ${sorted.has(index) ? "is-sorted" : ""} ${range && (index < range[0] || index > range[1]) ? "is-eliminated" : ""}`} key={`${index}-${value}`}><span>{value}</span><i style={{ transform: `scaleY(${Math.max(0.06, value / max)})` }} /></div>)}</div>;
}

function Pseudocode({ algorithmId, step }: { algorithmId: string; step: AlgorithmStep }) {
  const code = PSEUDOCODE[algorithmId];
  if (!code) return null;
  const active = activeLine(algorithmId, step);
  return <div className="algoviz-inspector-block"><span>Pseudocode</span><ol className="algoviz-pseudocode">{code.lines.map((line, index) => <li key={index} className={index === active ? "is-active" : ""} aria-current={index === active ? "step" : undefined}><code>{line}</code></li>)}</ol></div>;
}

function LabInspector({ step, category, algorithmId }: { step: AlgorithmStep; category: string; algorithmId: string }) {
  const data = step.dataStructure ?? [];
  return <aside className="algoviz-inspector"><p className="algoviz-eyebrow">Current action</p><h2 aria-live="polite" aria-atomic="true">{stepTitle(step.type)}</h2><p className="algoviz-explanation" aria-live="polite" aria-atomic="true">{step.explanation}</p><Pseudocode algorithmId={algorithmId} step={step} /><div className="algoviz-inspector-block"><span>{category === "sorting" || category === "array-search" ? "Array state" : "Data structure"}</span>{data.length ? data.map((entry) => <div className="algoviz-data-row" key={`${entry.label}-${entry.value}`}><span>{entry.label}</span><strong>{entry.value}</strong></div>) : <p className="algoviz-empty-data">No pending items</p>}</div><div className="algoviz-inspector-block algoviz-metrics"><span>Live metrics</span><div className="algoviz-metric-grid">{category === "array-search" ? <Metric label="Comparisons" value={step.metrics?.comparisons ?? 0} /> : category === "sorting" ? <><Metric label="Comparisons" value={step.metrics?.comparisons ?? 0} /><Metric label={algorithmId === "merge" ? "Writes" : "Swaps"} value={step.metrics?.swaps ?? 0} /></> : category === "spanning" ? <Metric label="Edges kept" value={step.acceptedEdges?.length ?? 0} /> : <Metric label="Visited" value={step.metrics?.visitedNodes ?? step.visited?.length ?? 0} />}<Metric label="Operations" value={step.metrics?.operations ?? 0} /></div></div></aside>;
}

const STEP_TITLES: Partial<Record<AlgorithmStep["type"], string>> = { accept: "Keep edge", reject: "Skip edge", complete: "Complete" };
function stepTitle(type: AlgorithmStep["type"]) { return STEP_TITLES[type] ?? type[0].toUpperCase() + type.slice(1); }

function Metric({ label, value }: { label: string; value: number }) { return <div><strong>{value}</strong><span>{label}</span></div>; }

function TargetInput({ target, onApply }: { target: number; onApply: (target: number) => void }) {
  const [text, setText] = useState(String(target));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setText(String(target)); setError(null); }, [target]);
  const apply = () => {
    const value = Number(text);
    if (!text.trim() || !Number.isInteger(value) || value < 1 || value > MAX_VALUE) { setError(`The value to find must be a whole number from 1 to ${MAX_VALUE}.`); return; }
    setError(null); onApply(value);
  };
  return <form className="algoviz-input-panel" onSubmit={(event) => { event.preventDefault(); apply(); }}>
    <label className="algoviz-field">Value to find
      <input type="text" inputMode="numeric" value={text} onChange={(event) => setText(event.target.value)} aria-invalid={Boolean(error)} />
    </label>
    <button type="submit" className="algoviz-button">Search for it</button>
    <p className="algoviz-field-help">Both searches look through your numbers in ascending order, so they search the same list. Pick a value that is not in the list to see the worst case.</p>
    {error && <p className="algoviz-field-error" role="alert">{error}</p>}
  </form>;
}
