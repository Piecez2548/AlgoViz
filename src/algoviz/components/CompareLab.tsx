import { useDeferredValue, useMemo, useState } from "react";
import { ROUTE_ALGORITHMS, SORTING_ALGORITHMS } from "../../algorithms/registry";
import { PRESET_LABELS } from "../../algorithms/shared/arrayInput";
import { graphGrowth, MAP_SIDES, measure, SORT_SIZES, sortGrowth, type GraphMetric, type GridObstacles, type Measure, type SortMetric, type SortShape } from "../../algorithms/shared/benchmark";
import type { AlgorithmStep } from "../../algorithms/shared/types";
import { SORT_SAMPLE } from "../../algorithms/sorting/sortingAlgorithms";
import { ArrayInput, GridBoard } from "./InputEditors";
import { LineChart, formatNumber, type ChartScale } from "./LineChart";
import { MapControls, MapSelect, useMapInput } from "./MapInput";

type Family = "sorting" | "routes";
const NO_STEP: AlgorithmStep = { id: 0, type: "complete", explanation: "" };
const MIN_SELECTED = 2;

const SORT_METRICS: Record<SortMetric, string> = { comparisons: "Comparisons", swaps: "Swaps or writes", steps: "Steps recorded" };
const GRAPH_METRICS: Record<GraphMetric, string> = { visited: "Nodes visited", steps: "Steps recorded" };
const SHAPES: SortShape[] = ["random", "sorted", "reversed", "nearly", "few-unique"];
const SHAPE_LABELS: Record<SortShape, string> = { random: "Random (average of 3)", sorted: PRESET_LABELS.sorted, reversed: PRESET_LABELS.reversed, nearly: PRESET_LABELS.nearly, "few-unique": PRESET_LABELS["few-unique"] };

interface CompareLabProps {
  initialValues?: readonly number[];
  onValuesChange?: (values: readonly number[]) => void;
}

export function CompareLab({ initialValues, onValuesChange }: CompareLabProps) {
  const [family, setFamily] = useState<Family>("sorting");
  const [selected, setSelected] = useState<Record<Family, string[]>>({ sorting: ["bubble", "merge", "quick"], routes: ["bfs", "dijkstra", "a-star"] });
  const [values, setValues] = useState<readonly number[]>(initialValues ?? SORT_SAMPLE);
  const map = useMapInput(family === "routes");
  const [shape, setShape] = useState<SortShape>("random");
  const [obstacles, setObstacles] = useState<GridObstacles>("none");
  const [sortMetric, setSortMetric] = useState<SortMetric>("comparisons");
  const [graphMetric, setGraphMetric] = useState<GraphMetric>("visited");
  const [scale, setScale] = useState<ChartScale>("linear");

  const ids = selected[family];
  const toggle = (id: string) => setSelected((current) => {
    const list = current[family];
    if (list.includes(id)) return list.length <= MIN_SELECTED ? current : { ...current, [family]: list.filter((item) => item !== id) };
    return { ...current, [family]: [...list, id] };
  });
  const changeValues = (next: readonly number[]) => { setValues(next); onValuesChange?.(next); };

  return <section className="algoviz-compare-lab" aria-label="Algorithm comparison">
    <div className="algoviz-input-panel algoviz-compare-controls">
      <fieldset className="algoviz-tools"><legend>What to compare</legend>
        {([["sorting", "Sorting algorithms"], ["routes", "Search and shortest paths"]] as const).map(([id, label]) =>
          <label key={id} className={family === id ? "is-active" : ""}><input type="radio" name="compare-family" checked={family === id} onChange={() => setFamily(id)} />{label}</label>)}
      </fieldset>
      <fieldset className="algoviz-tools"><legend>Algorithms (pick at least {MIN_SELECTED})</legend>
        {(family === "sorting" ? SORTING_ALGORITHMS : ROUTE_ALGORITHMS).map((algorithm) => {
          const checked = ids.includes(algorithm.id);
          return <label key={algorithm.id} className={checked ? "is-active" : ""}><input type="checkbox" checked={checked} disabled={checked && ids.length <= MIN_SELECTED} onChange={() => toggle(algorithm.id)} />{algorithm.name}</label>;
        })}
      </fieldset>
    </div>

    <h2 className="algoviz-compare-heading">Same input, side by side</h2>
    {family === "sorting" ? <ArrayInput values={values} onApply={changeValues} /> : <>
      <div className="algoviz-input-panel"><MapSelect map={map} /></div>
      <MapControls map={map} />
      {map.mapKind === "grid" && <GridBoard grid={map.grid} tool={map.tool} step={NO_STEP} route={[]} onChange={map.setGrid} />}
    </>}
    <SameInputResults family={family} ids={ids} values={values} graph={map.graph} />

    <h2 className="algoviz-compare-heading">How the cost grows with input size</h2>
    <div className="algoviz-input-panel">
      {family === "sorting" ? <>
        <label className="algoviz-field">Data shape<select value={shape} onChange={(event) => setShape(event.target.value as SortShape)}>{SHAPES.map((item) => <option key={item} value={item}>{SHAPE_LABELS[item]}</option>)}</select></label>
        <label className="algoviz-field">Measure<select value={sortMetric} onChange={(event) => setSortMetric(event.target.value as SortMetric)}>{(Object.keys(SORT_METRICS) as SortMetric[]).map((item) => <option key={item} value={item}>{SORT_METRICS[item]}</option>)}</select></label>
      </> : <>
        <label className="algoviz-field">Obstacles<select value={obstacles} onChange={(event) => setObstacles(event.target.value as GridObstacles)}><option value="none">None (open map)</option><option value="scattered">Scattered walls</option></select></label>
        <label className="algoviz-field">Measure<select value={graphMetric} onChange={(event) => setGraphMetric(event.target.value as GraphMetric)}>{(Object.keys(GRAPH_METRICS) as GraphMetric[]).map((item) => <option key={item} value={item}>{GRAPH_METRICS[item]}</option>)}</select></label>
      </>}
      <fieldset className="algoviz-tools"><legend>Scale</legend>
        {(["linear", "log"] as const).map((item) => <label key={item} className={scale === item ? "is-active" : ""}><input type="radio" name="chart-scale" checked={scale === item} onChange={() => setScale(item)} />{item === "linear" ? "Linear" : "Log (shows growth rate)"}</label>)}
      </fieldset>
    </div>
    <GrowthChart family={family} ids={ids} shape={shape} obstacles={obstacles} sortMetric={sortMetric} graphMetric={graphMetric} scale={scale} />
  </section>;
}

