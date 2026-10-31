import { useCallback, useMemo } from "react";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import { ArrowLeft, GitCompareArrows, ListFilter, Network, Route, Search, ListOrdered, Sigma, TrendingDown } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ARRAY_SEARCH_ALGORITHMS, NEGATIVE_ALGORITHMS, ORDERING_ALGORITHMS, PATHFINDING_ALGORITHMS, SEARCH_ALGORITHMS, SORTING_ALGORITHMS, SPANNING_ALGORITHMS } from "../../algorithms/registry";
import { parseNumberList } from "../../algorithms/shared/arrayInput";
import { decodeGraph, encodeGraph } from "../../algorithms/shared/graphCodec";
import { AlgoVizLab } from "../components/AlgoVizLab";
import { CompareLab } from "../components/CompareLab";

const moduleContent = {
  search: { icon: Search, name: "Search algorithms", description: "Explore BFS, DFS, bidirectional BFS, and Greedy Best-First Search step by step.", category: "search" as const, eyebrow: "Graph search lab", defaultAlgorithm: "bfs", options: SEARCH_ALGORITHMS },
  pathfinding: { icon: Route, name: "Pathfinding", description: "Compare distance, heuristics, and shortest paths on the same weighted graph, or on a map you draw.", category: "pathfinding" as const, eyebrow: "Weighted graph lab", defaultAlgorithm: "dijkstra", options: PATHFINDING_ALGORITHMS },
  spanning: { icon: Network, name: "Spanning trees", description: "Connect every node with the least total weight, one edge at a time.", category: "spanning" as const, eyebrow: "Minimum spanning tree lab", defaultAlgorithm: "kruskal", options: SPANNING_ALGORITHMS },
  sorting: { icon: Sigma, name: "Sorting algorithms", description: "Watch comparisons and swaps turn an unsorted array into order.", category: "sorting" as const, eyebrow: "Array sorting lab", defaultAlgorithm: "bubble", options: SORTING_ALGORITHMS },
  "array-search": { icon: ListFilter, name: "Array search", description: "Find a value in a sorted list: check every item, or halve the range with each look.", category: "array-search" as const, eyebrow: "List search lab", defaultAlgorithm: "binary-search", options: ARRAY_SEARCH_ALGORITHMS },
  "negative-weights": { icon: TrendingDown, name: "Negative edges", description: "Shortest paths on a directed graph where some edges have negative weights, and what happens when a loop of them makes every lap cheaper.", category: "negative" as const, eyebrow: "Directed graph lab", defaultAlgorithm: "bellman-ford", options: NEGATIVE_ALGORITHMS },
  "topological-sort": { icon: ListOrdered, name: "Topological sort", description: "Put tasks in an order where every task comes after the ones it depends on, and see what happens when the dependencies loop.", category: "ordering" as const, eyebrow: "Dependency ordering lab", defaultAlgorithm: "kahn", options: ORDERING_ALGORITHMS },
  compare: { icon: GitCompareArrows, name: "Compare algorithms", description: "Run several algorithms on the same input, then see how each one's cost grows as the input gets bigger.", category: "compare" as const, eyebrow: "Comparison lab" },
} as const;

export default function AlgoVizModulePage() {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const updateParams = (name: string, value: string | null) => setSearchParams((previous) => {
    const params = new URLSearchParams(previous);
    if (value === null) params.delete(name); else params.set(name, value);
    return params.toString() === previous.toString() ? previous : params;
  }, { replace: true });
  const key = location.pathname.split("/").filter(Boolean).at(-1) as keyof typeof moduleContent;
  const module = moduleContent[key] ?? moduleContent.search;
  const Icon = module.icon;
  const requestedAlgorithm = new URLSearchParams(location.search).get("algorithm");
  const sharedValues = new URLSearchParams(location.search).get("values");
  const initialValues = sharedValues ? parseNumberList(sharedValues).values : undefined;
  const requestedTarget = Number(new URLSearchParams(location.search).get("target"));
  const initialTarget = Number.isInteger(requestedTarget) && requestedTarget >= 1 && requestedTarget <= 999 ? requestedTarget : undefined;
  const initialGraph = useMemo(() => decodeGraph(new URLSearchParams(location.search).get("graph")), []); // eslint-disable-line react-hooks/exhaustive-deps
  const onGraphChange = useCallback((graph: GraphInput | null) => updateParams("graph", graph ? encodeGraph(graph) : null), []); // eslint-disable-line react-hooks/exhaustive-deps
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
    {module.category === "compare" ? <CompareLab initialValues={initialValues} onValuesChange={(values) => updateParams("values", values.join(","))} /> : module.category === "sorting"
      ? <AlgoVizLab category="sorting" options={module.options} defaultAlgorithm={selectedAlgorithm} initialValues={initialValues} onValuesChange={(values) => updateParams("values", values.join(","))} onAlgorithmChange={(id) => updateParams("algorithm", id)} />
      : module.category === "array-search"
        ? <AlgoVizLab category="array-search" options={module.options} defaultAlgorithm={selectedAlgorithm} initialValues={initialValues} initialTarget={initialTarget} onValuesChange={(values) => updateParams("values", values.join(","))} onTargetChange={(target) => updateParams("target", String(target))} onAlgorithmChange={(id) => updateParams("algorithm", id)} />
      : <AlgoVizLab category={module.category} options={module.options} defaultAlgorithm={selectedAlgorithm} initialGraph={initialGraph} onGraphChange={onGraphChange} onAlgorithmChange={(id) => updateParams("algorithm", id)} />}
  </div>;
}
