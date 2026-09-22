import { describe, expect, it } from "vitest";
import { runAStar, runDijkstra } from "./pathfindingAlgorithms";

describe("pathfinding algorithm executions", () => {
  it.each([runDijkstra, runAStar])("finds the shortest path from A to F", (run) => {
    const execution = run();
    const path = execution.steps.find((step) => step.type === "path")?.dataStructure?.[0]?.value;
    expect(path).toBe("A → B → D → F");
    expect(execution.steps.at(-1)?.type).toBe("complete");
  });
});
