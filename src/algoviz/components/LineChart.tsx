import { useId } from "react";

export interface ChartSeries { id: string; name: string; /** Short name for the label at the end of the line. */ short?: string; points: readonly { x: number; y: number }[] }
export type ChartScale = "linear" | "log";

interface LineChartProps {
  series: readonly ChartSeries[];
  xLabel: string;
  yLabel: string;
  scale: ChartScale;
  /** Spoken description of what the chart shows. The numbers are also in the table below it. */
  description: string;
}

// Colour is never the only cue: every series also has its own marker shape and dash pattern.
export const SERIES_STYLES = [
  { color: "#a8ffcb", dash: undefined, marker: "circle" },
  { color: "#aab9ff", dash: "7 4", marker: "square" },
  { color: "#f5d36b", dash: "2 4", marker: "triangle" },
  { color: "#ff9a9a", dash: "10 4 2 4", marker: "diamond" },
  { color: "#e0a8ff", dash: "4 4", marker: "cross" },
  { color: "#7fd8ff", dash: "14 5", marker: "hexagon" },
] as const;

const W = 680; const H = 340;
const MARGIN = { left: 66, right: 118, top: 18, bottom: 54 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

/** 1, 2, 5 × a power of ten: the usual "nice" step for axis ticks. */
export function niceTicks(max: number, target = 5): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((multiple) => multiple * power).find((candidate) => candidate >= rough) ?? power * 10;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.999; value += step) ticks.push(Math.round(value * 1e6) / 1e6);
  return ticks;
}

export function logTicks(max: number): number[] {
  const ticks = [1];
  while (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! * 10);
  return ticks;
}

export function formatNumber(value: number): string {
  return value >= 10000 ? `${Math.round(value / 100) / 10}k` : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

/** Moves labels apart vertically so end-of-line names never overlap. */
export function spreadLabels(ys: readonly number[], gap: number, min: number, max: number): number[] {
  const order = ys.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y);
  const placed = order.map((item) => item.y);
  for (let i = 0; i < placed.length; i++) placed[i] = Math.max(i === 0 ? min : placed[i - 1] + gap, placed[i]);
  for (let i = placed.length - 1; i >= 0; i--) placed[i] = Math.min(i === placed.length - 1 ? max : placed[i + 1] - gap, placed[i]);
  const result = new Array<number>(ys.length);
  order.forEach((item, position) => { result[item.index] = placed[position]; });
  return result;
}

function Marker({ shape, x, y, color, size = 4.5 }: { shape: string; x: number; y: number; color: string; size?: number }) {
  const common = { fill: color, stroke: "#0d1020", strokeWidth: 1 };
  switch (shape) {
    case "square": return <rect {...common} x={x - size} y={y - size} width={size * 2} height={size * 2} />;
    case "triangle": return <path {...common} d={`M${x},${y - size - 1} L${x + size + 1},${y + size} L${x - size - 1},${y + size} Z`} />;
    case "diamond": return <path {...common} d={`M${x},${y - size - 1} L${x + size + 1},${y} L${x},${y + size + 1} L${x - size - 1},${y} Z`} />;
    case "cross": return <path d={`M${x - size},${y} H${x + size} M${x},${y - size} V${y + size}`} stroke={color} strokeWidth={2.4} fill="none" />;
    case "hexagon": return <path {...common} d={`M${x - size},${y} L${x - size / 2},${y - size} L${x + size / 2},${y - size} L${x + size},${y} L${x + size / 2},${y + size} L${x - size / 2},${y + size} Z`} />;
    default: return <circle {...common} cx={x} cy={y} r={size} />;
  }
}

