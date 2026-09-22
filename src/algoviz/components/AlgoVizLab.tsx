import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SAMPLE_GRAPH } from "../../algorithms/shared/graph";
import type { AlgorithmExecution, AlgorithmStep } from "../../algorithms/shared/types";
import { getStepLabel } from "../../algorithms/shared/utils";

export interface LabOption { id: string; name: string; run: () => AlgorithmExecution }

interface AlgoVizLabProps {
  category: "search" | "pathfinding" | "sorting";
  options: readonly LabOption[];
  defaultAlgorithm: string;
}

export function AlgoVizLab({ category, options, defaultAlgorithm }: AlgoVizLabProps) {
  const [algorithmId, setAlgorithmId] = useState(defaultAlgorithm);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const execution = useMemo(() => options.find((option) => option.id === algorithmId)?.run() ?? options[0].run(), [algorithmId, options]);
  const step = execution.steps[Math.min(stepIndex, execution.steps.length - 1)];

  useEffect(() => {
    if (options.some((option) => option.id === defaultAlgorithm)) setAlgorithmId(defaultAlgorithm);
  }, [defaultAlgorithm, options]);
  useEffect(() => { setStepIndex(0); setIsPlaying(false); }, [algorithmId]);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setStepIndex((current) => {
      if (current >= execution.steps.length - 1) { setIsPlaying(false); return current; }
      return current + 1;
    }), 900 / speed);
    return () => window.clearInterval(timer);
  }, [execution.steps.length, isPlaying, speed]);

  const advance = (delta: number) => {
    setIsPlaying(false);
    setStepIndex((current) => Math.max(0, Math.min(execution.steps.length - 1, current + delta)));
  };

  return <section className="algoviz-lab" aria-label={`${category} algorithm visualizer`}>
    <div className="algoviz-lab-toolbar">
      <label className="algoviz-select-label">Algorithm
        <select value={algorithmId} onChange={(event) => setAlgorithmId(event.target.value)} aria-label="Choose algorithm">
          {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>
      <span className="algoviz-input-label">Input <strong>{execution.inputLabel}</strong></span>
    </div>
    <div className="algoviz-lab-grid">
      <div className="algoviz-stage">
        <div className="algoviz-stage-header" aria-live="polite" aria-atomic="true"><span><i className="algoviz-status-dot" /> Execution surface</span><span>{getStepLabel(step, execution.steps.length)}</span></div>
        {category === "sorting" ? <SortCanvas step={step} /> : <GraphCanvas step={step} />}
        <div className="algoviz-playback">
          <button type="button" className="algoviz-control" onClick={() => advance(-1)} aria-label="Previous step"><SkipBack size={16} /></button>
          <button type="button" className="algoviz-control algoviz-control-play" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "Pause playback" : "Play playback"}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
          <button type="button" className="algoviz-control" onClick={() => advance(1)} aria-label="Next step"><SkipForward size={16} /></button>
          <button type="button" className="algoviz-control algoviz-control-reset" onClick={() => { setStepIndex(0); setIsPlaying(false); }} aria-label="Restart playback"><RotateCcw size={15} /> Restart</button>
          <label className="algoviz-speed">Speed <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label="Playback speed"><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
        </div>
      </div>
      <LabInspector step={step} category={category} />
    </div>
  </section>;
}

function GraphCanvas({ step }: { step: AlgorithmStep }) {
  const visited = new Set(step.visited ?? []); const frontier = new Set(step.frontier ?? []); const path = new Set(step.type === "path" ? (step.visited ?? []) : []);
  return <div className="algoviz-graph-canvas"><svg viewBox="0 0 100 100" role="img" aria-label="Graph execution visualization">
    {SAMPLE_GRAPH.edges.map((edge) => <g key={`${edge.from}-${edge.to}`}><line className={path.has(edge.from) && path.has(edge.to) ? "algoviz-edge algoviz-edge-path" : "algoviz-edge"} x1={node(edge.from).x} y1={node(edge.from).y} x2={node(edge.to).x} y2={node(edge.to).y} /><text className="algoviz-edge-label" x={(node(edge.from).x + node(edge.to).x) / 2} y={(node(edge.from).y + node(edge.to).y) / 2 - 2}>{edge.weight}</text></g>)}
    {SAMPLE_GRAPH.nodes.map((item) => <g key={item.id}><circle className={`algoviz-node ${path.has(item.id) ? "is-path" : ""} ${visited.has(item.id) ? "is-visited" : ""} ${frontier.has(item.id) ? "is-frontier" : ""} ${step.currentNode === item.id ? "is-current" : ""}`} cx={item.x} cy={item.y} r="7" /><text className="algoviz-node-label" x={item.x} y={item.y + 1}>{item.id}</text></g>)}
  </svg></div>;
}

function SortCanvas({ step }: { step: AlgorithmStep }) {
  const values = step.values ?? []; const highlights = new Set(step.highlightIndices ?? []); const sorted = new Set(step.sortedIndices ?? []); const max = Math.max(...values, 1);
  return <div className="algoviz-sort-canvas" role="img" aria-label="Sorting array execution visualization">{values.map((value, index) => <div className={`algoviz-sort-bar ${highlights.has(index) ? "is-highlighted" : ""} ${sorted.has(index) ? "is-sorted" : ""}`} key={`${index}-${value}`}><span>{value}</span><i style={{ transform: `scaleY(${Math.max(0.06, value / max)})` }} /></div>)}</div>;
}

function LabInspector({ step, category }: { step: AlgorithmStep; category: string }) {
  const data = step.dataStructure ?? [];
  return <aside className="algoviz-inspector"><p className="algoviz-eyebrow">Current action</p><h2 aria-live="polite" aria-atomic="true">{step.type === "complete" ? "Complete" : step.type[0].toUpperCase() + step.type.slice(1)}</h2><p className="algoviz-explanation" aria-live="polite" aria-atomic="true">{step.explanation}</p><div className="algoviz-inspector-block"><span>{category === "sorting" ? "Array state" : "Data structure"}</span>{data.length ? data.map((entry) => <div className="algoviz-data-row" key={`${entry.label}-${entry.value}`}><span>{entry.label}</span><strong>{entry.value}</strong></div>) : <p className="algoviz-empty-data">No pending items</p>}</div><div className="algoviz-inspector-block algoviz-metrics"><span>Live metrics</span><div className="algoviz-metric-grid"><Metric label="Visited" value={step.metrics?.visitedNodes ?? step.visited?.length ?? 0} /><Metric label="Comparisons" value={step.metrics?.comparisons ?? 0} /><Metric label="Swaps" value={step.metrics?.swaps ?? 0} /><Metric label="Operations" value={step.metrics?.operations ?? 0} /></div></div></aside>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div><strong>{value}</strong><span>{label}</span></div>; }

function node(id: string) { return SAMPLE_GRAPH.nodes.find((item) => item.id === id) ?? SAMPLE_GRAPH.nodes[0]; }
