import { describe, expect, it } from "vitest";
import { runBfs, runDfs, runGreedyBestFirst } from "./searchAlgorithms";

describe("search algorithm executions", () => {
  it.each([runBfs, runDfs, runGreedyBestFirst])("records a complete execution", (run) => {
    const execution = run();
    expect(execution.completed).toBe(true);
    expect(execution.steps.at(-1)?.type).toBe("complete");
    expect(execution.steps.some((step) => step.type === "path")).toBe(true);
  });
});
