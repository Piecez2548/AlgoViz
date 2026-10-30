import { runAStar, runBellmanFord, runDijkstra } from "./pathfinding/pathfindingAlgorithms";
import { runBfs, runDfs, runGreedyBestFirst } from "./search/searchAlgorithms";
import type { GraphInput } from "./shared/graphTypes";
import type { AlgorithmExecution } from "./shared/types";
import { runKruskal } from "./spanning/spanningAlgorithms";
import { runBubbleSort, runHeapSort, runInsertionSort, runMergeSort, runQuickSort, runSelectionSort } from "./sorting/sortingAlgorithms";

export interface GraphAlgorithm { id: string; name: string; /** Short label for chart lines. */ short: string; run: (graph: GraphInput) => AlgorithmExecution }
export interface SortAlgorithm { id: string; name: string; /** Short label for chart lines. */ short: string; run: (values: readonly number[]) => AlgorithmExecution }

export const SEARCH_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "bfs", name: "Breadth-First Search", short: "BFS", run: (graph) => runBfs(graph) },
  { id: "dfs", name: "Depth-First Search", short: "DFS", run: (graph) => runDfs(graph) },
  { id: "greedy-best-first", name: "Greedy Best-First Search", short: "Greedy", run: (graph) => runGreedyBestFirst(graph) },
];

export const PATHFINDING_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "dijkstra", name: "Dijkstra's Algorithm", short: "Dijkstra", run: (graph) => runDijkstra(graph) },
  { id: "a-star", name: "A* Search", short: "A*", run: (graph) => runAStar(graph) },
  { id: "bellman-ford", name: "Bellman-Ford", short: "Bellman-Ford", run: (graph) => runBellmanFord(graph) },
];

export const SPANNING_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "kruskal", name: "Kruskal's Algorithm", short: "Kruskal", run: (graph) => runKruskal(graph) },
];

/** Everything that finds a route from a start to a goal, so any of them can be compared on one map. */
export const ROUTE_ALGORITHMS: readonly GraphAlgorithm[] = [...SEARCH_ALGORITHMS, ...PATHFINDING_ALGORITHMS];

export const SORTING_ALGORITHMS: readonly SortAlgorithm[] = [
  { id: "bubble", name: "Bubble Sort", short: "Bubble", run: (values) => runBubbleSort(values) },
  { id: "selection", name: "Selection Sort", short: "Selection", run: (values) => runSelectionSort(values) },
  { id: "insertion", name: "Insertion Sort", short: "Insertion", run: (values) => runInsertionSort(values) },
  { id: "merge", name: "Merge Sort", short: "Merge", run: (values) => runMergeSort(values) },
  { id: "quick", name: "Quick Sort", short: "Quick", run: (values) => runQuickSort(values) },
  { id: "heap", name: "Heap Sort", short: "Heap", run: (values) => runHeapSort(values) },
];
