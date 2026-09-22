import { createAlgorithmStep } from "../shared/utils";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";

const INPUT = [42, 18, 64, 9, 31, 56, 23];

function sortExecution(algorithmId: string, name: string): AlgorithmExecution {
  const values = [...INPUT]; const steps: AlgorithmStep[] = []; let comparisons = 0; let swaps = 0;
  const add = (type: "compare" | "swap" | "complete", explanation: string, indices: number[] = [], sortedIndices: number[] = []) => steps.push(createAlgorithmStep(steps.length, type, explanation, { values: [...values], highlightIndices: indices, sortedIndices, metrics: { comparisons, swaps, operations: comparisons + swaps } }));
  if (algorithmId === "bubble") {
    const sorted: number[] = [];
    for (let end = values.length - 1; end > 0; end--) for (let i = 0; i < end; i++) {
      comparisons++; add("compare", `Compare ${values[i]} and ${values[i + 1]}.`, [i, i + 1], sorted);
      if (values[i] > values[i + 1]) { [values[i], values[i + 1]] = [values[i + 1], values[i]]; swaps++; add("swap", `Swap them so the larger value moves right.`, [i, i + 1], sorted); }
    }
  } else if (algorithmId === "selection") {
    const sorted: number[] = [];
    for (let i = 0; i < values.length - 1; i++) { let min = i; for (let j = i + 1; j < values.length; j++) { comparisons++; add("compare", `Compare the current minimum with ${values[j]}.`, [min, j], sorted); if (values[j] < values[min]) min = j; } if (min !== i) { [values[i], values[min]] = [values[min], values[i]]; swaps++; add("swap", `Place ${values[i]} into the sorted prefix.`, [i, min], sorted); } sorted.push(i); }
  } else if (algorithmId === "merge") {
    const mergeSort = (left: number, right: number) => {
      if (right - left < 2) return;
      const middle = Math.floor((left + right) / 2);
      mergeSort(left, middle);
      mergeSort(middle, right);
      const merged: number[] = [];
      let first = left;
      let second = middle;
      while (first < middle || second < right) {
        if (first >= middle) merged.push(values[second++]);
        else if (second >= right) merged.push(values[first++]);
        else {
          comparisons++;
          add("compare", `Compare ${values[first]} and ${values[second]} while merging.`, [first, second]);
          merged.push(values[first] <= values[second] ? values[first++] : values[second++]);
        }
      }
      merged.forEach((value, offset) => {
        values[left + offset] = value;
        swaps++;
        add("swap", `Write ${value} into position ${left + offset} in the merged run.`, [left + offset]);
      });
    };
    mergeSort(0, values.length);
  } else if (algorithmId === "quick") {
    const partition = (low: number, high: number): number => {
      const pivot = values[high];
      let boundary = low;
      for (let index = low; index < high; index++) {
        comparisons++;
        add("compare", `Compare ${values[index]} with pivot ${pivot}.`, [index, high]);
        if (values[index] < pivot) {
          [values[boundary], values[index]] = [values[index], values[boundary]];
          swaps++;
          add("swap", `Move ${values[boundary]} left of the pivot.`, [boundary, index]);
          boundary++;
        }
      }
      [values[boundary], values[high]] = [values[high], values[boundary]];
      swaps++;
      add("swap", `Place pivot ${pivot} at its final position.`, [boundary, high]);
      return boundary;
    };
    const quickSort = (low: number, high: number) => {
      if (low >= high) return;
      const pivotIndex = partition(low, high);
      quickSort(low, pivotIndex - 1);
      quickSort(pivotIndex + 1, high);
    };
    quickSort(0, values.length - 1);
  } else {
    const sorted: number[] = [0];
    for (let i = 1; i < values.length; i++) { let j = i; while (j > 0) { comparisons++; add("compare", `Compare ${values[j - 1]} with ${values[j]}.`, [j - 1, j], sorted); if (values[j - 1] <= values[j]) break; [values[j - 1], values[j]] = [values[j], values[j - 1]]; swaps++; add("swap", `Shift ${values[j]} right to insert the value.`, [j - 1, j], sorted); j--; } sorted.push(i); }
  }
  add("complete", `${name} completed.`, [], Array.from({ length: values.length }, (_, index) => index));
  return { algorithmId, inputLabel: "Array · [42, 18, 64, 9, 31, 56, 23]", steps, completed: true };
}

export const runBubbleSort = () => sortExecution("bubble", "Bubble Sort");
export const runSelectionSort = () => sortExecution("selection", "Selection Sort");
export const runInsertionSort = () => sortExecution("insertion", "Insertion Sort");
export const runMergeSort = () => sortExecution("merge", "Merge Sort");
export const runQuickSort = () => sortExecution("quick", "Quick Sort");
