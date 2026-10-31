import { runAStar, runBellmanFord, runDijkstra, runFloydWarshall } from "./pathfinding/pathfindingAlgorithms";
import { runBfs, runBidirectionalBfs, runDfs, runGreedyBestFirst } from "./search/searchAlgorithms";
import { runBinarySearch, runLinearSearch } from "./searching/arraySearchAlgorithms";
import type { GraphInput } from "./shared/graphTypes";
import type { AlgorithmExecution } from "./shared/types";
import { runEdmondsKarp, runFordFulkerson } from "./flow/maxFlow";
import { runKosaraju, runTarjan } from "./connectivity/stronglyConnected";
import { runDfsTopological, runKahn } from "./ordering/orderingAlgorithms";
import { runKruskal, runPrim } from "./spanning/spanningAlgorithms";
import { runBubbleSort, runCountingSort, runHeapSort, runInsertionSort, runMergeSort, runQuickSort, runRadixSort, runSelectionSort, runShellSort } from "./sorting/sortingAlgorithms";

export interface GraphAlgorithm { id: string; name: string; /** Short label for chart lines. */ short: string; run: (graph: GraphInput) => AlgorithmExecution }
export interface SortAlgorithm { id: string; name: string; /** Short label for chart lines. */ short: string; run: (values: readonly number[]) => AlgorithmExecution }
export interface ArraySearchAlgorithm { id: string; name: string; short: string; run: (values: readonly number[], target: number) => AlgorithmExecution }

export const SEARCH_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "bfs", name: "Breadth-First Search", short: "BFS", run: (graph) => runBfs(graph) },
  { id: "dfs", name: "Depth-First Search", short: "DFS", run: (graph) => runDfs(graph) },
  { id: "bidirectional-bfs", name: "Bidirectional BFS", short: "Bi-BFS", run: (graph) => runBidirectionalBfs(graph) },
  { id: "greedy-best-first", name: "Greedy Best-First Search", short: "Greedy", run: (graph) => runGreedyBestFirst(graph) },
];

export const PATHFINDING_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "dijkstra", name: "Dijkstra's Algorithm", short: "Dijkstra", run: (graph) => runDijkstra(graph) },
  { id: "a-star", name: "A* Search", short: "A*", run: (graph) => runAStar(graph) },
  { id: "bellman-ford", name: "Bellman-Ford", short: "Bellman-Ford", run: (graph) => runBellmanFord(graph) },
  { id: "floyd-warshall", name: "Floyd-Warshall", short: "Floyd-Warshall", run: (graph) => runFloydWarshall(graph) },
];

export const SPANNING_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "kruskal", name: "Kruskal's Algorithm", short: "Kruskal", run: (graph) => runKruskal(graph) },
  { id: "prim", name: "Prim's Algorithm", short: "Prim", run: (graph) => runPrim(graph) },
];

/** Ways to find the most flow a network of capacities can carry. */
export const FLOW_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "edmonds-karp", name: "Edmonds-Karp", short: "Edmonds-Karp", run: (graph) => runEdmondsKarp(graph) },
  { id: "ford-fulkerson", name: "Ford-Fulkerson (depth-first)", short: "Ford-Fulkerson", run: (graph) => runFordFulkerson(graph) },
];

/** Ways to split a directed graph into groups of nodes that can all reach each other. */
export const COMPONENT_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "tarjan", name: "Tarjan's Algorithm", short: "Tarjan", run: (graph) => runTarjan(graph) },
  { id: "kosaraju", name: "Kosaraju's Algorithm", short: "Kosaraju", run: (graph) => runKosaraju(graph) },
];

/** Ways to put tasks in an order so every task comes after the ones it depends on. */
export const ORDERING_ALGORITHMS: readonly GraphAlgorithm[] = [
  { id: "kahn", name: "Kahn's Algorithm", short: "Kahn", run: (graph) => runKahn(graph) },
  { id: "dfs-topological", name: "Depth-First Ordering", short: "DFS order", run: (graph) => runDfsTopological(graph) },
];

/** Shortest-path algorithms for directed graphs with negative weights. Dijkstra is included to show where it goes wrong. */
export const NEGATIVE_ALGORITHMS: readonly GraphAlgorithm[] = ["bellman-ford", "floyd-warshall", "dijkstra"].map((id) => PATHFINDING_ALGORITHMS.find((algorithm) => algorithm.id === id)!);

/** Everything that finds a route from a start to a goal, so any of them can be compared on one map. */
export const ROUTE_ALGORITHMS: readonly GraphAlgorithm[] = [...SEARCH_ALGORITHMS, ...PATHFINDING_ALGORITHMS];

export const SORTING_ALGORITHMS: readonly SortAlgorithm[] = [
  { id: "bubble", name: "Bubble Sort", short: "Bubble", run: (values) => runBubbleSort(values) },
  { id: "selection", name: "Selection Sort", short: "Selection", run: (values) => runSelectionSort(values) },
  { id: "insertion", name: "Insertion Sort", short: "Insertion", run: (values) => runInsertionSort(values) },
  { id: "shell", name: "Shell Sort", short: "Shell", run: (values) => runShellSort(values) },
  { id: "counting", name: "Counting Sort", short: "Counting", run: (values) => runCountingSort(values) },
  { id: "radix", name: "Radix Sort", short: "Radix", run: (values) => runRadixSort(values) },
  { id: "merge", name: "Merge Sort", short: "Merge", run: (values) => runMergeSort(values) },
  { id: "quick", name: "Quick Sort", short: "Quick", run: (values) => runQuickSort(values) },
  { id: "heap", name: "Heap Sort", short: "Heap", run: (values) => runHeapSort(values) },
];

export const ARRAY_SEARCH_ALGORITHMS: readonly ArraySearchAlgorithm[] = [
  { id: "binary-search", name: "Binary search", short: "Binary", run: (values, target) => runBinarySearch(values, target) },
  { id: "linear-search", name: "Linear search", short: "Linear", run: (values, target) => runLinearSearch(values, target) },
];
