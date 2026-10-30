import { describe, expect, it } from "vitest";
import { runAStar, runDijkstra } from "../pathfinding/pathfindingAlgorithms";
import { runKruskal, runPrim } from "../spanning/spanningAlgorithms";
import { SAMPLE_GRAPH, withHeuristics } from "./graph";
import { addNode, freeSpot, MAX_NODES, moveNode, nextNodeId, removeEdge, removeNode, setEdge, setEndpoint } from "./graphEdit";

describe("graph editing", () => {
  it("names new nodes with the first unused letter and stops at the limit", () => {
    expect(nextNodeId(SAMPLE_GRAPH)).toBe("G");
    let graph = SAMPLE_GRAPH;
    for (let i = 0; i < 20; i++) graph = addNode(graph, 50, 50);
    expect(graph.nodes).toHaveLength(MAX_NODES);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(MAX_NODES);
  });

  it("keeps nodes inside the canvas and picks a free spot away from the others", () => {
    expect(moveNode(SAMPLE_GRAPH, "A", -50, 500).nodes[0]).toMatchObject({ x: 4, y: 96 });
    const spot = freeSpot(SAMPLE_GRAPH);
    for (const node of SAMPLE_GRAPH.nodes) expect(Math.hypot(node.x - spot.x, node.y - spot.y)).toBeGreaterThan(15);
  });

  it("adds an edge once, updates its weight, and ignores loops, unknown nodes and bad weights", () => {
    const withEdge = setEdge(SAMPLE_GRAPH, "F", "A", 9);
    expect(withEdge.edges.at(-1)).toEqual({ from: "A", to: "F", weight: 9 });
    expect(setEdge(withEdge, "A", "F", 2).edges.filter((edge) => edge.from === "A" && edge.to === "F")).toEqual([{ from: "A", to: "F", weight: 2 }]);
    for (const bad of [setEdge(SAMPLE_GRAPH, "A", "A", 3), setEdge(SAMPLE_GRAPH, "A", "Z", 3), setEdge(SAMPLE_GRAPH, "A", "F", 0), setEdge(SAMPLE_GRAPH, "A", "F", 2.5), setEdge(SAMPLE_GRAPH, "A", "F", 100)]) expect(bad).toBe(SAMPLE_GRAPH);
    expect(removeEdge(withEdge, "A", "F").edges).toEqual(SAMPLE_GRAPH.edges);
  });

  it("removing a node drops its edges and hands the start or goal to another node", () => {
    const withoutStart = removeNode(SAMPLE_GRAPH, "A");
    expect(withoutStart.edges.every((edge) => edge.from !== "A" && edge.to !== "A")).toBe(true);
    expect(withoutStart.start).not.toBe("A");
    expect(withoutStart.start).not.toBe(withoutStart.goal);
    expect(withoutStart.nodes.some((node) => node.id === withoutStart.start)).toBe(true);
    const withoutGoal = removeNode(SAMPLE_GRAPH, "F");
    expect(withoutGoal.goal).not.toBe("F");
    expect(withoutGoal.start).toBe("A");
    let tiny = SAMPLE_GRAPH;
    for (const id of ["B", "C", "D", "E"]) tiny = removeNode(tiny, id);
    expect(tiny.nodes).toHaveLength(2);
    expect(removeNode(tiny, "A")).toBe(tiny);
  });

  it("swaps start and goal instead of making them the same node", () => {
    const swapped = setEndpoint(SAMPLE_GRAPH, "start", "F");
    expect(swapped).toMatchObject({ start: "F", goal: "A" });
  });

  it("a graph the user rearranged still gives Dijkstra, A* and the spanning trees the right answers", () => {
    let graph = moveNode(SAMPLE_GRAPH, "B", 20, 90);
    graph = setEdge(graph, "A", "F", 8);
    graph = setEdge(graph, "C", "D", 1);
    const ready = withHeuristics(graph);
    const cost = (run: typeof runDijkstra) => run(ready).steps.find((step) => step.type === "path")?.dataStructure?.[0].value;
    expect(cost(runAStar)).toBe(cost(runDijkstra));
    const weight = (execution: ReturnType<typeof runKruskal>) => execution.steps.at(-1)!.dataStructure!.find((entry) => entry.label === "Total weight")!.value;
    expect(weight(runPrim(ready))).toBe(weight(runKruskal(ready)));
  });
});