interface Result { id: string; name: string; measure: Measure }

function SameInputResults({ family, ids, values, graph }: { family: Family; ids: string[]; values: readonly number[]; graph: ReturnType<typeof useMapInput>["graph"] }) {
  const results = useMemo<Result[]>(() => family === "sorting"
    ? SORTING_ALGORITHMS.filter((algorithm) => ids.includes(algorithm.id)).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(values)) }))
    : ROUTE_ALGORITHMS.filter((algorithm) => ids.includes(algorithm.id)).map((algorithm) => ({ id: algorithm.id, name: algorithm.name, measure: measure(algorithm.run(graph), graph) })),
  [family, graph, ids, values]);
  const columns: { key: keyof Measure; label: string }[] = family === "sorting"
    ? [{ key: "comparisons", label: "Comparisons" }, { key: "swaps", label: "Swaps or writes" }, { key: "steps", label: "Steps recorded" }]
    : [{ key: "visited", label: "Nodes visited" }, { key: "steps", label: "Steps recorded" }, { key: "cost", label: "Route cost" }];
  const input = family === "sorting" ? `${values.length} numbers: ${values.join(", ")}` : `${graph.label ?? "Sample graph"}: ${graph.start} → ${graph.goal}`;
  const best = (key: keyof Measure) => {
    const numbers = results.map((result) => result.measure[key]).filter((value): value is number => typeof value === "number");
    return numbers.length ? Math.min(...numbers) : undefined;
  };
  const worst = (key: keyof Measure) => Math.max(1, ...results.map((result) => Number(result.measure[key] ?? 0)));
  return <div className="algoviz-compare-results">
    <p className="algoviz-compare-verdict" role="status">{verdict(family, results)}</p>
    <div className="algoviz-table-wrap" role="region" aria-label="Results table" tabIndex={0}>
      <table className="algoviz-table">
        <caption>Results on the same input ({input.length > 90 ? `${input.slice(0, 90)}…` : input}). Lower is better.</caption>
        <thead><tr><th scope="col">Algorithm</th>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{results.map((result) => <tr key={result.id}>
          <th scope="row">{result.name}</th>
          {columns.map((column) => {
            const value = result.measure[column.key];
            if (value === null) return <td key={column.key}>No route</td>;
            const top = best(column.key) === value;
            return <td key={column.key}><span className="algoviz-bar" aria-hidden="true"><i style={{ width: `${Math.max(3, (Number(value) / worst(column.key)) * 100)}%` }} /></span><strong>{formatNumber(Number(value))}</strong>{top && results.length > 1 && <small className="algoviz-lowest"> lowest</small>}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="algoviz-compare-note">{family === "sorting"
      ? "Counts come from the recorded runs. Merge sort writes values into place, so its writes appear under swaps."
      : "Steps are the moments each algorithm records for display, not time. Bellman-Ford only records improvements, so it looks short here even though it checks every edge in every pass. Nodes visited counts the nodes an algorithm touched."}</p>
  </div>;
}

/** Plain-language summary worked out from the measured numbers. */
function verdict(family: Family, results: Result[]): string {
  if (family === "sorting") {
    const counts = results.map((item) => item.measure.comparisons);
    const fewest = Math.min(...counts); const most = Math.max(...counts);
    if (fewest === most) return `All made ${formatNumber(fewest)} comparisons.`;
    const named = (count: number) => results.filter((item) => item.measure.comparisons === count).map((item) => item.name).join(" and ");
    return `${named(fewest)} made the fewest comparisons (${formatNumber(fewest)}); ${named(most)} made the most (${formatNumber(most)}).`;
  }
  const found = results.filter((result) => result.measure.cost !== null);
  if (!found.length) return "No route exists between the start and the goal on this map.";
  const cheapest = Math.min(...found.map((result) => result.measure.cost!));
  const dearer = found.filter((result) => result.measure.cost! > cheapest);
  const missing = results.filter((result) => result.measure.cost === null);
  const lead = dearer.length ? `${found.filter((result) => result.measure.cost === cheapest).map((result) => result.name).join(" and ")} found the cheapest route (cost ${cheapest}); ${dearer.map((result) => `${result.name} paid ${result.measure.cost}`).join(", ")}.` : `All found routes cost ${cheapest}.`;
  const fewest = [...found].sort((a, b) => a.measure.visited - b.measure.visited)[0];
  return `${lead} ${fewest.name} visited the fewest nodes (${fewest.measure.visited}).${missing.length ? ` ${missing.map((result) => result.name).join(", ")} found no route.` : ""}`;
}

interface GrowthProps { family: Family; ids: string[]; shape: SortShape; obstacles: GridObstacles; sortMetric: SortMetric; graphMetric: GraphMetric; scale: ChartScale }

function GrowthChart(props: GrowthProps) {
  // The chart is the slow part, so it follows the controls a moment later instead of blocking them.
  const deferred = useDeferredValue(props);
  const stale = deferred !== props;
  const { family, ids, shape, obstacles, sortMetric, graphMetric, scale } = deferred;
  const series = useMemo(() => family === "sorting" ? sortGrowth(ids, shape, sortMetric) : graphGrowth(ids, obstacles, graphMetric), [family, graphMetric, ids, obstacles, shape, sortMetric]);
  const shorts = new Map([...SORTING_ALGORITHMS, ...ROUTE_ALGORITHMS].map((algorithm) => [algorithm.id, algorithm.short]));
  const metricLabel = family === "sorting" ? SORT_METRICS[sortMetric] : GRAPH_METRICS[graphMetric];
  const xLabel = family === "sorting" ? "Numbers to sort" : "Map cells (side × side)";
  const sizes = family === "sorting" ? SORT_SIZES : MAP_SIDES.map((side) => side * side);
  const chartSeries = series.map((item) => ({ id: item.id, name: item.name, short: shorts.get(item.id), points: item.points.map((point) => ({ x: point.n, y: point.value })) }));
  const description = `${metricLabel} against ${xLabel.toLowerCase()}. ${series.map((item) => `${item.name} ends at ${formatNumber(item.points.at(-1)?.value ?? 0)}`).join("; ")}.`;
  const tip = family === "sorting" ? sortTip(ids, shape, sortMetric) : graphTip(ids, obstacles, graphMetric);
  return <div className={stale ? "algoviz-chart-wrap is-stale" : "algoviz-chart-wrap"} aria-busy={stale}>
    <LineChart series={chartSeries} xLabel={xLabel} yLabel={metricLabel} scale={scale} description={description} />
    {tip && <p className="algoviz-compare-note">{tip}</p>}
    <details className="algoviz-chart-data">
      <summary>Show the numbers behind the chart</summary>
      <div className="algoviz-table-wrap" role="region" aria-label="Chart data table" tabIndex={0}><table className="algoviz-table">
        <caption>{metricLabel} by {xLabel.toLowerCase()}</caption>
        <thead><tr><th scope="col">{family === "sorting" ? "Numbers" : "Cells"}</th>{series.map((item) => <th scope="col" key={item.id}>{item.name}</th>)}</tr></thead>
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
