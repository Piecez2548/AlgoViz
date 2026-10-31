import { useCallback, useMemo, useRef } from "react";
import type { GraphInput } from "../../algorithms/shared/graphTypes";
import { ArrowLeft, GitCompareArrows, Link2, ListFilter, Network, Route, Search, ListOrdered, Shapes, Sigma, TrendingDown, Waves } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ARRAY_SEARCH_ALGORITHMS, COMPONENT_ALGORITHMS, FLOW_ALGORITHMS, MATCHING_ALGORITHMS, NEGATIVE_ALGORITHMS, ORDERING_ALGORITHMS, PATHFINDING_ALGORITHMS, SEARCH_ALGORITHMS, SORTING_ALGORITHMS, SPANNING_ALGORITHMS } from "../../algorithms/registry";
import { parseNumberList } from "../../algorithms/shared/arrayInput";
import { decodeGraph, encodeGraph } from "../../algorithms/shared/graphCodec";
import { AlgoVizLab } from "../components/AlgoVizLab";
import { CompareLab, parseFamily } from "../components/CompareLab";

const moduleContent = {
  search: { icon: Search, name: "Search algorithms", description: "Explore BFS, DFS, bidirectional BFS, and Greedy Best-First Search step by step.", category: "search" as const, eyebrow: "Graph search lab", defaultAlgorithm: "bfs", options: SEARCH_ALGORITHMS },
  pathfinding: { icon: Route, name: "Pathfinding", description: "Compare distance, heuristics, and shortest paths on the same weighted graph, or on a map you draw.", category: "pathfinding" as const, eyebrow: "Weighted graph lab", defaultAlgorithm: "dijkstra", options: PATHFINDING_ALGORITHMS },
  spanning: { icon: Network, name: "Spanning trees", description: "Connect every node with the least total weight, one edge at a time.", category: "spanning" as const, eyebrow: "Minimum spanning tree lab", defaultAlgorithm: "kruskal", options: SPANNING_ALGORITHMS },
  sorting: { icon: Sigma, name: "Sorting algorithms", description: "Watch comparisons and swaps turn an unsorted array into order.", category: "sorting" as const, eyebrow: "Array sorting lab", defaultAlgorithm: "bubble", options: SORTING_ALGORITHMS },
  "array-search": { icon: ListFilter, name: "Array search", description: "Find a value in a sorted list: check every item, or halve the range with each look.", category: "array-search" as const, eyebrow: "List search lab", defaultAlgorithm: "binary-search", options: ARRAY_SEARCH_ALGORITHMS },
  "negative-weights": { icon: TrendingDown, name: "Negative edges", description: "Shortest paths on a directed graph where some edges have negative weights, and what happens when a loop of them makes every lap cheaper.", category: "negative" as const, eyebrow: "Directed graph lab", defaultAlgorithm: "bellman-ford", options: NEGATIVE_ALGORITHMS },
  "topological-sort": { icon: ListOrdered, name: "Topological sort", description: "Put tasks in an order where every task comes after the ones it depends on, and see what happens when the dependencies loop.", category: "ordering" as const, eyebrow: "Dependency ordering lab", defaultAlgorithm: "kahn", options: ORDERING_ALGORITHMS },
  "strongly-connected": { icon: Shapes, name: "Strongly connected components", description: "Split a directed graph into groups of nodes that can all reach each other, with the edges between groups only going one way.", category: "components" as const, eyebrow: "Directed graph lab", defaultAlgorithm: "tarjan", options: COMPONENT_ALGORITHMS },
  "max-flow": { icon: Waves, name: "Maximum flow", description: "How much can a network of one-way pipes carry from a source to a sink? Find paths with room left, send flow, and see the narrowest cut that limits it all.", category: "flow" as const, eyebrow: "Flow network lab", defaultAlgorithm: "edmonds-karp", options: FLOW_ALGORITHMS },
  matching: { icon: Link2, name: "Bipartite matching", description: "Pair up the nodes on one side with nodes on the other, with each node used at most once, and see why handing out first choices is not always enough.", category: "matching" as const, eyebrow: "Matching lab", defaultAlgorithm: "kuhn", options: MATCHING_ALGORITHMS },
  compare: { icon: GitCompareArrows, name: "Compare algorithms", description: "Run several algorithms on the same input, then see how each one's cost grows as the input gets bigger.", category: "compare" as const, eyebrow: "Comparison lab" },
} as const;

export default function AlgoVizModulePage() {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  // Several parts of a page can change the link in the same moment (the family, then your graph a moment later), so
  // every change starts from the newest link rather than from the one this render saw.
  const latestSearch = useRef(location.search);
  latestSearch.current = location.search;
  const updateParams = useCallback((name: string, value: string | null) => {
    const params = new URLSearchParams(latestSearch.current);
    if (value === null) params.delete(name); else params.set(name, value);
    const next = params.toString();
    if (next === new URLSearchParams(latestSearch.current).toString()) return;
    latestSearch.current = next;
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);
  const key = location.pathname.split("/").filter(Boolean).at(-1) as keyof typeof moduleContent;
  const module = moduleContent[key] ?? moduleContent.search;
  const Icon = module.icon;
  const requestedAlgorithm = new URLSearchParams(location.search).get("algorithm");
  const sharedValues = new URLSearchParams(location.search).get("values");
  const initialValues = sharedValues ? parseNumberList(sharedValues).values : undefined;
  const requestedTarget = Number(new URLSearchParams(location.search).get("target"));
  const initialTarget = Number.isInteger(requestedTarget) && requestedTarget >= 1 && requestedTarget <= 999 ? requestedTarget : undefined;
  const initialGraph = useMemo(() => decodeGraph(new URLSearchParams(location.search).get("graph")), []); // eslint-disable-line react-hooks/exhaustive-deps
  const onGraphChange = useCallback((graph: GraphInput | null) => updateParams("graph", graph ? encodeGraph(graph) : null), [updateParams]);
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
    {module.category === "compare" ? <CompareLab initialValues={initialValues} onValuesChange={(values) => updateParams("values", values.join(","))} initialFamily={parseFamily(new URLSearchParams(location.search).get("family"))} onFamilyChange={(family) => updateParams("family", family)} initialTarget={initialTarget} onTargetChange={(next) => updateParams("target", String(next))} initialGraph={initialGraph} onGraphChange={onGraphChange} /> : module.category === "sorting"
      ? <AlgoVizLab category="sorting" options={module.options} defaultAlgorithm={selectedAlgorithm} initialValues={initialValues} onValuesChange={(values) => updateParams("values", values.join(","))} onAlgorithmChange={(id) => updateParams("algorithm", id)} />
      : module.category === "array-search"
        ? <AlgoVizLab category="array-search" options={module.options} defaultAlgorithm={selectedAlgorithm} initialValues={initialValues} initialTarget={initialTarget} onValuesChange={(values) => updateParams("values", values.join(","))} onTargetChange={(target) => updateParams("target", String(target))} onAlgorithmChange={(id) => updateParams("algorithm", id)} />
      : <AlgoVizLab category={module.category} options={module.options} defaultAlgorithm={selectedAlgorithm} initialGraph={initialGraph} onGraphChange={onGraphChange} onAlgorithmChange={(id) => updateParams("algorithm", id)} />}
  </div>;
}
