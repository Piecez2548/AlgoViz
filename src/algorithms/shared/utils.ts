import type { AlgorithmStep, AlgorithmStepType } from "./types";

export function createAlgorithmStep(
  id: number,
  type: AlgorithmStepType,
  explanation: string,
  details: Omit<AlgorithmStep, "id" | "type" | "explanation"> = {},
): AlgorithmStep {
  const step: AlgorithmStep = { id, type, explanation, ...details };
  // Algorithms keep mutating their working arrays (queues, visited lists, sorted
  // prefixes) after a step is recorded. Without a snapshot every earlier step
  // would replay the final state, so each step owns copies of its collections.
  if (details.visited) step.visited = [...details.visited];
  if (details.frontier) step.frontier = [...details.frontier];
  if (details.dataStructure) step.dataStructure = [...details.dataStructure];
  if (details.values) step.values = [...details.values];
  if (details.highlightIndices) step.highlightIndices = [...details.highlightIndices];
  if (details.sortedIndices) step.sortedIndices = [...details.sortedIndices];
  return step;
}

export function getStepLabel(step: AlgorithmStep, totalSteps: number): string {
  return `Step ${Math.min(step.id + 1, totalSteps)} / ${totalSteps}`;
}
