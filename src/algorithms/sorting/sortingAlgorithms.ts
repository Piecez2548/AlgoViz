import { createAlgorithmStep } from "../shared/utils";
import type { AlgorithmExecution, AlgorithmStep } from "../shared/types";

export const SORT_SAMPLE: readonly number[] = [42, 18, 64, 9, 31, 56, 23];

function sortExecution(algorithmId: string, name: string, input: readonly number[]): AlgorithmExecution {
  const values = [...input]; const steps: AlgorithmStep[] = []; let comparisons = 0; let swaps = 0;
  const extra: { label: string; value: string | number }[] = [];
  const add = (type: "compare" | "swap" | "visit" | "complete", explanation: string, indices: number[] = [], sortedIndices: number[] = [], line?: number) => steps.push(createAlgorithmStep(steps.length, type, explanation, { ...(line === undefined ? {} : { line }), values: [...values], highlightIndices: indices, sortedIndices, dataStructure: [{ label: "Array", value: values.join(", ") }, ...extra], metrics: { comparisons, swaps, operations: comparisons + swaps } }));
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
  } else if (algorithmId === "counting") {
    // No comparisons at all: count how many times each value occurs, then write the values back in order.
    const counts = new Map<number, number>();
    const tally = () => [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([value, count]) => `${value}×${count}`).join(", ");
    values.forEach((value, index) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      extra[0] = { label: "Counts", value: tally() };
      add("visit", `Count ${value}: it has now been seen ${counts.get(value)} time${counts.get(value) === 1 ? "" : "s"}.`, [index]);
    });
    const done: number[] = []; let position = 0;
    for (const [value, count] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
      for (let copy = 0; copy < count; copy++) {
        values[position] = value; swaps++; done.push(position);
        add("swap", `Write ${value} into position ${position}. The counts remember every original value, so overwriting is safe.`, [position], done);
        position++;
      }
    }
  } else if (algorithmId === "radix") {
    // Least-significant-digit radix sort: sort by the ones digit, then tens, then hundreds, keeping earlier order for equal digits.
    const largest = Math.max(...values);
    for (let place = 1; Math.floor(largest / place) > 0; place *= 10) {
      const digitOf = (value: number) => Math.floor(value / place) % 10;
      const buckets: number[][] = Array.from({ length: 10 }, () => []);
      const lastPass = place * 10 > largest;
      const name = place === 1 ? "ones" : place === 10 ? "tens" : "hundreds";
      values.forEach((value, index) => {
        buckets[digitOf(value)].push(value);
        extra[0] = { label: "Buckets", value: buckets.map((bucket, digit) => (bucket.length ? `${digit}: ${bucket.join(" ")}` : "")).filter(Boolean).join(" | ") };
        add("visit", `Look at the ${name} digit of ${value}: it is ${digitOf(value)}, so ${value} goes into bucket ${digitOf(value)}.`, [index], [], 2);
      });
      extra.length = 0;
      const done: number[] = []; let position = 0;
      for (const bucket of buckets) for (const value of bucket) {
        values[position] = value; swaps++; if (lastPass) done.push(position);
        add("swap", `Collect ${value} from its bucket into position ${position}.`, [position], done, 3);
        position++;
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
export const runCountingSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("counting", "Counting Sort", input);
export const runRadixSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("radix", "Radix Sort", input);
export const runQuickSort = (input: readonly number[] = SORT_SAMPLE) => sortExecution("quick", "Quick Sort", input);
