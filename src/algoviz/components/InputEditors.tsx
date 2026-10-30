import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cellId, cellIndex, defaultGrid, HEAVY_COST, samePoint } from "../../algorithms/shared/graph";
import { makePreset, MAX_ARRAY, MAX_VALUE, MIN_ARRAY, parseNumberList, PRESET_LABELS, type ArrayPreset } from "../../algorithms/shared/arrayInput";
import type { GridCell, GridPoint, GridState } from "../../algorithms/shared/graphTypes";
import type { AlgorithmStep } from "../../algorithms/shared/types";

export function ArrayInput({ values, onApply }: { values: readonly number[]; onApply: (values: number[]) => void }) {
  const [text, setText] = useState(values.join(", "));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setText(values.join(", ")); setError(null); }, [values]);
  const apply = () => {
    const parsed = parseNumberList(text);
    if (!parsed.values) { setError(parsed.error); return; }
    setError(null); onApply(parsed.values);
  };
  return <form className="algoviz-input-panel" onSubmit={(event) => { event.preventDefault(); apply(); }}>
    <label className="algoviz-field">Your numbers
      <input type="text" inputMode="numeric" value={text} onChange={(event) => setText(event.target.value)} aria-invalid={Boolean(error)} aria-describedby="algoviz-array-help" />
    </label>
    <button type="submit" className="algoviz-button">Use these numbers</button>
    <label className="algoviz-field">Start from
      <select aria-label="Preset data" value="" onChange={(event) => { if (event.target.value) onApply(makePreset(event.target.value as ArrayPreset)); }}>
        <option value="">Choose a preset…</option>
        {(Object.keys(PRESET_LABELS) as ArrayPreset[]).map((preset) => <option key={preset} value={preset}>{PRESET_LABELS[preset]}</option>)}
      </select>
    </label>
    <button type="button" className="algoviz-button algoviz-button-quiet" onClick={() => onApply(makePreset("random"))}>Shuffle new data</button>
    <p id="algoviz-array-help" className="algoviz-field-help">{MIN_ARRAY}–{MAX_ARRAY} whole numbers from 1 to {MAX_VALUE}, separated by commas or spaces.</p>
    {error && <p className="algoviz-field-error" role="alert">{error}</p>}
  </form>;
}

export type GridTool = "wall" | "heavy" | "erase" | "start" | "goal";
const TOOLS: { id: GridTool; label: string }[] = [
  { id: "wall", label: "Wall" }, { id: "heavy", label: `Heavy ground (cost ${HEAVY_COST})` }, { id: "erase", label: "Erase" }, { id: "start", label: "Move start" }, { id: "goal", label: "Move goal" },
];

export function applyTool(grid: GridState, tool: GridTool, point: GridPoint): GridState {
  const index = cellIndex(grid, point.col, point.row);
  const isStart = samePoint(point, grid.start); const isGoal = samePoint(point, grid.goal);
  const setCell = (cell: GridCell): GridState => grid.cells[index] === cell ? grid : { ...grid, cells: grid.cells.map((existing, i) => (i === index ? cell : existing)) };
  if (tool === "start") return isGoal ? grid : { ...setCell("empty"), start: point };
  if (tool === "goal") return isStart ? grid : { ...setCell("empty"), goal: point };
  if (isStart || isGoal) return grid;
  return setCell(tool === "wall" ? "wall" : tool === "heavy" ? "heavy" : "empty");
}

export function GridToolbar({ tool, onTool, onClearWalls, onReset }: { tool: GridTool; onTool: (tool: GridTool) => void; onClearWalls: () => void; onReset: () => void }) {
  return <div className="algoviz-input-panel">
    <fieldset className="algoviz-tools"><legend>Draw with</legend>
      {TOOLS.map((item) => <label key={item.id} className={tool === item.id ? "is-active" : ""}><input type="radio" name="grid-tool" value={item.id} checked={tool === item.id} onChange={() => onTool(item.id)} />{item.label}</label>)}
    </fieldset>
    <button type="button" className="algoviz-button algoviz-button-quiet" onClick={onClearWalls}>Clear walls</button>
    <button type="button" className="algoviz-button algoviz-button-quiet" onClick={onReset}>Reset map</button>
    <p className="algoviz-field-help">Click or drag on the map. With the keyboard, move with the arrow keys and press Enter or Space.</p>
  </div>;
}

interface GridBoardProps { grid: GridState; tool: GridTool; step: AlgorithmStep; route: readonly string[]; onChange: (grid: GridState) => void }

export function GridBoard({ grid, tool, step, route, onChange }: GridBoardProps) {
  const [focus, setFocus] = useState<GridPoint>(grid.start);
  const painting = useRef(false);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    const stop = () => { painting.current = false; };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);
  const visited = new Set(step.visited ?? []); const frontier = new Set(step.frontier ?? []);
  const path = new Set(route);
  const apply = (point: GridPoint) => onChange(applyTool(grid, tool, point));
  const move = (col: number, row: number) => {
    const next = { col: Math.max(0, Math.min(grid.cols - 1, col)), row: Math.max(0, Math.min(grid.rows - 1, row)) };
    setFocus(next); refs.current.get(cellId(next.col, next.row))?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, point: GridPoint) => {
    const deltas: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const delta = deltas[event.key];
    if (delta) { event.preventDefault(); event.stopPropagation(); move(point.col + delta[0], point.row + delta[1]); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); apply(point); }
  };
  const rows = Array.from({ length: grid.rows }, (_, row) => row);
  return <div className="algoviz-grid" role="grid" aria-label="Map editor and visualization" style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}>
    {rows.map((row) => <div key={row} role="row" className="algoviz-grid-row">{Array.from({ length: grid.cols }, (_, col) => {
      const point = { col, row }; const id = cellId(col, row);
      const cell = grid.cells[cellIndex(grid, col, row)];
      const isStart = samePoint(point, grid.start); const isGoal = samePoint(point, grid.goal);
      const state = isStart ? "start" : isGoal ? "goal" : cell;
      const mark = path.has(id) ? "path" : step.currentNode === id ? "current" : visited.has(id) ? "visited" : frontier.has(id) ? "frontier" : "";
      return <button key={id} type="button" role="gridcell" ref={(node) => { if (node) refs.current.set(id, node); else refs.current.delete(id); }}
        className={`algoviz-cell is-${state} ${mark ? `is-${mark}` : ""}`} tabIndex={samePoint(point, focus) ? 0 : -1}
        aria-label={`${id}, ${state === "empty" ? "open" : state === "heavy" ? `heavy ground, cost ${HEAVY_COST}` : state}${mark ? `, ${mark}` : ""}`}
        onFocus={() => setFocus(point)} onKeyDown={(event) => onKeyDown(event, point)}
        onPointerDown={(event) => { event.preventDefault(); painting.current = true; apply(point); }}
        onPointerEnter={() => { if (painting.current && (tool === "wall" || tool === "heavy" || tool === "erase")) apply(point); }}
        onClick={(event) => { if (event.detail === 0) apply(point); }} />;
    })}</div>)}
  </div>;
}

export { defaultGrid };
