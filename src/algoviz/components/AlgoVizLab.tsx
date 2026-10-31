import { useEffect, useMemo, useState } from "react";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import { pathCost } from "../../algorithms/shared/graph";
import { runBellmanFord } from "../../algorithms/pathfinding/pathfindingAlgorithms";
import { SEARCH_TARGET_SAMPLE } from "../../algorithms/searching/arraySearchAlgorithms";
import { SORT_SAMPLE } from "../../algorithms/sorting/sortingAlgorithms";
import { PSEUDOCODE, activeLine } from "../../algorithms/shared/pseudocode";
import type { AlgorithmExecution, AlgorithmStep } from "../../algorithms/shared/types";
import { ArrayInput, GridBoard, TargetInput } from "./InputEditors";
import { GraphCanvas } from "./GraphCanvas";
import { MapControls, MapSelect, useMapInput } from "./MapInput";
import { canPredict, questionAt } from "../../algorithms/shared/predict";
import { PlaybackControls } from "./PlaybackControls";
import { PredictPanel } from "./PredictPanel";
import { useT } from "../preferences";
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
  | { category: "search" | "pathfinding" | "spanning" | "negative" | "ordering" | "components" | "flow" | "matching"; options: readonly GraphLabOption[]; initialGraph?: GraphInput | null; /** Called with your own graph (or null when it is not in use) so the page can keep it in the link. */ onGraphChange?: (graph: GraphInput | null) => void }
);