export function LineChart({ series, xLabel, yLabel, scale, description }: LineChartProps) {
  const id = useId();
  const allPoints = series.flatMap((item) => item.points);
  const xs = [...new Set(allPoints.map((point) => point.x))].sort((a, b) => a - b);
  const xMin = xs[0] ?? 0; const xMax = xs.at(-1) ?? 1;
  const maxY = Math.max(1, ...allPoints.map((point) => point.y));
  // On the log scale a value of 0 cannot be drawn, so it sits on the bottom line (value 1).
  const hasZero = scale === "log" && allPoints.some((point) => point.y < 1);
  const yTicks = scale === "log" ? logTicks(maxY) : niceTicks(maxY);
  const yTop = yTicks.at(-1)!;
  const toY = (value: number) => {
    const fraction = scale === "log" ? Math.log10(Math.max(1, value)) / Math.log10(yTop) : value / yTop;
    return MARGIN.top + PLOT_H - Math.min(1, Math.max(0, fraction)) * PLOT_H;
  };
  const toX = (value: number) => MARGIN.left + (xMax === xMin ? PLOT_W / 2 : ((value - xMin) / (xMax - xMin)) * PLOT_W);
  const ends = series.map((item) => toY(item.points.at(-1)?.y ?? 0));
  const labelY = spreadLabels(ends, 15, MARGIN.top + 6, MARGIN.top + PLOT_H);

  return <figure className="algoviz-chart">
    <ul className="algoviz-chart-legend" aria-label="Legend">
      {series.map((item, index) => { const style = SERIES_STYLES[index % SERIES_STYLES.length]; return <li key={item.id}>
        <svg width="34" height="12" aria-hidden="true"><line x1="1" x2="33" y1="6" y2="6" stroke={style.color} strokeWidth="2.4" strokeDasharray={style.dash} /><Marker shape={style.marker} x={17} y={6} color={style.color} size={3.6} /></svg>{item.name}
      </li>; })}
    </ul>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-title`} className="algoviz-chart-svg">
      <title id={`${id}-title`}>{description}</title>
      {yTicks.map((tick) => <g key={tick}>
        <line className="algoviz-chart-grid" x1={MARGIN.left} x2={MARGIN.left + PLOT_W} y1={toY(tick)} y2={toY(tick)} />
        <text className="algoviz-chart-tick" x={MARGIN.left - 8} y={toY(tick) + 4} textAnchor="end">{formatNumber(tick)}</text>
      </g>)}
      {xs.map((tick) => <text key={tick} className="algoviz-chart-tick" x={toX(tick)} y={MARGIN.top + PLOT_H + 20} textAnchor="middle">{tick}</text>)}
      <line className="algoviz-chart-axis" x1={MARGIN.left} x2={MARGIN.left + PLOT_W} y1={MARGIN.top + PLOT_H} y2={MARGIN.top + PLOT_H} />
      <line className="algoviz-chart-axis" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + PLOT_H} />
      <text className="algoviz-chart-axis-label" x={MARGIN.left + PLOT_W / 2} y={H - 8} textAnchor="middle">{xLabel}</text>
      <text className="algoviz-chart-axis-label" transform={`translate(14 ${MARGIN.top + PLOT_H / 2}) rotate(-90)`} textAnchor="middle">{yLabel}{scale === "log" ? " (log scale)" : ""}</text>
      {series.map((item, index) => {
        const style = SERIES_STYLES[index % SERIES_STYLES.length];
        const path = item.points.map((point, i) => `${i === 0 ? "M" : "L"}${toX(point.x).toFixed(1)},${toY(point.y).toFixed(1)}`).join(" ");
        const last = item.points.at(-1);
        return <g key={item.id} data-series={item.id}>
          <path d={path} fill="none" stroke={style.color} strokeWidth="2.4" strokeDasharray={style.dash} strokeLinejoin="round" />
          {item.points.map((point) => <Marker key={point.x} shape={style.marker} x={toX(point.x)} y={toY(point.y)} color={style.color} />)}
          {last && <text className="algoviz-chart-end" x={toX(last.x) + 10} y={labelY[index] + 4} fill={style.color}>{item.short ?? item.name} {formatNumber(last.y)}</text>}
        </g>;
      })}
    </svg>
    {hasZero && <figcaption className="algoviz-chart-note">Values of 0 sit on the bottom line because a log scale cannot show zero.</figcaption>}
  </figure>;
}
