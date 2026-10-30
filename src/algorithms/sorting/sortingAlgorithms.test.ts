import { describe, expect, it } from "vitest";
import { runBubbleSort, runInsertionSort, runMergeSort, runQuickSort, runSelectionSort } from "./sortingAlgorithms";

describe("sorting algorithm executions", () => {
  it.each([runBubbleSort, runSelectionSort, runInsertionSort, runMergeSort, runQuickSort])("ends with a sorted snapshot", (run) => {
    const execution = run();
    const finalValues = execution.steps.at(-2)?.values ?? [];
    expect(finalValues).toEqual([9, 18, 23, 31, 42, 56, 64]);
    expect(execution.steps.at(-1)?.type).toBe("complete");
  });

  it.each([runBubbleSort, runSelectionSort, runInsertionSort])("grows the sorted region instead of showing the final one from the start", (run) => {
    const steps = run().steps.filter((step) => step.type !== "complete");
    expect(steps[0].sortedIndices?.length ?? 0).toBeLessThanOrEqual(1);
    const lengths = steps.map((step) => step.sortedIndices?.length ?? 0);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(lengths.at(-1)).toBeGreaterThan(lengths[0]);
  });

  it.each([runBubbleSort, runSelectionSort, runInsertionSort, runMergeSort, runQuickSort])("shows the array state on every step", (run) => {
    for (const step of run().steps) {
      expect(step.dataStructure?.[0]?.label).toBe("Array");
      expect(step.dataStructure?.[0]?.value).toBe((step.values ?? []).join(", "));
    }
  });});
