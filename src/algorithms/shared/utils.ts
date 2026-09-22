import type { AlgorithmStep, AlgorithmStepType } from "./types";

export function createAlgorithmStep(
  id: number,
  type: AlgorithmStepType,
  explanation: string,
  details: Omit<AlgorithmStep, "id" | "type" | "explanation"> = {},
): AlgorithmStep {
  return { id, type, explanation, ...details };
}

export function getStepLabel(step: AlgorithmStep, totalSteps: number): string {
  return `Step ${Math.min(step.id + 1, totalSteps)} / ${totalSteps}`;
}
