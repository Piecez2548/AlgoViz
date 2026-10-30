import { createAlgorithmStep } from "../shared/utils";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";

export const SORT_SAMPLE: readonly number[] = [42, 18, 64, 9, 31, 56, 23];

function sortExecution(algorithmId: string, name: string, input: readonly number[]): AlgorithmExecution {
  const values = [...input]; const steps: AlgorithmStep[] = []; let comparisons = 0; let swaps = 0;
  const add = (type: "compare" | "swap" | "complete", explanation: string, indices: number[] = [], sortedIndices: number[] = [], line?: number) => steps.push(createAlgorithmStep(steps.length, type, explanation, { ...(line === undefined ? {} : { line }), values: [...values], highlightIndices: indices, sortedIndices, dataStructure: [{ label: "Array", value: values.join(", ") }], metrics: { comparisons, swaps, operations: comparisons + swaps } }));
  if (algorithmId === "bubble") {
    const sorted: number[] = [];
    for (let end = values.length - 1; end > 0; end--) {
      for (let i = 0; i < end; i++) {
        comparisons++; add("compare", `Compare ${values[i]} and ${values[i + 1]}.`, [i, i + 1], sorted);
        if (values[i] > values[i + 1]) { [values[i], values[i + 1]] = [values[i + 1], values[i]]; swaps++; add("swap", `Swap them so the larger value moves right.`, [i, i + 1], sorted); }
      }
      // Each pass settles the largest remaining value at the end of the unsorted part.
      sorted.push(end);
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
  } else if (algorithmId === "heap") {
    const sorted: number[] = [];
    const siftDown = (start: number, size: number) => {
      let root = start;
      for (;;) {
        let largest = root;
        const left = 2 * root + 1;
        const right = left + 1;
        if (left < size) {
          comparisons++;
          add("compare", `Compare parent ${values[largest]} with left child ${values[left]}.`, [largest, left], sorted);
          if (values[left] > values[largest]) largest = left;
        }
        if (right < size) {
          comparisons++;
          add("compare", `Compare ${values[largest]} with right child ${values[right]}.`, [largest, right], sorted);
          if (values[right] > values[largest]) largest = right;
        }
        if (largest === root) return;
        [values[root], values[largest]] = [values[largest], values[root]];
        swaps++;
        add("swap", `Swap so the larger value ${values[root]} sits above ${values[largest]}.`, [root, largest], sorted);
        root = largest;
      }
    };
    // Phase 1: turn the array into a max-heap, working from the last parent up to the root.
    for (let start = Math.floor(values.length / 2) - 1; start >= 0; start--) siftDown(start, values.length);
    // Phase 2: repeatedly move the largest value (the root) to the end and repair the smaller heap.
    for (let end = values.length - 1; end > 0; end--) {
      [values[0], values[end]] = [values[end], values[0]];
      swaps++;
      sorted.push(end);
      add("swap", `Move the largest value ${values[end]} to its final place.`, [0, end], sorted, 2);
      siftDown(0, end);
    }
  } else if (algorithmId === "shell") {
    // Insertion sort on values a "gap" apart; the gap halves until it is 1, so far-away values move early.
    for (let gap = Math.floor(values.length / 2); gap >= 1; gap = Math.floor(gap / 2)) {
      for (let i = gap; i < values.length; i++) {
        for (let j = i; j >= gap; j -= gap) {
          comparisons++;
          add("compare", `Gap ${gap}: compare ${values[j - gap]} with ${values[j]}.`, [j - gap, j]);
          if (values[j - gap] <= values[j]) break;
          [values[j - gap], values[j]] = [values[j], values[j - gap]];
          swaps++;
          add("swap", `Swap them so the smaller value moves ${gap === 1 ? "left" : `${gap} places left`}.`, [j - gap, j]);
        }
      }
    }
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
  return { algorithmId, inputLabel: `Array · [${input.join(", ")}]`, steps, completed: true };
}

export const runBubbleSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("bubble", "Bubble Sort", input);
export const runSelectionSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("selection", "Selection Sort", input);
export const runInsertionSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("insertion", "Insertion Sort", input);
export const runMergeSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("merge", "Merge Sort", input);
export const runHeapSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("heap", "Heap Sort", input);
export const runShellSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("shell", "Shell Sort", input);
export const runQuickSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("quick", "Quick Sort", input);
