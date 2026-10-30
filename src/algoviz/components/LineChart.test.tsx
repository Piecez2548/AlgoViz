import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineChart, formatNumber, logTicks, niceTicks, spreadLabels } from "./LineChart";

const series = [
  { id: "a", name: "Alpha", short: "A", points: [{ x: 10, y: 5 }, { x: 20, y: 40 }, { x: 30, y: 90 }] },
  { id: "b", name: "Beta", short: "B", points: [{ x: 10, y: 6 }, { x: 20, y: 41 }, { x: 30, y: 91 }] },
  { id: "c", name: "Gamma", short: "C", points: [{ x: 10, y: 0 }, { x: 20, y: 2 }, { x: 30, y: 8 }] },
];

describe("axis helpers", () => {
  it.each([[9, [0, 2, 4, 6, 8, 10]], [100, [0, 20, 40, 60, 80, 100]], [2016, [0, 500, 1000, 1500, 2000, 2500]], [0, [0, 1]]])("niceTicks(%s)", (max, expected) => {
    expect(niceTicks(max)).toEqual(expected);
  });

  it("covers the largest value with ticks that are powers of ten on a log axis", () => {
    expect(logTicks(1)).toEqual([1]);
    expect(logTicks(2016)).toEqual([1, 10, 100, 1000, 10000]);
  });

  it("keeps end labels apart but as close to their lines as possible", () => {
    const spread = spreadLabels([100, 101, 102, 300], 15, 10, 330);
    const sorted = [...spread].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(15);
    expect(spread[3]).toBe(300);
    expect(Math.min(...spread)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...spread)).toBeLessThanOrEqual(330);
  });

  it("formats numbers compactly", () => { expect(formatNumber(2016)).toBe("2,016"); expect(formatNumber(12500)).toBe("12.5k"); expect(formatNumber(3.25)).toBe("3.3"); });
});

describe("LineChart", () => {
  const draw = (scale: "linear" | "log") => render(<LineChart series={series} xLabel="Items" yLabel="Cost" scale={scale} description="Cost against items." />);

  it("draws one path and a marker per point for every series, and describes itself", () => {
    const { container, getByRole } = draw("linear");
    expect(getByRole("img", { name: "Cost against items." })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-series]")).toHaveLength(3);
    for (const group of container.querySelectorAll("[data-series]")) {
      expect(group.querySelectorAll("path[stroke-linejoin]")).toHaveLength(1);
    }
    expect(container.querySelectorAll("[data-series='a'] circle")).toHaveLength(3);
  });

  it("never relies on colour alone: each series has its own marker shape and dash pattern", () => {
    const { container } = draw("linear");
    const dashes = [...container.querySelectorAll("[data-series] path[stroke-linejoin]")].map((path) => path.getAttribute("stroke-dasharray"));
    expect(new Set(dashes).size).toBe(3);
    expect(container.querySelector("[data-series='b'] rect")).not.toBeNull();
    expect(container.querySelector("[data-series='c'] path[fill='#e0a8ff'], [data-series='c'] path[d^='M']")).not.toBeNull();
  });

  it("places the end labels without overlapping", () => {
    const { container } = draw("linear");
    const ys = [...container.querySelectorAll(".algoviz-chart-end")].map((text) => Number(text.getAttribute("y"))).sort((a, b) => a - b);
    expect(ys).toHaveLength(3);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(15);
  });

  it("puts a larger value higher up and flags the log scale and zero values", () => {
    const { container, queryByText } = draw("log");
    const y = (id: string, index: number) => Number(container.querySelectorAll(`[data-series='${id}'] circle, [data-series='${id}'] rect, [data-series='${id}'] path`)[index + 1]?.getAttribute("cy") ?? 0);
    expect(y("a", 0)).toBeGreaterThan(0);
    expect(queryByText(/\(log scale\)/)).not.toBeNull();
    expect(queryByText(/log scale cannot show zero/)).not.toBeNull();
    cleanup();
    const linear = draw("linear");
    expect(linear.queryByText(/log scale cannot show zero/)).toBeNull();
  });

  it("lists every series in the legend", () => {
    const { getByLabelText } = draw("linear");
    const legend = getByLabelText("Legend");
    for (const name of ["Alpha", "Beta", "Gamma"]) expect(legend).toHaveTextContent(name);
  });
});
