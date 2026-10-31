import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, GitCompareArrows, Link2, ListOrdered, Network, Pause, Play, Route, Search, Shapes, TrendingDown, Waves } from "lucide-react";
import { Link } from "react-router-dom";

import type { AlgorithmDefinition } from "@/algorithms/shared/types";
import { useT } from "../preferences";

const categories: AlgorithmDefinition[] = [
  {
    id: "search",
    name: "Search",
    category: "search",
    summary: "Trace how a graph is explored, one decision at a time.",
    status: "available",
  },
  {
    id: "pathfinding",
    name: "Pathfinding",
    category: "pathfinding",
    summary: "See distance, heuristics, and shortest paths evolve in real time.",
    status: "available",
  },
  {
    id: "spanning",
    name: "Spanning trees",
    category: "spanning",
    summary: "Connect every node with the least total weight.",
    status: "available",
  },
  {
    id: "sorting",
    name: "Sorting",
    category: "sorting",
    summary: "Watch comparisons and swaps turn an array into order.",
    status: "available",
  },
  {
    id: "array-search",
    name: "Array search",
    category: "array-search",
    summary: "Find a value in a list: look at every item, or halve the range each time.",
    status: "available",
  },
  {
    id: "negative-weights",
    name: "Negative edges",
    category: "negative-weights",
    summary: "Directed graphs with negative weights, and the negative cycle that breaks shortest paths.",
    status: "available",
  },
  {
    id: "topological-sort",
    name: "Topological sort",
    category: "topological-sort",
    summary: "Order tasks so each one comes after what it depends on, and catch dependency loops.",
    status: "available",
  },
  {
    id: "strongly-connected",
    name: "Strongly connected components",
    category: "strongly-connected",
    summary: "Find the groups of nodes in a directed graph that can all reach each other.",
    status: "available",
  },
  {
    id: "max-flow",
    name: "Maximum flow",
    category: "max-flow",
    summary: "Push as much as a network of pipes can carry, and find the narrowest cut that limits it.",
    status: "available",
  },
  {
    id: "matching",
    name: "Bipartite matching",
    category: "matching",
    summary: "Pair people with jobs so nobody is used twice, and see why first choices are not enough.",
    status: "available",
  },
];

