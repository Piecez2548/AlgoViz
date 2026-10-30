import { describe, expect, it } from "vitest";
import { ROUTE_ALGORITHMS, SORTING_ALGORITHMS } from "../registry";
import { runBubbleSort } from "../sorting/sortingAlgorithms";
import { graphGrowth, measure, MAP_SIDES, SORT_SIZES, sortGrowth, sortInputs, squareMap } from "./benchmark";
import { gridToGraph } from "./graph";

const ids = SORTING_ALGORITHMS.map((algorithm) => algorithm.id);
const at = (series: ReturnType<typeof sortGrowth>, id: string, n: number) => series.find((item) => item.id === id)!.points.find((point) => point.n === n)!.value;

describe("measure", () => {
  it("reads comparisons, swaps and steps from the recorded run", () => {
    const result = measure(runBubbleSort([3, 2, 1]));
    expect(result.comparisons).toBe(3);
    expect(result.swaps).toBe(3);
    expect(result.steps).toBe(7);
  });

  it("finds the route cost on a map and reports none when there is no route", () => {
    const graph = gridToGraph(squareMap(4, "none"));
    const dijkstra = measure(ROUTE_ALGORITHMS.find((a) => a.id === "dijkstra")!.run(graph), graph);
    expect(dijkstra.cost).toBe(3);
    const sealed = gridToGraph({ cols: 3, rows: 1, cells: ["empty", "wall", "empty"], start: { col: 0, row: 0 }, goal: { col: 2, row: 0 } });
    expect(measure(ROUTE_ALGORITHMS.find((a) => a.id === "dijkstra")!.run(sealed), sealed).cost).toBeNull();
  });
});

describe("sorting growth", () => {
  it("is built from real runs and matches the textbook counts for the quadratic sorts", () => {
    const series = sortGrowth(ids, "random", "comparisons");
    for (const n of SORT_SIZES) {
      expect(at(series, "bubble", n)).toBe((n * (n - 1)) / 2);
      expect(at(series, "selection", n)).toBe((n * (n - 1)) / 2);
    }
  });

  it("shows insertion sort needing only n - 1 comparisons on sorted data", () => {
    const series = sortGrowth(["insertion", "bubble"], "sorted", "comparisons");
    for (const n of SORT_SIZES) expect(at(series, "insertion", n)).toBe(n - 1);
    expect(at(series, "bubble", 64)).toBe(2016);
  });

  it("shows quick sort degrading on sorted data while merge sort does not", () => {
    const series = sortGrowth(["quick", "merge"], "sorted", "comparisons");
    expect(at(series, "quick", 64)).toBe(2016);
    expect(at(series, "merge", 64)).toBeLessThan(400);
    const random = sortGrowth(["quick", "merge"], "random", "comparisons");
    expect(at(random, "quick", 64)).toBeLessThan(800);
  });

  it("grows with the input for every algorithm and keeps the same inputs between calls", () => {
    for (const shape of ["random", "reversed", "nearly", "few-unique"] as const) {
      for (const series of sortGrowth(ids, shape, "steps")) {
        const values = series.points.map((point) => point.value);
        expect(values, `${series.id} ${shape}`).toEqual([...values].sort((a, b) => a - b));
      }
    }
    expect(sortInputs("random", 16)).toEqual(sortInputs("random", 16));
    expect(sortInputs("random", 16)).toHaveLength(3);
  });

  it("draws every algorithm in under a few seconds so the page stays responsive", () => {
    const started = performance.now();
    for (const shape of ["random", "reversed"] as const) sortGrowth(ids, shape, "steps");
    expect(performance.now() - started).toBeLessThan(4000);
  });
});

describe("map growth", () => {
  const route = ["bfs", "dfs", "greedy-best-first", "dijkstra", "a-star", "bellman-ford"];

  it("has A* visit no more nodes than Dijkstra and far fewer on a large open map", () => {
    const series = graphGrowth(route, "none", "visited");
    const value = (id: string, n: number) => series.find((item) => item.id === id)!.points.find((point) => point.n === n)!.value;
    for (const side of MAP_SIDES) expect(value("a-star", side * side)).toBeLessThanOrEqual(value("dijkstra", side * side));
    expect(value("a-star", 256)).toBeLessThan(value("dijkstra", 256) / 4);
  });

  it("has Breadth-First Search and Dijkstra visit exactly the same nodes on an open map", () => {
    const series = graphGrowth(["bfs", "dijkstra"], "none", "visited");
    expect(series[0].points).toEqual(series[1].points);
  });

  it("finds an optimal route with Dijkstra, A* and Bellman-Ford on every size, with or without walls", () => {
    for (const obstacles of ["none", "scattered"] as const) {
      for (const side of MAP_SIDES) {
        const graph = gridToGraph(squareMap(side, obstacles));
        const costs = ["dijkstra", "a-star", "bellman-ford"].map((id) => measure(ROUTE_ALGORITHMS.find((a) => a.id === id)!.run(graph), graph).cost);
        expect(new Set(costs).size, `${obstacles} ${side}`).toBe(1);
      }
    }
  });

  it("keeps the start and goal open and uses the same walls every time", () => {
    const first = squareMap(10, "scattered"); const again = squareMap(10, "scattered");
    expect(first).toEqual(again);
    expect(first.cells[first.start.row * 10]).toBe("empty");
    expect(first.cells[first.goal.row * 10 + 9]).toBe("empty");
    expect(first.cells.filter((cell) => cell === "wall").length).toBeGreaterThan(5);
  });
});
