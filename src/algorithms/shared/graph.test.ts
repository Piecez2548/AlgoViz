import { describe, expect, it } from "vitest";
import { pathCost, SAMPLE_GRAPH } from "./graph";

describe("pathCost", () => {
  it("adds edge weights along the path in either direction", () => {
    expect(pathCost(SAMPLE_GRAPH, ["A", "B", "D", "F"])).toBe(7);
    expect(pathCost(SAMPLE_GRAPH, ["A", "C", "E", "F"])).toBe(7);
    expect(pathCost(SAMPLE_GRAPH, ["F", "E", "C", "A"])).toBe(7);
  });

  it("is zero for a single node and Infinity when nodes are not connected", () => {
    expect(pathCost(SAMPLE_GRAPH, ["A"])).toBe(0);
    expect(pathCost(SAMPLE_GRAPH, ["A", "F"])).toBe(Infinity);
  });
});