const algorithmCatalog = [
  { id: "bfs", name: "Breadth-First Search", shortName: "BFS", category: "search", complexity: "O(V + E)", summary: "Explore level by level with a queue." },
  { id: "dfs", name: "Depth-First Search", shortName: "DFS", category: "search", complexity: "O(V + E)", summary: "Go deep before backtracking with a stack." },
  { id: "bidirectional-bfs", name: "Bidirectional BFS", shortName: "Bi-BFS", category: "search", complexity: "O(b^(d/2))", summary: "Search from both ends and stop where the two searches meet." },
  { id: "greedy-best-first", name: "Greedy Best-First Search", shortName: "GBFS", category: "search", complexity: "Heuristic", summary: "Choose the frontier node that looks closest." },
  { id: "dijkstra", name: "Dijkstra's Algorithm", shortName: "Dijkstra", category: "pathfinding", complexity: "O((V + E) log V)", summary: "Relax edges to find shortest weighted paths." },
  { id: "a-star", name: "A* Search", shortName: "A*", category: "pathfinding", complexity: "O((V + E) log V)", summary: "Combine cost-so-far with a heuristic." },
  { id: "bellman-ford", name: "Bellman-Ford", shortName: "Bellman-Ford", category: "pathfinding", complexity: "O(V · E)", summary: "Sweep every edge until no distance improves." },
  { id: "floyd-warshall", name: "Floyd-Warshall", shortName: "Floyd-Warshall", category: "pathfinding", complexity: "O(V³)", summary: "Try every node as a stop-over to get all-pairs shortest paths." },
  { id: "kruskal", name: "Kruskal's Algorithm", shortName: "Kruskal", category: "spanning", complexity: "O(E log E)", summary: "Keep the lightest edges that never close a loop." },
  { id: "prim", name: "Prim's Algorithm", shortName: "Prim", category: "spanning", complexity: "O(V · E)", summary: "Grow one tree outward by always taking the lightest edge that leaves it." },
  { id: "kahn", name: "Kahn's Algorithm", shortName: "Kahn", category: "topological-sort", complexity: "O(V + E)", summary: "Place tasks that wait for nothing, then release the ones waiting on them." },
  { id: "dfs-topological", name: "Depth-First Ordering", shortName: "DFS order", category: "topological-sort", complexity: "O(V + E)", summary: "Explore dependencies depth-first and place each task as it finishes." },
  { id: "tarjan", name: "Tarjan's Algorithm", shortName: "Tarjan", category: "strongly-connected", complexity: "O(V + E)", summary: "One depth-first search with numbers and lowlinks finds every component." },
  { id: "kosaraju", name: "Kosaraju's Algorithm", shortName: "Kosaraju", category: "strongly-connected", complexity: "O(V + E)", summary: "Search forward for a finish order, then search backwards to split the groups." },
  { id: "edmonds-karp", name: "Edmonds-Karp", shortName: "Edmonds-Karp", category: "max-flow", complexity: "O(V · E²)", summary: "Always augment along the path with the fewest edges." },
  { id: "ford-fulkerson", name: "Ford-Fulkerson", shortName: "Ford-Fulkerson", category: "max-flow", complexity: "O(E · flow)", summary: "Augment along the first path found, depth-first." },
  { id: "kuhn", name: "Kuhn's Algorithm", shortName: "Kuhn", category: "matching", complexity: "O(V · E)", summary: "Find augmenting paths that free up a partner and flip a chain of pairs." },
  { id: "hopcroft-karp", name: "Hopcroft-Karp", shortName: "HK", category: "matching", complexity: "O(E · √V)", summary: "Flip many shortest augmenting paths in each phase instead of one search per node." },
  { id: "greedy-matching", name: "Greedy Matching", shortName: "Greedy", category: "matching", complexity: "O(E)", summary: "Take the first free partner and never change a pair." },
  { id: "bubble", name: "Bubble Sort", shortName: "Bubble", category: "sorting", complexity: "O(n²)", summary: "Bubble the largest values to the end." },
  { id: "selection", name: "Selection Sort", shortName: "Selection", category: "sorting", complexity: "O(n²)", summary: "Select the next smallest value." },
  { id: "insertion", name: "Insertion Sort", shortName: "Insertion", category: "sorting", complexity: "O(n²)", summary: "Insert each value into a sorted prefix." },
  { id: "shell", name: "Shell Sort", shortName: "Shell", category: "sorting", complexity: "O(n²) worst", summary: "Insertion sort on values a shrinking gap apart." },
  { id: "counting", name: "Counting Sort", shortName: "Counting", category: "sorting", complexity: "O(n + k)", summary: "Count each value, then write them back in order. No comparisons." },
  { id: "radix", name: "Radix Sort", shortName: "Radix", category: "sorting", complexity: "O(d · n)", summary: "Sort digit by digit with buckets, from the ones digit up." },
  { id: "merge", name: "Merge Sort", shortName: "Merge", category: "sorting", complexity: "O(n log n)", summary: "Divide, sort, and merge ordered runs." },
  { id: "quick", name: "Quick Sort", shortName: "Quick", category: "sorting", complexity: "O(n log n)", summary: "Partition around a pivot and recurse." },
  { id: "heap", name: "Heap Sort", shortName: "Heap", category: "sorting", complexity: "O(n log n)", summary: "Build a heap, then pull out the largest value each time." },
  { id: "binary-search", name: "Binary search", shortName: "Binary", category: "array-search", complexity: "O(log n)", summary: "Halve the range of a sorted list with every look." },
  { id: "linear-search", name: "Linear search", shortName: "Linear", category: "array-search", complexity: "O(n)", summary: "Check every value from the left until it turns up." },
] as const;

