import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";
import { createAlgorithmStep } from "../shared/utils";

export const SEARCH_TARGET_SAMPLE = 42;

/** Both searches get the numbers in ascending order so they look through exactly the same data. */
export const sortedCopy = (values: readonly number[]): number[] => [...values].sort((a, b) => a - b);

function finish(algorithmId: string, name: string, values: readonly number[], target: number, steps: AlgorithmStep[], foundAt: number, comparisons: number): AlgorithmExecution {
  steps.push(createAlgorithmStep(steps.length, "complete", foundAt >= 0 ? `Found ${target} at position ${foundAt} after ${comparisons} comparison${comparisons === 1 ? "" : "s"}.` : `${target} is not in the list. ${name} needed ${comparisons} comparison${comparisons === 1 ? "" : "s"} to be sure.`, {
    values, highlightIndices: foundAt >= 0 ? [foundAt] : [], sortedIndices: foundAt >= 0 ? [foundAt] : [], metrics: { comparisons, operations: comparisons },
    dataStructure: [{ label: "Target", value: target }, { label: "Result", value: foundAt >= 0 ? `position ${foundAt}` : "not found" }],
  }));
  return { algorithmId, inputLabel: `Sorted list of ${values.length} · looking for ${target}`, steps, completed: true };
}

/** Linear search: look at every value from the left until the target turns up. */
export function runLinearSearch(input: readonly number[], target: number = SEARCH_TARGET_SAMPLE): AlgorithmExecution {
  const values = sortedCopy(input); const steps: AlgorithmStep[] = []; let comparisons = 0; let foundAt = -1;
  for (let index = 0; index < values.length; index++) {
    comparisons++;
    steps.push(createAlgorithmStep(steps.length, "compare", `Is ${values[index]} equal to ${target}? ${values[index] === target ? "Yes." : "No, move on."}`, {
      values, highlightIndices: [index], activeRange: [index, values.length - 1], metrics: { comparisons, operations: comparisons }, dataStructure: [{ label: "Target", value: target }, { label: "Looking at", value: `position ${index}` }],
    }));
    if (values[index] === target) { foundAt = index; break; }
  }
  return finish("linear-search", "Linear search", values, target, steps, foundAt, comparisons);
}

/**
 * Binary search: because the list is sorted, compare the target with the middle value and throw away
 * the half that cannot contain it. The remaining range halves every time.
 */
export function runBinarySearch(input: readonly number[], target: number = SEARCH_TARGET_SAMPLE): AlgorithmExecution {
  const values = sortedCopy(input); const steps: AlgorithmStep[] = []; let comparisons = 0; let foundAt = -1;
  let low = 0; let high = values.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    comparisons++;
    const relation = values[middle] === target ? "equal to" : values[middle] < target ? "smaller than" : "larger than";
    const next = values[middle] === target ? "That is the target." : values[middle] < target ? `Everything up to position ${middle} is too small, so keep the right half.` : `Everything from position ${middle} on is too large, so keep the left half.`;
    steps.push(createAlgorithmStep(steps.length, "compare", `The middle of positions ${low}–${high} is ${values[middle]}, which is ${relation} ${target}. ${next}`, {
      values, highlightIndices: [middle], activeRange: [low, high], metrics: { comparisons, operations: comparisons }, dataStructure: [{ label: "Target", value: target }, { label: "Range", value: `${low}–${high}` }, { label: "Middle", value: `position ${middle}` }],
    }));
    if (values[middle] === target) { foundAt = middle; break; }
    if (values[middle] < target) low = middle + 1; else high = middle - 1;
  }
  return finish("binary-search", "Binary search", values, target, steps, foundAt, comparisons);
}
