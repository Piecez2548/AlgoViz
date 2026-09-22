import { ArrowLeft, GitCompareArrows, Route, Search, Sigma } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { runAStar, runDijkstra } from "../../algorithms/pathfinding/pathfindingAlgorithms";
import { runBfs, runDfs, runGreedyBestFirst } from "../../algorithms/search/searchAlgorithms";
import { runBubbleSort, runInsertionSort, runMergeSort, runQuickSort, runSelectionSort } from "../../algorithms/sorting/sortingAlgorithms";
import { AlgoVizLab, type LabOption } from "../components/AlgoVizLab";

const moduleContent = {
  search: { icon: Search, name: "Search algorithms", description: "Explore BFS, DFS, and Greedy Best-First Search step by step.", category: "search" as const, eyebrow: "Graph search lab", defaultAlgorithm: "bfs", options: [{ id: "bfs", name: "Breadth-First Search", run: runBfs }, { id: "dfs", name: "Depth-First Search", run: runDfs }, { id: "greedy-best-first", name: "Greedy Best-First Search", run: runGreedyBestFirst }] },
  pathfinding: { icon: Route, name: "Pathfinding", description: "Compare distance, heuristics, and shortest paths on the same weighted graph.", category: "pathfinding" as const, eyebrow: "Weighted graph lab", defaultAlgorithm: "dijkstra", options: [{ id: "dijkstra", name: "Dijkstra's Algorithm", run: runDijkstra }, { id: "a-star", name: "A* Search", run: runAStar }] },
  sorting: { icon: Sigma, name: "Sorting algorithms", description: "Watch comparisons and swaps turn an unsorted array into order.", category: "sorting" as const, eyebrow: "Array sorting lab", defaultAlgorithm: "bubble", options: [{ id: "bubble", name: "Bubble Sort", run: runBubbleSort }, { id: "selection", name: "Selection Sort", run: runSelectionSort }, { id: "insertion", name: "Insertion Sort", run: runInsertionSort }, { id: "merge", name: "Merge Sort", run: runMergeSort }, { id: "quick", name: "Quick Sort", run: runQuickSort }] },
  compare: { icon: GitCompareArrows, name: "Compare algorithms", description: "Run real executions against shared inputs and inspect the difference.", category: "compare" as const, eyebrow: "Comparison lab" },
} as const;

export default function AlgoVizModulePage() {
  const location = useLocation();
  const key = location.pathname.split("/").filter(Boolean).at(-1) as keyof typeof moduleContent;
  const module = moduleContent[key] ?? moduleContent.search;
  const Icon = module.icon;
  const requestedAlgorithm = new URLSearchParams(location.search).get("algorithm");
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
    {module.category === "compare" ? <CompareLab /> : <AlgoVizLab category={module.category} options={module.options as readonly LabOption[]} defaultAlgorithm={selectedAlgorithm} />}
  </div>;
}

function CompareLab() {
  const dijkstra = runDijkstra(); const aStar = runAStar();
  const dijkstraPath = dijkstra.steps.find((step) => step.type === "path")?.dataStructure?.[0]?.value ?? "—";
  const aStarPath = aStar.steps.find((step) => step.type === "path")?.dataStructure?.[0]?.value ?? "—";
  const lastMetric = (execution: typeof dijkstra) => Math.max(...execution.steps.map((step) => step.metrics?.visitedNodes ?? step.visited?.length ?? 0));
  return <section className="algoviz-compare-lab" aria-label="Algorithm comparison">
    <div className="algoviz-compare-summary"><div><span>Shared input</span><strong>Weighted graph · A → F</strong></div><div><span>Shortest path</span><strong>{dijkstraPath}</strong></div><div><span>Result</span><strong>Both reach the same optimum</strong></div></div>
    <div className="algoviz-compare-cards"><CompareCard name="Dijkstra's Algorithm" execution={dijkstra} metric={lastMetric(dijkstra)} path={dijkstraPath} /><CompareCard name="A* Search" execution={aStar} metric={lastMetric(aStar)} path={aStarPath} /></div>
    <p className="algoviz-compare-note">The counts above are generated from the recorded steps, so the comparison stays honest as the execution changes.</p>
  </section>;
}

function CompareCard({ name, execution, metric, path }: { name: string; execution: ReturnType<typeof runDijkstra>; metric: number; path: string | number }) {
  return <article className="algoviz-compare-card"><div><p className="algoviz-eyebrow">Recorded execution</p><h2>{name}</h2></div><div className="algoviz-compare-card-stats"><div><strong>{execution.steps.length}</strong><span>steps</span></div><div><strong>{metric}</strong><span>visited</span></div></div><p>Path <strong>{path}</strong></p><div className="algoviz-mini-progress"><span style={{ width: `${Math.min(100, (metric / 6) * 100)}%` }} /></div></article>;
}
