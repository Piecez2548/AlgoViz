import { describe, expect, it } from "vitest";
import { runBfs, runDfs, runGreedyBestFirst } from "./searchAlgorithms";

describe("search algorithm executions", () => {
  it.each([runBfs, runDfs, runGreedyBestFirst])("records a complete execution", (run) => {
    const execution = run();
    expect(execution.completed).toBe(true);
    expect(execution.steps.at(-1)?.type).toBe("complete");
    expect(execution.steps.some((step) => step.type === "path")).toBe(true);
  });

  it.each([runBfs, runDfs, runGreedyBestFirst])("keeps each step's own visited and frontier snapshot", (run) => {
    const steps = run().steps;
    // The final "path" step reuses `visited` to carry the answer path, so it is excluded.
    const withVisited = steps.filter((step) => step.visited && step.type !== "path");
    // Visited nodes only ever grow, and an early step must not already show later nodes.
    expect(withVisited[0].visited?.length).toBe(1);
    for (let index = 1; index < withVisited.length; index++) {
      expect(withVisited[index].visited!.length).toBeGreaterThanOrEqual(withVisited[index - 1].visited!.length);
    }
    expect(withVisited[0].visited).not.toBe(withVisited.at(-1)?.visited);
    expect(steps[0].frontier).toEqual(["A"]);
  });

  it("reports the visited count that matches the nodes drawn on every BFS step", () => {
    for (const step of runBfs().steps) {
      if (step.metrics?.visitedNodes !== undefined && step.type !== "path") {
        expect(step.visited?.length).toBe(step.metrics.visitedNodes);
      }
    }
  });});