const catalogGroups: { label: string; categories: string[] }[] = [
  { label: "Graphs", categories: ["search", "pathfinding", "spanning", "negative-weights", "topological-sort", "strongly-connected"] },
  { label: "Sorting and searching", categories: ["sorting", "array-search"] },
  { label: "Flow and matching", categories: ["max-flow", "matching"] },
];

function ExecutionPreview() {
  const t = useT();
  const previewSteps = [
    { node: "A", queue: "[B, C]", action: "Starting at A", explanation: "A is the starting node. Its neighbors become the first frontier to explore." },
    { node: "B", queue: "[C, D]", action: "Visiting B", explanation: "B is the next node in the queue. Its neighbors are added to the frontier for the next level." },
    { node: "C", queue: "[D, E]", action: "Visiting C", explanation: "C is now the next node to inspect. The queue preserves a level-by-level order." },
  ] as const;
  const [previewStep, setPreviewStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const current = previewSteps[previewStep];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setPreviewStep((step) => (step + 1) % previewSteps.length);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, previewSteps.length]);

  const movePreview = (direction: -1 | 1) => {
    setPreviewStep((step) => (step + direction + previewSteps.length) % previewSteps.length);
    setIsPlaying(false);
  };

  return (
    <div className="algoviz-preview" aria-label={t("Illustrative graph execution preview")}>
      <div className="algoviz-preview-toolbar">
        <span><span className="algoviz-live-dot" aria-hidden="true" /> {t("Illustrative execution preview")}</span>
        <span className="algoviz-preview-step">{t("Step")} 0{previewStep + 1} <span>/</span> 03</span>
      </div>
      <div className="algoviz-preview-body">
        <div className="algoviz-graph" aria-hidden="true">
          <svg className="algoviz-graph-lines" viewBox="0 0 480 280" preserveAspectRatio="none">
            <path d="M84 65 L238 44 L392 84 M84 65 L160 188 L302 156 L392 84 M160 188 L302 236 L392 84" />
          </svg>
          <span className={`algoviz-node node-a ${current.node === "A" ? "is-current" : ""}`}>A</span>
          <span className={`algoviz-node node-b ${current.node === "B" ? "is-current" : "is-visited"}`}>B</span>
          <span className={`algoviz-node node-c ${current.node === "C" ? "is-current" : "is-frontier"}`}>C</span>
          <span className="algoviz-node node-d is-visited">D</span>
          <span className="algoviz-node node-e is-goal">E</span>
        </div>
        <aside className="algoviz-step-note">
          <span className="algoviz-note-label">{t("Current action")}</span>
          <strong>{current.action}</strong>
          <p>{current.explanation}</p>
          <div className="algoviz-note-meta"><span>{t("Queue")}</span><code>{current.queue}</code></div>
        </aside>
      </div>
      <div className="algoviz-preview-controls" aria-label={t("Preview controls")}>
        <button type="button" aria-label={t("Previous preview step")} onClick={() => movePreview(-1)}><span aria-hidden="true">←</span></button>
        <button type="button" className="is-play" aria-label={t(isPlaying ? "Pause preview" : "Play preview")} onClick={() => setIsPlaying((playing) => !playing)}>
          {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>
        <button type="button" aria-label={t("Next preview step")} onClick={() => movePreview(1)}><span aria-hidden="true">→</span></button>
        <span className="algoviz-control-rule" />
        <span>{t("Preview")} <b>{t(isPlaying ? "Playing" : "Ready")}</b></span>
      </div>
    </div>
  );
}

