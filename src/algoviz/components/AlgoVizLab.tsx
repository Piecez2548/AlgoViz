import { useEffect, useMemo, useState } from "react";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import { SEARCH_TARGET_SAMPLE } from "../../algorithms/searching/arraySearchAlgorithms";
import { SORT_SAMPLE } from "../../algorithms/sorting/sortingAlgorithms";
import { PSEUDOCODE, activeLine } from "../../algorithms/shared/pseudocode";
import type { AlgorithmExecution, AlgorithmStep } from "../../algorithms/shared/types";
import { getStepLabel } from "../../algorithms/shared/utils";
import { ArrayInput, GridBoard, TargetInput } from "./InputEditors";
import { GraphCanvas } from "./GraphCanvas";
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

  // Search and pathfinding take a start and goal; spanning trees use the whole graph, so they get the sample or your own graph only.
  const usesMap = category === "search" || category === "pathfinding";
  const usesGraph = usesMap || category === "spanning";
  const map = useMapInput(usesMap ? "route" : category === "spanning" ? "tree" : "off");
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
      {usesGraph && <MapSelect map={map} />}
      <span className="algoviz-input-label">Input <strong>{execution.inputLabel}</strong></span>
    </div>

    {isArray && <ArrayInput values={values} onApply={changeValues} />}
    {category === "array-search" && <TargetInput target={target} onApply={(next) => { setTarget(next); if (props.category === "array-search") props.onTargetChange?.(next); }} />}
    {usesGraph && <MapControls map={map} />}
    {noRoute && <p className="algoviz-field-error" role="status">No route exists from {graph.start} to {graph.goal} on this map. Open a gap in the walls to connect them.</p>}

    <div className="algoviz-lab-grid">
      <div className="algoviz-stage">
        <div className="algoviz-stage-header" aria-live="polite" aria-atomic="true"><span><i className="algoviz-status-dot" /> Execution surface</span><span>{getStepLabel(step, execution.steps.length)}</span></div>
        {isArray ? <SortCanvas step={step} /> : usesMap && mapKind === "grid" ? <GridBoard grid={grid} tool={tool} step={step} route={foundPath} onChange={map.setGrid} /> : <GraphCanvas graph={graph} step={step} route={foundPath} editing={usesGraph && mapKind === "custom" ? map.editing : undefined} />}
        <PlaybackControls stepIndex={playback.stepIndex} last={playback.last} isPlaying={playback.isPlaying} speed={playback.speed} onToggle={playback.toggle} onAdvance={playback.advance} onSeek={playback.seek} onSpeed={playback.setSpeed} />
      </div>
      <LabInspector step={step} category={category} algorithmId={algorithmId} />
    </div>
  </section>;
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
