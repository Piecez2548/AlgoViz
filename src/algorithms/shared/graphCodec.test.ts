import { describe, expect, it } from "vitest";
import { SAMPLE_GRAPH } from "./graph";
import { decodeGraph, encodeGraph } from "./graphCodec";
import { addNode, moveNode, setEdge } from "./graphEdit";

describe("graph link codec", () => {
  it("round-trips the sample graph and an edited one", () => {
    const decoded = decodeGraph(encodeGraph(SAMPLE_GRAPH))!;
    expect(decoded.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual(SAMPLE_GRAPH.nodes.map(({ id, x, y }) => ({ id, x, y })));
    expect(decoded.edges).toEqual(SAMPLE_GRAPH.edges);
    expect([decoded.start, decoded.goal]).toEqual(["A", "F"]);
    const edited = setEdge(moveNode(addNode(SAMPLE_GRAPH, 33.3, 66.6), "B", 20.55, 90), "A", "G", 7);
    const again = decodeGraph(encodeGraph(edited))!;
    expect(again.nodes.find((node) => node.id === "G")).toMatchObject({ x: 33.3, y: 66.6 });
    expect(again.nodes.find((node) => node.id === "B")).toMatchObject({ y: 90 });
    expect(again.edges.find((edge) => edge.to === "G")?.weight).toBe(7);
  });

  it("stays short enough for a link", () => {
    expect(encodeGraph(SAMPLE_GRAPH).length).toBeLessThan(150);
  });

  it.each([
    ["nothing", ""], ["wrong shape", "A:1:1,B:2:2~A:B:1~A"], ["one node", "A:1:1~~A~A"],
    ["unknown edge end", "A:1:1,B:2:2~A:Z:1~A~B"], ["loop", "A:1:1,B:2:2~A:A:1~A~B"], ["bad weight", "A:1:1,B:2:2~A:B:0~A~B"],
    ["duplicate edge", "A:1:1,B:2:2~A:B:1,B:A:2~A~B"], ["duplicate node", "A:1:1,A:2:2~~A~A"], ["same start and goal", "A:1:1,B:2:2~A:B:1~A~A"],
    ["off canvas", "A:1:1,B:200:2~A:B:1~A~B"], ["not a number", "A:1:x,B:2:2~A:B:1~A~B"], ["bad id", "A-1:1:1,B:2:2~A:B:1~A~B"],
    ["too many nodes", `${Array.from({ length: 13 }, (_, i) => `N${i}:${i}:${i}`).join(",")}~~N0~N1`],
  ])("rejects %s", (_name, text) => { expect(decodeGraph(text)).toBeNull(); });

  it("accepts a graph with no edges", () => {
    expect(decodeGraph("A:10:10,B:80:80~~A~B")?.edges).toEqual([]);
  });
});

describe("directed graphs in links", () => {
  it("round-trips the direction, the order of each edge and negative weights", () => {
    const graph = { ...SAMPLE_GRAPH, directed: true, edges: [{ from: "B", to: "A", weight: -3 }, { from: "A", to: "B", weight: 2 }] };
    const text = encodeGraph(graph);
    expect(text.endsWith("~d")).toBe(true);
    const back = decodeGraph(text)!;
    expect(back.directed).toBe(true);
    expect(back.edges).toEqual(graph.edges);
  });

  it("does not mark a two-way graph as directed and still rejects negative weights there", () => {
    expect(decodeGraph(encodeGraph(SAMPLE_GRAPH))!.directed).toBeUndefined();
    expect(decodeGraph("A:1:1,B:2:2~A:B:-1~A~B")).toBeNull();
    expect(decodeGraph("A:1:1,B:2:2~A:B:-1~A~B~d")).not.toBeNull();
    expect(decodeGraph("A:1:1,B:2:2~A:B:-1~A~B~x")).toBeNull();
  });
});
