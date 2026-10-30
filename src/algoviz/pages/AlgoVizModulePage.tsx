import { ArrowLeft, GitCompareArrows, Route, Search, Sigma } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { pathCost, SAMPLE_GRAPH } from "../../algorithms/shared/graph";
import { runAStar, runDijkstra } from "../../algorithms/pathfinding/pathfindingAlgorithms";
import { runBfs, runDfs, runGreedyBestFirst } from "../../algorithms/search/searchAlgorithms";
import { runBubbleSort, runInsertionSort, runMergeSort, runQuickSort, runSelectionSort } from "../../algorithms/sorting/sortingAlgorithms";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import { parseNumberList } from "../../algorithms/shared/arrayInput";
import { AlgoVizLab, type ArrayLabOption, type GraphLabOption } from "../components/AlgoVizLab";

const moduleContent = {
  search: { icon: Search, name: "Search algorithms", description: "Explore BFS, DFS, and Greedy Best-First Search step by step.", category: "search" as const, eyebrow: "Graph search lab", defaultAlgorithm: "bfs", options: [{ id: "bfs", name: "Breadth-First Search", run: (graph: GraphInput) => runBfs(graph) }, { id: "dfs", name: "Depth-First Search", run: (graph: GraphInput) => runDfs(graph) }, { id: "greedy-best-first", name: "Greedy Best-First Search", run: (graph: GraphInput) => runGreedyBestFirst(graph) }] },
  pathfinding: { icon: Route, name: "Pathfinding", description: "Compare distance, heuristics, and shortest paths on the same weighted graph.", category: "pathfinding" as const, eyebrow: "Weighted graph lab", defaultAlgorithm: "dijkstra", options: [{ id: "dijkstra", name: "Dijkstra's Algorithm", run: (graph: GraphInput) => runDijkstra(graph) }, { id: "a-star", name: "A* Search", run: (graph: GraphInput) => runAStar(graph) }] },
  sorting: { icon: Sigma, name: "Sorting algorithms", description: "Watch comparisons and swaps turn an unsorted array into order.", category: "sorting" as const, eyebrow: "Array sorting lab", defaultAlgorithm: "bubble", options: [{ id: "bubble", name: "Bubble Sort", run: (values: readonly number[]) => runBubbleSort(values) }, { id: "selection", name: "Selection Sort", run: (values: readonly number[]) => runSelectionSort(values) }, { id: "insertion", name: "Insertion Sort", run: (values: readonly number[]) => runInsertionSort(values) }, { id: "merge", name: "Merge Sort", run: (values: readonly number[]) => runMergeSort(values) }, { id: "quick", name: "Quick Sort", run: (values: readonly number[]) => runQuickSort(values) }] },
  compare: { icon: GitCompareArrows, name: "Compare algorithms", description: "Run real executions against shared inputs and inspect the difference.", category: "compare" as const, eyebrow: "Comparison lab" },
} as const;

export default function AlgoVizModulePage() {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const updateParams = (name: string, value: string) => setSearchParams((previous) => { const params = new URLSearchParams(previous); params.set(name, value); return params; }, { replace: true });
  const key = location.pathname.split("/").filter(Boolean).at(-1) as keyof typeof moduleContent;
  const module = moduleContent[key] ?? moduleContent.search;
  const Icon = module.icon;
  const requestedAlgorithm = new URLSearchParams(location.search).get("algorithm");
  const sharedValues = new URLSearchParams(location.search).get("values");
  const initialValues = sharedValues ? parseNumberList(sharedValues).values : undefined;
  const selectedAlgorithm = "options" in module
    ? module.options.find((option) => option.id === requestedAlgorithm)?.id ?? module.defaultAlgorithm
    : "";
  return <div className="algoviz-page algoviz-module-page">
    <section className="algoviz-module-hero">
      <Link className="algoviz-back-link" to=""><ArrowLeft size={16} /> Back to Learn</Link>
      <span className="algoviz-module-icon" aria-hidden="true"><Icon size={28} /></span>
      <p className="algoviz-eyebrow">{module.eyebrow}</p>
      <h1>{module.name}</h1>
      <p className="algoviz-module-lede">{module.description}</p>
    </section>
    {module.category === "compare" ? <CompareLab /> : module.category === "sorting"
      ? <AlgoVizLab category="sorting" options={module.options as readonly ArrayLabOption[]} defaultAlgorithm={selectedAlgorithm} initialValues={initialValues} onValuesChange={(values) => updateParams("values", values.join(","))} onAlgorithmChange={(id) => updateParams("algorithm", id)} />
      : <AlgoVizLab category={module.category} options={module.options as readonly GraphLabOption[]} defaultAlgorithm={selectedAlgorithm} onAlgorithmChange={(id) => updateParams("algorithm", id)} />}
  </div>;
}

function CompareLab() {
  const dijkstra = runDijkstra(); const aStar = runAStar();
  const dijkstraPath = dijkstra.steps.find((step) => step.type === "path")?.dataStructure?.[0]?.value ?? "—";
  const aStarPath = aStar.steps.find((step) => step.type === "path")?.dataStructure?.[0]?.value ?? "—";
  const costOf = (path: string | number) => pathCost(SAMPLE_GRAPH, String(path).split(" → "));
  const sameCost = costOf(dijkstraPath) === costOf(aStarPath);
  // Derived from the recorded executions rather than asserted.
  const verdict = dijkstraPath === "—" || aStarPath === "—" ? "No path found" : sameCost ? (dijkstraPath === aStarPath ? "Both reach the same optimum" : "Different paths, same cost") : "Paths differ in cost";
  const lastMetric = (execution: typeof dijkstra) => Math.max(...execution.steps.map((step) => step.metrics?.visitedNodes ?? step.visited?.length ?? 0));
  return <section className="algoviz-compare-lab" aria-label="Algorithm comparison">
    <div className="algoviz-compare-summary"><div><span>Shared input</span><strong>Weighted graph · A → F</strong></div><div><span>Shortest path</span><strong>{dijkstraPath}</strong></div><div><span>Result</span><strong>{verdict}</strong></div></div>
    <div className="algoviz-compare-cards"><CompareCard name="Dijkstra's Algorithm" execution={dijkstra} metric={lastMetric(dijkstra)} path={dijkstraPath} /><CompareCard name="A* Search" execution={aStar} metric={lastMetric(aStar)} path={aStarPath} /></div>
    <p className="algoviz-compare-note">The counts above are generated from the recorded steps, so the comparison stays honest as the execution changes.</p>
  </section>;
}

function CompareCard({ name, execution, metric, path }: { name: string; execution: ReturnType<typeof runDijkstra>; metric: number; path: string | number }) {
  return <article className="algoviz-compare-card"><div><p className="algoviz-eyebrow">Recorded execution</p><h2>{name}</h2></div><div className="algoviz-compare-card-stats"><div><strong>{execution.steps.length}</strong><span>steps</span></div><div><strong>{metric}</strong><span>visited</span></div></div><p>Path <strong>{path}</strong></p><div className="algoviz-mini-progress"><span style={{ width: `${Math.min(100, (metric / 6) * 100)}%` }} /></div></article>;
}
