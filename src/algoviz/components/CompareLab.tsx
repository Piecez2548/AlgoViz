import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ARRAY_SEARCH_ALGORITHMS, COMPONENT_ALGORITHMS, FLOW_ALGORITHMS, MATCHING_ALGORITHMS, NEGATIVE_ALGORITHMS, ROUTE_ALGORITHMS, SORTING_ALGORITHMS, SPANNING_ALGORITHMS } from "../../algorithms/registry";
import { PRESET_LABELS } from "../../algorithms/shared/arrayInput";
import { componentGrowth, graphGrowth, LIST_SIZES, MAP_SIDES, measure, searchGrowth, SORT_SIZES, sortGrowth, TREE_SIZES, treeGrowth, type GraphMetric, type GridObstacles, type Measure, type SearchMetric, type SortMetric, type SortShape, type TargetPlace, type TreeMetric } from "../../algorithms/shared/benchmark";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import { SEARCH_TARGET_SAMPLE } from "../../algorithms/searching/arraySearchAlgorithms";
import type { AlgorithmStep } from "../../algorithms/shared/types";
import { SORT_SAMPLE } from "../../algorithms/sorting/sortingAlgorithms";
import { GraphCanvas } from "./GraphCanvas";
import { ArrayInput, GridBoard, TargetInput } from "./InputEditors";
import { LineChart, formatNumber, type ChartScale } from "./LineChart";
import { graphFits, MapControls, MapSelect, useMapInput, type MapMode } from "./MapInput";

type Family = "sorting" | "routes" | "trees" | "lists" | "negative" | "components" | "flow" | "matching";
const FAMILY_IDS: readonly Family[] = ["sorting", "routes", "trees", "lists", "negative", "components", "flow", "matching"];
/** Reads ?family= from a link, ignoring anything unknown. */
export const parseFamily = (value: string | null): Family | undefined => FAMILY_IDS.find((id) => id === value);
const mapModeFor = (family: Family): MapMode => (family === "routes" ? "route" : family === "trees" ? "tree" : family === "negative" ? "directed" : family === "components" ? "scc" : family === "flow" ? "flow" : family === "matching" ? "match" : "off");
const NO_STEP: AlgorithmStep = { id: 0, type: "complete", explanation: "" };
const MIN_SELECTED = 2;

const FAMILIES: { id: Family; label: string }[] = [
  { id: "sorting", label: "Sorting algorithms" }, { id: "routes", label: "Search and shortest paths" }, { id: "trees", label: "Spanning trees" }, { id: "lists", label: "Searching a list" }, { id: "negative", label: "Negative edges" }, { id: "components", label: "Strongly connected components" }, { id: "flow", label: "Maximum flow" }, { id: "matching", label: "Bipartite matching" },
];
const ALGORITHMS: Record<Family, readonly { id: string; name: string; short: string }[]> = { sorting: SORTING_ALGORITHMS, routes: ROUTE_ALGORITHMS, trees: SPANNING_ALGORITHMS, lists: ARRAY_SEARCH_ALGORITHMS, negative: NEGATIVE_ALGORITHMS, components: COMPONENT_ALGORITHMS, flow: FLOW_ALGORITHMS, matching: MATCHING_ALGORITHMS };

const SORT_METRICS: Record<SortMetric, string> = { comparisons: "Comparisons", swaps: "Swaps or writes", steps: "Steps recorded" };
const GRAPH_METRICS: Record<GraphMetric, string> = { visited: "Nodes visited", steps: "Steps recorded" };
const TREE_METRICS: Record<TreeMetric, string> = { operations: "Edge checks", steps: "Steps recorded" };
const SEARCH_METRICS: Record<SearchMetric, string> = { comparisons: "Comparisons", steps: "Steps recorded" };
const PLACES: Record<TargetPlace, string> = { absent: "Not in the list (worst case)", last: "The last item", middle: "The middle item", first: "The first item" };
const SHAPES: SortShape[] = ["random", "sorted", "reversed", "nearly", "few-unique"];
const SHAPE_LABELS: Record<SortShape, string> = { random: "Random (average of 3)", sorted: PRESET_LABELS.sorted, reversed: PRESET_LABELS.reversed, nearly: PRESET_LABELS.nearly, "few-unique": PRESET_LABELS["few-unique"] };