export function AlgoVizLab(props: AlgoVizLabProps) {
  const t = useT();
  const { category, options, defaultAlgorithm, onAlgorithmChange } = props;
  const [algorithmId, setAlgorithmId] = useState(defaultAlgorithm);
  const isArray = category === "sorting" || category === "array-search";
  const [values, setValues] = useState<readonly number[]>(props.category === "sorting" || props.category === "array-search" ? props.initialValues ?? SORT_SAMPLE : SORT_SAMPLE);
  const [target, setTarget] = useState<number>(props.category === "array-search" ? props.initialTarget ?? SEARCH_TARGET_SAMPLE : SEARCH_TARGET_SAMPLE);

  // Search and pathfinding take a start and goal; spanning trees use the whole graph, so they get the sample or your own graph only.
  const usesMap = category === "search" || category === "pathfinding";
  const directed = category === "negative";
  const ordering = category === "ordering";
  const usesGraph = usesMap || directed || ordering || category === "components" || category === "flow" || category === "matching" || category === "spanning";
  const map = useMapInput(usesMap ? "route" : directed ? "directed" : ordering ? "dag" : category === "components" ? "scc" : category === "flow" ? "flow" : category === "matching" ? "match" : category === "spanning" ? "tree" : "off", props.category === "array-search" || props.category === "sorting" ? null : props.initialGraph ?? null);
  const onGraphChange = props.category === "array-search" || props.category === "sorting" ? undefined : props.onGraphChange;
  const shownCustom = usesGraph && map.mapKind === "custom" ? map.custom : null;
  // Dragging changes the graph many times a second, so the link follows a moment later.
  useEffect(() => {
    if (!onGraphChange) return;
    const timer = window.setTimeout(() => onGraphChange(shownCustom), 250);
    return () => window.clearTimeout(timer);
  }, [onGraphChange, shownCustom]);
  const { graph, mapKind, grid, tool } = map;
  const option = options.find((candidate) => candidate.id === algorithmId) ?? options[0];
  const execution = useMemo(() => (category === "array-search" ? (option as TargetLabOption).run(values, target) : category === "sorting" ? (option as ArrayLabOption).run(values) : (option as GraphLabOption).run(graph)), [category, graph, option, target, values]);
  const playback = usePlayback(execution.steps.length, execution);
  const [predict, setPredict] = useState(false);
  const question = useMemo(() => (predict ? questionAt(option.id, execution, playback.stepIndex, graph) : null), [execution, graph, option.id, playback.stepIndex, predict]);
  // Autoplay would run past the questions, so turning predictions on stops it.
  useEffect(() => { if (predict && playback.isPlaying) playback.toggle(); }, [predict, playback.isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const negativeCycle = directed ? execution.steps.at(-1)?.dataStructure?.find((entry) => entry.label === "Negative cycle")?.value : undefined;
  const notBipartite = category === "matching" ? execution.steps.at(-1)?.dataStructure?.find((entry) => entry.label === "Not bipartite")?.value : undefined;
  const dependencyLoop = ordering ? execution.steps.at(-1)?.dataStructure?.find((entry) => entry.label === "Cycle")?.value : undefined;
  const noRoute = (usesMap || directed) && !negativeCycle && !execution.steps.some((candidate) => candidate.type === "path");
  const dijkstraNote = useMemo(() => (directed && algorithmId === "dijkstra" ? compareWithBellmanFord(graph, execution) : null), [algorithmId, directed, execution, graph]);

  useEffect(() => {
    if (options.some((candidate) => candidate.id === defaultAlgorithm)) setAlgorithmId(defaultAlgorithm);
  }, [defaultAlgorithm, options]);

  const changeValues = (next: readonly number[]) => {
    setValues(next);
    if (props.category === "sorting" || props.category === "array-search") props.onValuesChange?.(next);
  };

  return <section className="algoviz-lab" aria-label={`${category} algorithm visualizer`}>
    <div className="algoviz-lab-toolbar">
      <label className="algoviz-select-label">{t("Algorithm")}
        <select value={algorithmId} onChange={(event) => { setAlgorithmId(event.target.value); onAlgorithmChange?.(event.target.value); }} aria-label={t("Choose algorithm")}>
          {options.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </label>
      {usesGraph && <MapSelect map={map} />}
      <label className="algoviz-check"><input type="checkbox" checked={predict} onChange={(event) => setPredict(event.target.checked)} />{t("Predict the next step")}</label>
      <span className="algoviz-input-label">{t("Input")} <strong>{execution.inputLabel}</strong></span>
    </div>

    {isArray && <ArrayInput values={values} onApply={changeValues} />}
    {category === "array-search" && <TargetInput target={target} onApply={(next) => { setTarget(next); if (props.category === "array-search") props.onTargetChange?.(next); }} />}
    {usesGraph && <MapControls map={map} />}
    {notBipartite && <p className="algoviz-field-error" role="status">{t("This graph cannot be split into two sides (the edge {0} joins two nodes that would be on the same side), so there is nothing to match. Remove that edge or move it between the two sides.", String(notBipartite))}</p>}
    {dependencyLoop && <p className="algoviz-field-error" role="status">{t("These tasks depend on each other in a loop ({0}), so no order can satisfy every dependency. Remove one dependency on the loop to get an order.", String(dependencyLoop))}</p>}
    {negativeCycle && <p className="algoviz-field-error" role="status">{t("A negative cycle ({0}) can be reached from {1} and leads to {2}, so no route is the cheapest: every lap round the cycle makes the total smaller. Change an edge on the cycle to make it non-negative.", String(negativeCycle), graph.start, graph.goal)}</p>}
    {dijkstraNote && <p className="algoviz-field-help" role="status">{dijkstraNote}</p>}
    {noRoute && <p className="algoviz-field-error" role="status">{t("No route exists from {0} to {1} on this map. Open a gap in the walls to connect them.", graph.start, graph.goal)}</p>}

    <div className="algoviz-lab-grid">
      <div className="algoviz-stage">
        <div className="algoviz-stage-header" aria-live="polite" aria-atomic="true"><span><i className="algoviz-status-dot" /> {t("Execution surface")}</span><span>{t("Step {0} / {1}", Math.min(step.id + 1, execution.steps.length), execution.steps.length)}</span></div>
        {isArray ? <SortCanvas step={step} /> : usesMap && mapKind === "grid" ? <GridBoard grid={grid} tool={tool} step={step} route={foundPath} onChange={map.setGrid} /> : <GraphCanvas graph={graph} step={step} route={foundPath} editing={usesGraph && mapKind === "custom" ? map.editing : undefined} />}
        <PlaybackControls stepIndex={playback.stepIndex} last={playback.last} isPlaying={playback.isPlaying} speed={playback.speed} onToggle={playback.toggle} onAdvance={playback.advance} onSeek={playback.seek} onSpeed={playback.setSpeed} />
        {predict && <PredictPanel question={question} supported={canPredict(option.id)} stepIndex={playback.stepIndex} resetKey={execution} onContinue={() => playback.advance(1)} />}
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
  const t = useT();
  const code = PSEUDOCODE[algorithmId];
  if (!code) return null;
  const active = activeLine(algorithmId, step);
  return <div className="algoviz-inspector-block"><span>{t("Pseudocode")}</span><ol className="algoviz-pseudocode">{code.lines.map((line, index) => <li key={index} className={index === active ? "is-active" : ""} aria-current={index === active ? "step" : undefined}><code>{line}</code></li>)}</ol></div>;
}

function LabInspector({ step, category, algorithmId }: { step: AlgorithmStep; category: string; algorithmId: string }) {
  const t = useT();
  const data = step.dataStructure ?? [];
  return <aside className="algoviz-inspector"><p className="algoviz-eyebrow">{t("Current action")}</p><h2 aria-live="polite" aria-atomic="true">{t(stepTitle(step.type, category))}</h2><p className="algoviz-explanation" aria-live="polite" aria-atomic="true">{step.explanation}</p><Pseudocode algorithmId={algorithmId} step={step} /><div className="algoviz-inspector-block"><span>{t(category === "sorting" || category === "array-search" ? "Array state" : "Data structure")}</span>{data.length ? data.map((entry) => <div className="algoviz-data-row" key={`${entry.label}-${entry.value}`}><span>{entry.label}</span><strong>{entry.value}</strong></div>) : <p className="algoviz-empty-data">{t("No pending items")}</p>}</div><div className="algoviz-inspector-block algoviz-metrics"><span>{t("Live metrics")}</span><div className="algoviz-metric-grid">{category === "array-search" ? <Metric label="Comparisons" value={step.metrics?.comparisons ?? 0} /> : category === "sorting" ? <><Metric label="Comparisons" value={step.metrics?.comparisons ?? 0} /><Metric label={["merge", "counting", "radix"].includes(algorithmId) ? "Writes" : "Swaps"} value={step.metrics?.swaps ?? 0} /></> : category === "spanning" ? <Metric label="Edges kept" value={step.acceptedEdges?.length ?? 0} /> : category === "ordering" ? <Metric label="Placed" value={step.metrics?.visitedNodes ?? 0} /> : category === "components" ? <Metric label="Components" value={step.groups?.length ?? 0} /> : category === "flow" ? <Metric label="Flow" value={step.metrics?.flow ?? 0} /> : category === "matching" ? <Metric label="Matched" value={step.metrics?.matched ?? 0} /> : <Metric label="Visited" value={step.metrics?.visitedNodes ?? step.visited?.length ?? 0} />}<Metric label="Operations" value={step.metrics?.operations ?? 0} /></div></div></aside>;
}

const STEP_TITLES: Partial<Record<AlgorithmStep["type"], string>> = { accept: "Keep edge", reject: "Skip edge", complete: "Complete" };
// A few labs use a step type for something other than the default meaning.
const CATEGORY_TITLES: Record<string, Partial<Record<AlgorithmStep["type"], string>>> = { components: { accept: "Component found" }, ordering: { reject: "Dependency loop" }, flow: { compare: "Find a path", update: "Send flow" }, matching: { compare: "Check partner", update: "Ask to move", accept: "Pair up", reject: "Stays unmatched" } };
function stepTitle(type: AlgorithmStep["type"], category: string) { return CATEGORY_TITLES[category]?.[type] ?? STEP_TITLES[type] ?? type[0].toUpperCase() + type.slice(1); }

function Metric({ label, value }: { label: string; value: number }) { const t = useT(); return <div><strong>{value}</strong><span>{t(label)}</span></div>; }

const routeOf = (execution: AlgorithmExecution): string[] | null => {
  const value = execution.steps.find((candidate) => candidate.type === "path")?.dataStructure?.find((entry) => entry.label === "Path")?.value;
  return value === undefined ? null : String(value).split(" → ");
};

/** Dijkstra assumes no edge is negative; say what that costs on this graph by checking it against Bellman-Ford. */
function compareWithBellmanFord(graph: GraphInput, dijkstra: AlgorithmExecution): string {
  const mine = routeOf(dijkstra);
  const cost = mine ? pathCost(graph, mine) : null;
  const reference = runBellmanFord(graph);
  const cycle = reference.steps.at(-1)?.dataStructure?.find((entry) => entry.label === "Negative cycle")?.value;
  const bestRoute = routeOf(reference);
  const best = bestRoute ? pathCost(graph, bestRoute) : null;
  const assumption = "Dijkstra assumes no edge is negative.";
  if (cycle) return `${assumption} This graph has a negative cycle on the way to ${graph.goal}, so there is no cheapest route at all; Dijkstra still reports ${cost === null ? "no route" : `one costing ${cost}`}.`;
  if (best === null) return `${assumption} ${cost === null ? "Here no route exists, and it correctly finds none." : `It reports a route costing ${cost}, but Bellman-Ford finds no route.`}`;
  if (cost === null) return `${assumption} It finds no route, but Bellman-Ford finds one costing ${best}.`;
  return cost > best ? `${assumption} Here it settles a node too early and reports a route costing ${cost}, but Bellman-Ford finds one costing ${best}.` : `${assumption} Here it happens to find the cheapest route (cost ${best}), but that is only guaranteed when no edge is negative.`;
}
