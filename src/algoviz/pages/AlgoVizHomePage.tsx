import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, GitCompareArrows, Pause, Play, Route } from "lucide-react";
import { Link } from "react-router-dom";

import type { AlgorithmDefinition } from "@/algorithms/shared/types";

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
    id: "sorting",
    name: "Sorting",
    category: "sorting",
    summary: "Watch comparisons and swaps turn an array into order.",
    status: "available",
  },
];

const algorithmCatalog = [
  { id: "bfs", name: "Breadth-First Search", shortName: "BFS", category: "search", complexity: "O(V + E)", summary: "Explore level by level with a queue." },
  { id: "dfs", name: "Depth-First Search", shortName: "DFS", category: "search", complexity: "O(V + E)", summary: "Go deep before backtracking with a stack." },
  { id: "greedy-best-first", name: "Greedy Best-First Search", shortName: "GBFS", category: "search", complexity: "Heuristic", summary: "Choose the frontier node that looks closest." },
  { id: "dijkstra", name: "Dijkstra's Algorithm", shortName: "Dijkstra", category: "pathfinding", complexity: "O((V + E) log V)", summary: "Relax edges to find shortest weighted paths." },
  { id: "a-star", name: "A* Search", shortName: "A*", category: "pathfinding", complexity: "O((V + E) log V)", summary: "Combine cost-so-far with a heuristic." },
  { id: "bubble", name: "Bubble Sort", shortName: "Bubble", category: "sorting", complexity: "O(n²)", summary: "Bubble the largest values to the end." },
  { id: "selection", name: "Selection Sort", shortName: "Selection", category: "sorting", complexity: "O(n²)", summary: "Select the next smallest value." },
  { id: "insertion", name: "Insertion Sort", shortName: "Insertion", category: "sorting", complexity: "O(n²)", summary: "Insert each value into a sorted prefix." },
  { id: "merge", name: "Merge Sort", shortName: "Merge", category: "sorting", complexity: "O(n log n)", summary: "Divide, sort, and merge ordered runs." },
  { id: "quick", name: "Quick Sort", shortName: "Quick", category: "sorting", complexity: "O(n log n)", summary: "Partition around a pivot and recurse." },
] as const;

function ExecutionPreview() {
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
    <div className="algoviz-preview" aria-label="Illustrative graph execution preview">
      <div className="algoviz-preview-toolbar">
        <span><span className="algoviz-live-dot" aria-hidden="true" /> Illustrative execution preview</span>
        <span className="algoviz-preview-step">Step 0{previewStep + 1} <span>/</span> 03</span>
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
          <span className="algoviz-note-label">Current action</span>
          <strong>{current.action}</strong>
          <p>{current.explanation}</p>
          <div className="algoviz-note-meta"><span>Queue</span><code>{current.queue}</code></div>
        </aside>
      </div>
      <div className="algoviz-preview-controls" aria-label="Preview controls">
        <button type="button" aria-label="Previous preview step" onClick={() => movePreview(-1)}><span aria-hidden="true">←</span></button>
        <button type="button" className="is-play" aria-label={isPlaying ? "Pause preview" : "Play preview"} onClick={() => setIsPlaying((playing) => !playing)}>
          {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>
        <button type="button" aria-label="Next preview step" onClick={() => movePreview(1)}><span aria-hidden="true">→</span></button>
        <span className="algoviz-control-rule" />
        <span>Preview <b>{isPlaying ? "Playing" : "Ready"}</b></span>
      </div>
    </div>
  );
}

export default function AlgoVizHomePage() {
  return (
    <div className="algoviz-page algoviz-home-page">
      <section className="algoviz-hero">
        <div className="algoviz-hero-copy">
          <p className="algoviz-eyebrow">Interactive algorithm lab <span aria-hidden="true">/</span> 01</p>
          <h1>See algorithms <em>think.</em></h1>
          <p className="algoviz-hero-lede">Explore algorithms step by step and understand not only what they do, but why they do it.</p>
          <div className="algoviz-hero-actions">
            <Link className="algoviz-button algoviz-button-primary" to="/search">Start visualizing <ArrowRight size={17} /></Link>
            <Link className="algoviz-button algoviz-button-secondary" to="/compare"><GitCompareArrows size={17} /> Compare algorithms</Link>
          </div>
          <p className="algoviz-hero-footnote"><span aria-hidden="true">↳</span> No sign-up. No backend. Just the next step.</p>
        </div>
        <ExecutionPreview />
      </section>

      <section className="algoviz-section algoviz-explore-section" id="explore" aria-labelledby="explore-heading">
        <div className="algoviz-section-heading">
          <div>
            <p className="algoviz-eyebrow">Choose your lens</p>
            <h2 id="explore-heading">Start with a question.</h2>
          </div>
          <p>Every visualization will expose the decision, the data structure behind it, and the change it caused.</p>
        </div>
        <div className="algoviz-category-list">
          {categories.map((category, index) => (
            <Link className="algoviz-category-row" to={`/${category.category}`} key={category.id}>
              <span className={`algoviz-category-icon icon-${category.category}`} aria-hidden="true">
                {index === 0 && <BookOpen size={20} />}
                {index === 1 && <Route size={20} />}
                {index === 2 && <BarChart3 size={20} />}
              </span>
              <span className="algoviz-category-index">0{index + 1}</span>
              <span className="algoviz-category-copy"><strong>{category.name}</strong><span>{category.summary}</span></span>
              <span className="algoviz-category-status">{category.status === "planned" ? "Planned" : "Live lab"} <ArrowRight size={17} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="algoviz-section algoviz-catalog-section" aria-labelledby="catalog-heading">
        <div className="algoviz-section-heading">
          <div>
            <p className="algoviz-eyebrow">Algorithm catalog</p>
            <h2 id="catalog-heading">The complete starter set.</h2>
          </div>
          <p>Ten core algorithms for teaching graph search, shortest paths, and sorting with the same step-by-step contract.</p>
        </div>
        <div className="algoviz-catalog-grid">
          {algorithmCatalog.map((algorithm, index) => (
            <Link className="algoviz-catalog-card" to={`/${algorithm.category}?algorithm=${algorithm.id}`} key={algorithm.shortName}>
              <span className="algoviz-catalog-number">{String(index + 1).padStart(2, "0")}</span>
              <span className={`algoviz-catalog-tag icon-${algorithm.category}`}>{algorithm.shortName}</span>
              <strong>{algorithm.name}</strong>
              <span>{algorithm.summary}</span>
              <code>{algorithm.complexity}</code>
            </Link>
          ))}
        </div>
      </section>

      <section className="algoviz-workflow-section" aria-labelledby="workflow-heading">
        <div className="algoviz-workflow-intro">
          <p className="algoviz-eyebrow">The learning loop</p>
          <h2 id="workflow-heading">From curiosity to clarity.</h2>
          <p>AlgoViz is built around the moment an abstract rule finally becomes a visible decision.</p>
        </div>
        <ol className="algoviz-workflow-list">
          {['Choose', 'Visualize', 'Step through', 'Understand', 'Compare'].map((step, index) => (
            <li key={step}>
              <span>0{index + 1}</span>
              <strong>{step}</strong>
              {index < 4 && <ArrowRight size={17} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