type MetricKey = "sort" | "graph" | "tree" | "search";
const metricKey = (family: Family): MetricKey => (family === "sorting" ? "sort" : family === "routes" || family === "negative" ? "graph" : family === "trees" || family === "components" ? "tree" : "search");
const metricLabels = (family: Family): Record<string, string> => (family === "sorting" ? SORT_METRICS : family === "routes" ? GRAPH_METRICS : family === "trees" || family === "components" ? TREE_METRICS : SEARCH_METRICS);

interface CompareLabProps {
  initialValues?: readonly number[];
  onValuesChange?: (values: readonly number[]) => void;
  initialFamily?: Family;
  onFamilyChange?: (family: Family) => void;
  initialTarget?: number;
  onTargetChange?: (target: number) => void;
  /** Your own graph from a link; used only when it suits the family. */
  initialGraph?: GraphInput | null;
  onGraphChange?: (graph: GraphInput | null) => void;
}

export function CompareLab({ initialValues, onValuesChange, initialFamily, onFamilyChange, initialTarget, onTargetChange, initialGraph, onGraphChange }: CompareLabProps) {
  const [family, setFamilyState] = useState<Family>(initialFamily ?? "sorting");
  const setFamily = (next: Family) => { setFamilyState(next); onFamilyChange?.(next); };
  const [selected, setSelected] = useState<Record<Family, string[]>>({ sorting: ["bubble", "merge", "quick"], routes: ["bfs", "dijkstra", "a-star"], trees: ["kruskal", "prim"], lists: ["binary-search", "linear-search"], negative: ["bellman-ford", "floyd-warshall", "dijkstra"], components: ["tarjan", "kosaraju"], flow: ["edmonds-karp", "ford-fulkerson"], matching: ["kuhn", "greedy-matching"] });
  const [values, setValues] = useState<readonly number[]>(initialValues ?? SORT_SAMPLE);
  const [target, setTargetState] = useState(initialTarget ?? SEARCH_TARGET_SAMPLE);
  const setTarget = (next: number) => { setTargetState(next); onTargetChange?.(next); };
  const mode = mapModeFor(family);
  const map = useMapInput(mode, graphFits(mode, initialGraph) ? initialGraph : null);
  const shownCustom = mode !== "off" && map.mapKind === "custom" ? map.custom : null;
  // Dragging changes the graph many times a second, so the link follows a moment later.
  useEffect(() => {
    if (!onGraphChange) return;
    const timer = window.setTimeout(() => onGraphChange(shownCustom), 250);
    return () => window.clearTimeout(timer);
  }, [onGraphChange, shownCustom]);
  const [shape, setShape] = useState<SortShape>("random");
  const [obstacles, setObstacles] = useState<GridObstacles>("none");
  const [place, setPlace] = useState<TargetPlace>("absent");
  const [metrics, setMetrics] = useState<GrowthProps["metrics"]>({ sort: "comparisons", graph: "visited", tree: "operations", search: "comparisons" });
  const [scale, setScale] = useState<ChartScale>("linear");

  const ids = selected[family];
  const toggle = (id: string) => setSelected((current) => {
    const list = current[family];
    if (list.includes(id)) return list.length <= MIN_SELECTED ? current : { ...current, [family]: list.filter((item) => item !== id) };
    return { ...current, [family]: [...list, id] };
  });
  const changeValues = (next: readonly number[]) => { setValues(next); onValuesChange?.(next); };
  const options = ALGORITHMS[family];
  // With only two algorithms there is nothing to add or remove.
  const fixedPair = options.length <= MIN_SELECTED;

  return <section className="algoviz-compare-lab" aria-label="Algorithm comparison">
    <div className="algoviz-input-panel algoviz-compare-controls">
      <fieldset className="algoviz-tools"><legend>What to compare</legend>
        {FAMILIES.map(({ id, label }) => <label key={id} className={family === id ? "is-active" : ""}><input type="radio" name="compare-family" checked={family === id} onChange={() => setFamily(id)} />{label}</label>)}
      </fieldset>
      {fixedPair
        ? <p className="algoviz-field-help">Comparing {options.map((algorithm) => algorithm.name).join(" and ")}.</p>
        : <fieldset className="algoviz-tools"><legend>Algorithms (pick at least {MIN_SELECTED})</legend>
          {options.map((algorithm) => {
            const checked = ids.includes(algorithm.id);
            return <label key={algorithm.id} className={checked ? "is-active" : ""}><input type="checkbox" checked={checked} disabled={checked && ids.length <= MIN_SELECTED} onChange={() => toggle(algorithm.id)} />{algorithm.name}</label>;
          })}
        </fieldset>}
    </div>

    <h2 className="algoviz-compare-heading">Same input, side by side</h2>
    {family === "sorting" && <ArrayInput values={values} onApply={changeValues} />}
    {family === "lists" && <><ArrayInput values={values} onApply={changeValues} /><TargetInput target={target} onApply={setTarget} /></>}
    {(family === "routes" || family === "trees" || family === "negative" || family === "components" || family === "flow" || family === "matching") && <>
      <div className="algoviz-input-panel"><MapSelect map={map} /></div>
      <MapControls map={map} />
      {family === "routes" && map.mapKind === "grid" && <GridBoard grid={map.grid} tool={map.tool} step={NO_STEP} route={[]} onChange={map.setGrid} />}
      {(map.mapKind === "custom" || family === "trees" || family === "negative" || family === "components" || family === "flow" || family === "matching") && <GraphCanvas graph={map.graph} step={NO_STEP} route={[]} editing={map.mapKind === "custom" ? map.editing : undefined} />}
    </>}
    <SameInputResults family={family} ids={ids} values={values} target={target} graph={map.graph} />

    {family === "negative" || family === "flow" || family === "matching" ? <>
      <h2 className="algoviz-compare-heading">Why there is no growth chart here</h2>
      <p className="algoviz-compare-note">{family === "negative" ? "With negative edges the interesting difference is whether the answer is right, not how quickly it arrives. Try the sample with a negative edge, then the sample with a negative cycle, and see which algorithms notice." : family === "matching" ? "What matters here is how many pairs each one finds, which depends on the shape of the graph rather than its size. Edit the graph, or try the sample where one person must be left out." : "How many rounds each algorithm needs depends on the capacities and on which paths it happens to pick, so one growth chart would say little. Edit the graph and watch how the rounds change."}</p>
    </> : <>
    <h2 className="algoviz-compare-heading">How the cost grows with input size</h2>
    <div className="algoviz-input-panel">
      {family === "sorting" && <label className="algoviz-field">Data shape<select value={shape} onChange={(event) => setShape(event.target.value as SortShape)}>{SHAPES.map((item) => <option key={item} value={item}>{SHAPE_LABELS[item]}</option>)}</select></label>}
      {family === "routes" && <label className="algoviz-field">Obstacles<select value={obstacles} onChange={(event) => setObstacles(event.target.value as GridObstacles)}><option value="none">None (open map)</option><option value="scattered">Scattered walls</option></select></label>}
      {family === "lists" && <label className="algoviz-field">Where is the value?<select value={place} onChange={(event) => setPlace(event.target.value as TargetPlace)}>{(Object.keys(PLACES) as TargetPlace[]).map((item) => <option key={item} value={item}>{PLACES[item]}</option>)}</select></label>}
      <label className="algoviz-field">Measure<select value={metrics[metricKey(family)]} onChange={(event) => setMetrics((current) => ({ ...current, [metricKey(family)]: event.target.value }))}>{Object.entries(metricLabels(family)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <fieldset className="algoviz-tools"><legend>Scale</legend>
        {(["linear", "log"] as const).map((item) => <label key={item} className={scale === item ? "is-active" : ""}><input type="radio" name="chart-scale" checked={scale === item} onChange={() => setScale(item)} />{item === "linear" ? "Linear" : "Log (shows growth rate)"}</label>)}
      </fieldset>
    </div>
    <GrowthChart family={family} ids={ids} shape={shape} obstacles={obstacles} place={place} metrics={metrics} scale={scale} />
    </>}
  </section>;
}

interface Result { id: string; name: string; measure: Measure }
interface Column { key: keyof Measure; label: string }

const COLUMNS: Record<Family, Column[]> = {
  sorting: [{ key: "comparisons", label: "Comparisons" }, { key: "swaps", label: "Swaps or writes" }, { key: "steps", label: "Steps recorded" }],
  routes: [{ key: "visited", label: "Nodes visited" }, { key: "steps", label: "Steps recorded" }, { key: "cost", label: "Route cost" }],
  trees: [{ key: "edges", label: "Edges kept" }, { key: "weight", label: "Total weight" }, { key: "operations", label: "Edge checks" }, { key: "steps", label: "Steps recorded" }],
  lists: [{ key: "comparisons", label: "Comparisons" }, { key: "steps", label: "Steps recorded" }],
  matching: [{ key: "matched", label: "Pairs matched" }, { key: "operations", label: "Edge checks" }, { key: "steps", label: "Steps recorded" }],
  flow: [{ key: "flow", label: "Max flow" }, { key: "augmentations", label: "Rounds" }, { key: "operations", label: "Arc checks" }, { key: "steps", label: "Steps recorded" }],
  components: [{ key: "components", label: "Components found" }, { key: "operations", label: "Edge checks" }, { key: "steps", label: "Steps recorded" }],
  negative: [{ key: "cost", label: "Route cost" }, { key: "visited", label: "Nodes visited" }, { key: "steps", label: "Steps recorded" }],
};

function SameInputResults({ family, ids, values, target, graph }: { family: Family; ids: string[]; values: readonly number[]; target: number; graph: GraphInput }) {
  const results = useMemo<Result[]>(() => {
    const pick = <T extends { id: string }>(all: readonly T[]) => all.filter((algorithm) => ids.includes(algorithm.id));
    if (family === "sorting") return pick(SORTING_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(values)) }));
    if (family === "lists") return pick(ARRAY_SEARCH_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(values, target)) }));
    if (family === "matching") return pick(MATCHING_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(graph), graph) }));
    if (family === "flow") return pick(FLOW_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(graph), graph) }));
    if (family === "components") return pick(COMPONENT_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(graph), graph) }));
    if (family === "negative") return pick(NEGATIVE_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(graph), graph) }));
    if (family === "trees") return pick(SPANNING_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(graph), graph) }));
    return pick(ROUTE_ALGORITHMS).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(graph), graph) }));
  }, [family, graph, ids, target, values]);
  const columns = COLUMNS[family];
  const input = family === "sorting" ? `${values.length} numbers: ${values.join(", ")}`
    : family === "lists" ? `find ${target} in ${values.length} numbers: ${values.join(", ")}`
      : family === "matching" ? `${graph.label ?? "Bipartite graph"}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`
      : family === "flow" ? `${graph.label ?? "Flow network"}: ${graph.start} → ${graph.goal}`
      : family === "components" ? `${graph.label ?? "Directed graph"}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`
      : family === "negative" ? `${graph.label ?? "Directed graph"}: ${graph.start} → ${graph.goal}`
      : family === "trees" ? `${graph.label ?? "Sample graph"}: ${graph.nodes.length} nodes, ${graph.edges.length} edges, from ${graph.start}`
        : `${graph.label ?? "Sample graph"}: ${graph.start} → ${graph.goal}`;
  const best = (key: keyof Measure) => {
    const numbers = results.map((result) => result.measure[key]).filter((value): value is number => typeof value === "number");
    return numbers.length ? Math.min(...numbers) : undefined;
  };
  const worst = (key: keyof Measure) => Math.max(1, ...results.map((result) => Number(result.measure[key] ?? 0)));
  // Edges kept and total weight describe the answer, not the effort, so they are never marked "lowest".
  const effort = (key: keyof Measure) => !(family === "trees" && (key === "edges" || key === "weight")) && !(family === "components" && key === "components") && !(family === "flow" && key === "flow") && !(family === "matching" && key === "matched");
  return <div className="algoviz-compare-results">
    <p className="algoviz-compare-verdict" role="status">{verdict(family, results, values, target, graph)}</p>
    <div className="algoviz-table-wrap" role="region" aria-label="Results table" tabIndex={0}>
      <table className="algoviz-table">
        <caption>Results on the same input ({input.length > 90 ? `${input.slice(0, 90)}…` : input}). Lower is better.</caption>
        <thead><tr><th scope="col">Algorithm</th>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{results.map((result) => <tr key={result.id}>
          <th scope="row">{result.name}</th>
          {columns.map((column) => {
            const value = result.measure[column.key];
            if (value === null) return <td key={column.key}>{result.measure.negativeCycle ? "Negative cycle" : "No route"}</td>;
            // With a negative cycle there is no cheapest route, so a cost Dijkstra reports anyway is not "lowest".
            const top = effort(column.key) && best(column.key) === value && !(column.key === "cost" && results.some((item) => item.measure.negativeCycle));
            return <td key={column.key}><span className="algoviz-bar" aria-hidden="true"><i style={{ width: `${Math.max(3, (Number(value) / worst(column.key)) * 100)}%` }} /></span><strong>{formatNumber(Number(value))}</strong>{top && results.length > 1 && <small className="algoviz-lowest"> lowest</small>}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="algoviz-compare-note">{NOTES[family]}</p>
  </div>;
}

const NOTES: Record<Family, string> = {
  sorting: "Counts come from the recorded runs. Merge, counting and radix sort write values into place, so their writes appear under swaps. Counting and radix sort never compare two values, so their comparisons are zero.",
  routes: "Steps are the moments each algorithm records for display, not time. Bellman-Ford only records improvements, so it looks short here even though it checks every edge in every pass. Floyd-Warshall records one step per stop-over node. Nodes visited counts the nodes an algorithm touched.",
  trees: "Edge checks are what each algorithm counted itself: Kruskal looks at each edge once; Prim looks at every edge that leaves the tree in every round. Steps are the moments recorded for display, not time.",
  matching: "Pairs matched is the answer: the larger the better. Edge checks are what each algorithm counted itself. Greedy never changes a pair, so it can match fewer; Kuhn frees up partners along augmenting paths and always finds the most. Steps are the moments recorded for display, not time.",
  flow: "Both reach the same maximum flow. A round is one path that had room and was filled; arc checks are what each search counted itself. Edmonds-Karp always takes a path with the fewest edges, Ford-Fulkerson the first it finds, so the number of rounds can differ. Steps are the moments recorded for display, not time.",
  components: "Both find exactly the same groups. Edge checks are what each algorithm counted itself: Tarjan looks at each edge once in a single search; Kosaraju looks at each edge in both of its two searches. Steps are the moments recorded for display, not time.",
  negative: "Bellman-Ford and Floyd-Warshall handle negative edges and notice a negative cycle. Dijkstra assumes there are none, so it can report a route that is not the cheapest, and it never notices a cycle. Steps are the moments recorded for display, not time.",
  lists: "Both searches get your numbers in ascending order. Comparisons are what each search counted itself; steps are the moments recorded for display, not time.",
};

/** Plain-language summary worked out from the measured numbers. */
function verdict(family: Family, results: Result[], values: readonly number[], target: number, graph: GraphInput): string {
  const named = (count: number, key: "comparisons" | "operations") => results.filter((item) => item.measure[key] === count).map((item) => item.name).join(" and ");
  const fewestMost = (key: "comparisons" | "operations", noun: string) => {
    const counts = results.map((item) => item.measure[key]);
    const fewest = Math.min(...counts); const most = Math.max(...counts);
    return fewest === most ? `All made ${formatNumber(fewest)} ${noun}.` : `${named(fewest, key)} made the fewest ${noun} (${formatNumber(fewest)}); ${named(most, key)} made the most (${formatNumber(most)}).`;
  };
  if (family === "sorting") return fewestMost("comparisons", "comparisons");
  if (family === "lists") return `${values.includes(target) ? `${target} is in the list.` : `${target} is not in the list, so every possibility had to be ruled out.`} ${fewestMost("comparisons", "comparisons")}`;
  if (family === "trees") {
    const same = results.every((item) => item.measure.edges === results[0].measure.edges && item.measure.weight === results[0].measure.weight);
    if (!same) return `The trees differ because the graph is not connected: ${results.map((item) => `${item.name} kept ${item.measure.edges} edge${item.measure.edges === 1 ? "" : "s"} (weight ${item.measure.weight})`).join(", ")}. Prim only reaches the nodes connected to the start.`;
    const partial = results[0].measure.edges < graph.nodes.length - 1 ? " The graph is not fully connected, so the tree covers only part of it." : "";
    return `${results.length === 2 ? "Both" : "All"} built a tree of weight ${results[0].measure.weight} from ${results[0].measure.edges} edges. ${fewestMost("operations", "edge checks")}${partial}`;
  }
  if (family === "negative") return negativeVerdict(results);
  if (family === "matching") {
    const sizes = results.map((item) => item.measure.matched);
    const best = Math.max(...sizes); const least = Math.min(...sizes);
    const named = (count: number) => results.filter((item) => item.measure.matched === count).map((item) => item.name).join(" and ");
    return best === least ? `Both matched ${best} pair${best === 1 ? "" : "s"}, the most that can be matched here.` : `${named(best)} matched ${best} pair${best === 1 ? "" : "s"}; ${named(least)} only ${least}. A matching that cannot be grown by adding a pair can still be smaller than the best one.`;
  }
  if (family === "flow") {
    const rounds = results.map((item) => item.measure.augmentations);
    const fewest = Math.min(...rounds); const most = Math.max(...rounds);
    const named = (count: number) => results.filter((item) => item.measure.augmentations === count).map((item) => item.name).join(" and ");
    return `Both reach a maximum flow of ${results[0].measure.flow}. ${fewest === most ? `Both needed ${fewest} round${fewest === 1 ? "" : "s"}.` : `${named(fewest)} needed the fewest rounds (${fewest}); ${named(most)} the most (${most}).`}`;
  }
  if (family === "components") return `Both found ${results[0].measure.components} strongly connected component${results[0].measure.components === 1 ? "" : "s"}. ${fewestMost("operations", "edge checks")}`;
  const found = results.filter((result) => result.measure.cost !== null);
  if (!found.length) return "No route exists between the start and the goal on this map.";
  const cheapest = Math.min(...found.map((result) => result.measure.cost!));
  const dearer = found.filter((result) => result.measure.cost! > cheapest);
  const missing = results.filter((result) => result.measure.cost === null);
  const lead = dearer.length ? `${found.filter((result) => result.measure.cost === cheapest).map((result) => result.name).join(" and ")} found the cheapest route (cost ${cheapest}); ${dearer.map((result) => `${result.name} paid ${result.measure.cost}`).join(", ")}.` : `All found routes cost ${cheapest}.`;
  const fewest = [...found].sort((a, b) => a.measure.visited - b.measure.visited)[0];
  return `${lead} ${fewest.name} visited the fewest nodes (${fewest.measure.visited}).${missing.length ? ` ${missing.map((result) => result.name).join(", ")} found no route.` : ""}`;
}

function negativeVerdict(results: Result[]): string {
  const names = (list: Result[]) => list.map((item) => item.name).join(" and ");
  const cycle = results.filter((item) => item.measure.negativeCycle);
  if (cycle.length) {
    const others = results.filter((item) => !item.measure.negativeCycle);
    return `${names(cycle)} found a negative cycle on the way to the goal, so no route is the cheapest.${others.length ? ` ${others.map((item) => `${item.name} ${item.measure.cost === null ? "found no route" : `still reports a route costing ${item.measure.cost}`}`).join("; ")}.` : ""}`;
  }
  const found = results.filter((item) => item.measure.cost !== null);
  if (!found.length) return "No route exists between the start and the goal on this graph.";
  const cheapest = Math.min(...found.map((item) => item.measure.cost!));
  const wrong = found.filter((item) => item.measure.cost! > cheapest);
  const missing = results.filter((item) => item.measure.cost === null);
  const lead = wrong.length ? `${names(found.filter((item) => item.measure.cost === cheapest))} found the cheapest route (cost ${cheapest}); ${wrong.map((item) => `${item.name} paid ${item.measure.cost}`).join(", ")}.${wrong.some((item) => item.id === "dijkstra") ? " Dijkstra assumes no edge is negative." : ""}` : `All found routes cost ${cheapest}.`;
  return `${lead}${missing.length ? ` ${names(missing)} found no route.` : ""}`;
}

interface GrowthProps { family: Family; ids: string[]; shape: SortShape; obstacles: GridObstacles; place: TargetPlace; metrics: { sort: SortMetric; graph: GraphMetric; tree: TreeMetric; search: SearchMetric }; scale: ChartScale }

const AXES: Record<Exclude<Family, "negative" | "flow" | "matching">, { x: string; unit: string }> = {
  components: { x: "Nodes in the graph (about 3 edges each)", unit: "Nodes" },
  sorting: { x: "Numbers to sort", unit: "Numbers" }, routes: { x: "Map cells (side × side)", unit: "Cells" }, trees: { x: "Nodes in the graph (about 3 edges each)", unit: "Nodes" }, lists: { x: "Items in the sorted list", unit: "Items" },
};

function GrowthChart(props: GrowthProps) {
  // The chart is the slow part, so it follows the controls a moment later instead of blocking them.
  const deferred = useDeferredValue(props);
  const stale = deferred !== props;
  const { ids, shape, obstacles, place, metrics, scale } = deferred;
  const family = deferred.family === "negative" || deferred.family === "flow" || deferred.family === "matching" ? "routes" : deferred.family;
  const series = useMemo(() => family === "sorting" ? sortGrowth(ids, shape, metrics.sort) : family === "routes" ? graphGrowth(ids, obstacles, metrics.graph) : family === "trees" ? treeGrowth(ids, metrics.tree) : family === "components" ? componentGrowth(ids, metrics.tree) : searchGrowth(ids, place, metrics.search), [family, ids, metrics, obstacles, place, shape]);
  const shorts = new Map(Object.values(ALGORITHMS).flat().map((algorithm) => [algorithm.id, algorithm.short]));
  const metricLabel = metricLabels(family)[metrics[metricKey(family)]];
  const { x: xLabel, unit } = AXES[family];
  const sizes = family === "sorting" ? SORT_SIZES : family === "routes" ? MAP_SIDES.map((side) => side * side) : family === "trees" || family === "components" ? TREE_SIZES : LIST_SIZES;
  const chartSeries = series.map((item) => ({ id: item.id, name: item.name, short: shorts.get(item.id), points: item.points.map((point) => ({ x: point.n, y: point.value })) }));
  const description = `${metricLabel} against ${xLabel.toLowerCase()}. ${series.map((item) => `${item.name} ends at ${formatNumber(item.points.at(-1)?.value ?? 0)}`).join("; ")}.`;
  const tip = family === "sorting" ? sortTip(ids, shape, metrics.sort) : family === "routes" ? graphTip(ids, obstacles, metrics.graph) : family === "trees" ? treeTip(ids, metrics.tree) : family === "components" ? componentTip(ids, metrics.tree) : listTip(ids, place, metrics.search);
  return <div className={stale ? "algoviz-chart-wrap is-stale" : "algoviz-chart-wrap"} aria-busy={stale}>
    <LineChart series={chartSeries} xLabel={xLabel} yLabel={metricLabel} scale={scale} description={description} />
    {tip && <p className="algoviz-compare-note">{tip}</p>}
    <details className="algoviz-chart-data">
      <summary>Show the numbers behind the chart</summary>
      <div className="algoviz-table-wrap" role="region" aria-label="Chart data table" tabIndex={0}><table className="algoviz-table">
        <caption>{metricLabel} by {xLabel.toLowerCase()}</caption>
        <thead><tr><th scope="col">{unit}</th>{series.map((item) => <th scope="col" key={item.id}>{item.name}</th>)}</tr></thead>
        <tbody>{sizes.map((size, row) => <tr key={size}><th scope="row">{size}</th>{series.map((item) => <td key={item.id}>{formatNumber(item.points[row].value)}</td>)}</tr>)}</tbody>
      </table></div>
    </details>
  </div>;
}

/** Only statements the benchmark tests verify. */
function sortTip(ids: string[], shape: SortShape, metric: SortMetric): string | null {
  if (metric !== "comparisons") return null;
  if (shape === "sorted" && ids.includes("quick")) return "Quick sort picks the last value as its pivot, so already sorted data is its worst case: it needs as many comparisons as bubble sort.";
  if (shape === "sorted" && ids.includes("insertion")) return "On sorted data insertion sort only checks each value once, so its comparisons grow in a straight line.";
  if (ids.includes("bubble") && ids.includes("selection")) return "Bubble and selection sort make n × (n − 1) ÷ 2 comparisons whatever the data looks like, so their lines are identical.";
  return null;
}

function graphTip(ids: string[], obstacles: GridObstacles, metric: GraphMetric): string | null {
  if (metric === "visited" && ids.includes("bfs") && ids.includes("dijkstra") && obstacles === "none") return "On an open map every step costs the same, so Breadth-First Search and Dijkstra visit exactly the same nodes and their lines sit on top of each other. " + (ids.includes("a-star") ? "A* heads straight for the goal instead, so the gap widens as the map grows." : "");
  if (metric === "visited" && ids.includes("a-star") && ids.includes("dijkstra") && obstacles === "none") return "On an open map A* heads straight for the goal while Dijkstra spreads out in every direction, so the gap widens as the map grows.";
  return null;
}

function treeTip(ids: string[], metric: TreeMetric): string | null {
  if (metric === "operations" && ids.includes("kruskal") && ids.includes("prim")) return "Kruskal looks at each edge once. Prim looks again at every edge that leaves the tree in every round, so its checks pull away as the graph grows. Both always build a tree of the same total weight.";
  return null;
}

function componentTip(ids: string[], metric: TreeMetric): string | null {
  if (metric === "operations" && ids.includes("tarjan") && ids.includes("kosaraju")) return "Kosaraju searches the graph twice, once forwards and once backwards, so it checks every edge exactly twice. Tarjan checks each edge once. Both lines are straight, and Kosaraju's is exactly twice as high.";
  return null;
}

function listTip(ids: string[], place: TargetPlace, metric: SearchMetric): string | null {
  if (metric !== "comparisons" || !ids.includes("binary-search") || !ids.includes("linear-search")) return null;
  if (place === "absent") return "With the value missing, linear search has to look at every item, so its line is a straight diagonal. Binary search halves the range each time, so it only needs about log₂ n looks. Try the log scale.";
  if (place === "first") return "When the value is the very first item, linear search finds it in one look at any size, and binary search still needs several. Binary search wins on average, not every time.";
  return null;
}