export default function AlgoVizHomePage() {
  const t = useT();
  return (
    <div className="algoviz-page algoviz-home-page">
      <section className="algoviz-hero">
        <div className="algoviz-hero-copy">
          <p className="algoviz-eyebrow">{t("Interactive algorithm lab")} <span aria-hidden="true">/</span> 01</p>
          <h1>{t("See algorithms")} <em>{t("think.")}</em></h1>
          <p className="algoviz-hero-lede">{t("Explore algorithms step by step and understand not only what they do, but why they do it.")}</p>
          <div className="algoviz-hero-actions">
            <Link className="algoviz-button algoviz-button-primary" to="/search">{t("Start visualizing")} <ArrowRight size={17} /></Link>
            <Link className="algoviz-button algoviz-button-secondary" to="/compare"><GitCompareArrows size={17} /> {t("Compare algorithms")}</Link>
          </div>
          <p className="algoviz-hero-footnote"><span aria-hidden="true">↳</span> {t("No sign-up. No backend. Just the next step.")}</p>
        </div>
        <ExecutionPreview />
      </section>

      <section className="algoviz-section algoviz-explore-section" id="explore" aria-labelledby="explore-heading">
        <div className="algoviz-section-heading">
          <div>
            <p className="algoviz-eyebrow">{t("Choose your lens")}</p>
            <h2 id="explore-heading">{t("Start with a question.")}</h2>
          </div>
          <p>{t("Every visualization will expose the decision, the data structure behind it, and the change it caused.")}</p>
        </div>
        <div className="algoviz-category-list">
          {categories.map((category, index) => (
            <Link className="algoviz-category-row" to={`/${category.category}`} key={category.id}>
              <span className={`algoviz-category-icon icon-${category.category}`} aria-hidden="true">
                {index === 0 && <BookOpen size={20} />}
                {index === 1 && <Route size={20} />}
                {index === 2 && <Network size={20} />}
                {index === 3 && <BarChart3 size={20} />}
                {index === 4 && <Search size={20} />}
                {index === 5 && <TrendingDown size={20} />}
                {index === 6 && <ListOrdered size={20} />}
                {index === 7 && <Shapes size={20} />}
                {index === 8 && <Waves size={20} />}
                {index === 9 && <Link2 size={20} />}
              </span>
              <span className="algoviz-category-index">0{index + 1}</span>
              <span className="algoviz-category-copy"><strong>{t(category.name)}</strong><span>{t(category.summary)}</span></span>
              <span className="algoviz-category-status">{t(category.status === "planned" ? "Planned" : "Live lab")} <ArrowRight size={17} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="algoviz-section algoviz-catalog-section" aria-labelledby="catalog-heading">
        <div className="algoviz-section-heading">
          <div>
            <p className="algoviz-eyebrow">{t("Algorithm catalog")}</p>
            <h2 id="catalog-heading">{t("The growing algorithm set.")}</h2>
          </div>
          <p>{t("Thirty algorithms for teaching graph search, shortest paths, spanning trees, sorting, flow, matching, and searching lists with the same step-by-step contract.")}</p>
        </div>
        {catalogGroups.map((group) => {
          const cards = algorithmCatalog.filter((algorithm) => group.categories.includes(algorithm.category));
          return (
            <div className="algoviz-catalog-group" key={group.label}>
              <h3 className="algoviz-catalog-group-title">{t(group.label)} <span>{cards.length}</span></h3>
              <div className="algoviz-catalog-grid">
                {cards.map((algorithm) => (
                  <Link className="algoviz-catalog-card" to={`/${algorithm.category}?algorithm=${algorithm.id}`} key={algorithm.shortName}>
                    <span className="algoviz-catalog-number">{String(algorithmCatalog.indexOf(algorithm) + 1).padStart(2, "0")}</span>
                    <span className={`algoviz-catalog-tag icon-${algorithm.category}`}>{algorithm.shortName}</span>
                    <strong>{algorithm.name}</strong>
                    <span>{t(algorithm.summary)}</span>
                    <code>{algorithm.complexity}</code>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="algoviz-workflow-section" aria-labelledby="workflow-heading">
        <div className="algoviz-workflow-intro">
          <p className="algoviz-eyebrow">{t("The learning loop")}</p>
          <h2 id="workflow-heading">{t("From curiosity to clarity.")}</h2>
          <p>{t("AlgoViz is built around the moment an abstract rule finally becomes a visible decision.")}</p>
        </div>
        <ol className="algoviz-workflow-list">
          {['Choose', 'Visualize', 'Step through', 'Understand', 'Compare'].map((step, index) => (
            <li key={step}>
              <span>0{index + 1}</span>
              <strong>{t(step)}</strong>
              {index < 4 && <ArrowRight size={17} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
