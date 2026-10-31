import { describe, expect, it } from "vitest";
import { COMPONENT_ALGORITHMS, FLOW_ALGORITHMS, ROUTE_ALGORITHMS, SPANNING_ALGORITHMS, SORTING_ALGORITHMS } from "../registry";
import { runBinarySearch, runLinearSearch } from "../searching/arraySearchAlgorithms";
import { FLOW_SAMPLE, gridToGraph, SAMPLE_GRAPH, SCC_SAMPLE } from "./graph";
import { defaultGrid } from "./graph";
import type { GraphInput } from "./graphTypes";
import type { AlgorithmExecution } from "./types";
import { canPredict, questionAt } from "./predict";

const all = (id: string, execution: Parameters<typeof questionAt>[1], graph?: Parameters<typeof questionAt>[3]) =>
  execution.steps.flatMap((_, index) => { const question = questionAt(id, execution, index, graph); return question ? [{ index, question }] : []; });

describe("predict questions", () => {
  it("only offers questions for algorithms where they describe the run exactly", () => {
    expect(canPredict("dijkstra")).toBe(true);
    expect(canPredict("mystery")).toBe(false);
    for (const id of ["selection", "quick", "merge", "heap", "counting", "radix", "linear-search", "bellman-ford", "floyd-warshall"]) expect(canPredict(id)).toBe(true);
    expect(all("mystery", SORTING_ALGORITHMS[0].run([5, 3, 9, 1]))).toEqual([]);
  });

  it.each(["bfs", "dfs", "bidirectional-bfs", "greedy-best-first", "dijkstra", "a-star"])("%s: the correct option is the node taken next and the prompt does not reveal it", (id) => {
    const graph = gridToGraph(defaultGrid());
    const execution = ROUTE_ALGORITHMS.find((algorithm) => algorithm.id === id)!.run(graph);
    const questions = all(id, execution, graph);
    expect(questions.length).toBeGreaterThan(5);
    for (const { index, question } of questions) {
      const next = execution.steps[index + 1];
      expect(question.options[question.answer]).toBe(next.currentNode);
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.options.length).toBeLessThanOrEqual(4);
      expect(question.prompt).not.toContain(next.currentNode!);
      // Candidates are nodes that were not visited yet.
      for (const option of question.options) expect(execution.steps[index].visited ?? []).not.toContain(option);
    }
  });

  it.each(["bubble", "insertion", "shell"])("%s: 'swap?' is answered by what the next step really does", (id) => {
    const execution = SORTING_ALGORITHMS.find((algorithm) => algorithm.id === id)!.run([42, 18, 64, 9, 31, 56, 23, 7]);
    const questions = all(id, execution);
    expect(questions.length).toBeGreaterThan(10);
    for (const { index, question } of questions) {
      const before = execution.steps[index].values!; const after = execution.steps[index + 1].values!;
      const [a, b] = execution.steps[index].highlightIndices!;
      expect(before[a] > before[b] ? 0 : 1).toBe(question.answer === 0 && after[a] === before[b] && after[b] === before[a] ? 0 : 1);
      expect(question.options).toEqual(["Yes, swap them", "No, leave them"]);
    }
    expect(questions.some(({ question }) => question.answer === 0)).toBe(true);
    expect(questions.some(({ question }) => question.answer === 1)).toBe(true);
  });

  it("kruskal: keep or skip matches the next step, and both answers occur", () => {
    const execution = SPANNING_ALGORITHMS.find((algorithm) => algorithm.id === "kruskal")!.run(SAMPLE_GRAPH);
    const questions = all("kruskal", execution, SAMPLE_GRAPH);
    expect(questions).toHaveLength(SAMPLE_GRAPH.edges.length);
    expect(questions.map(({ question }) => question.options[question.answer])).toContain("Skip it");
    for (const { index, question } of questions) expect(question.options[question.answer] === "Keep it").toBe(execution.steps[index + 1].type === "accept");
  });

  it("prim: names the node that joins the tree, chosen among the nodes next to the tree", () => {
    const execution = SPANNING_ALGORITHMS.find((algorithm) => algorithm.id === "prim")!.run(SAMPLE_GRAPH);
    const questions = all("prim", execution, SAMPLE_GRAPH);
    // The last round has only one node left to join, so there is nothing to choose and no question.
    expect(questions.length).toBeGreaterThanOrEqual(SAMPLE_GRAPH.nodes.length - 3);
    for (const { index, question } of questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      const joined = question.options[question.answer];
      expect(execution.steps[index + 2].type).toBe("accept");
      expect(execution.steps[index + 2].currentNode).toBe(joined);
    }
  });

  it("binary search: the half to keep matches the recorded range, including found and not found", () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80];
    for (const target of [10, 45, 80, 5, 90, 40]) {
      const execution = runBinarySearch(values, target);
      for (const { index, question } of all("binary-search", execution)) {
        const probe = execution.steps[index + 1]; const after = execution.steps[index + 2];
        const answer = question.options[question.answer];
        if (after.type === "complete") expect(answer).toBe(after.highlightIndices!.length ? "Found it" : "Nothing is left");
        else expect(answer).toBe(after.activeRange![0] > probe.activeRange![0] ? "Keep the right half" : "Keep the left half");
        expect(question.prompt).toContain(`The target is ${target}`);
      }
    }
  });
});

describe("predict questions for the other sorts and searches", () => {
  const sortRun = (id: string, input: number[]) => SORTING_ALGORITHMS.find((algorithm) => algorithm.id === id)!.run(input);
  const input = [42, 18, 64, 9, 31, 56, 23, 7, 50];

  it("selection, quick and heap ask a yes/no about the comparison on screen, and both answers occur", () => {
    for (const id of ["selection", "quick", "heap"]) {
      const execution = sortRun(id, input);
      const questions = all(id, execution);
      expect(questions.length).toBeGreaterThan(8);
      expect(new Set(questions.map(({ question }) => question.answer)).size).toBe(2);
      for (const { index, question } of questions) {
        const [a, b] = execution.steps[index].highlightIndices!; const v = execution.steps[index].values!;
        const expected = id === "selection" ? v[b] < v[a] : id === "quick" ? v[a] < v[b] : v[b] > v[a];
        expect(question.answer).toBe(expected ? 0 : 1);
        expect(question.options).toEqual(["Yes", "No"]);
      }
    }
  });

  it("quick sort: 'smaller than the pivot' agrees with the swap that follows", () => {
    const execution = sortRun("quick", input);
    for (const { index, question } of all("quick", execution)) {
      const next = execution.steps[index + 1];
      // A smaller value is moved to the left side; otherwise the next step is not that move.
      expect(/left of the pivot/.test(next.explanation)).toBe(question.answer === 0);
    }
  });

  it("merge: names the run that is written first, which matches the write that follows", () => {
    const execution = sortRun("merge", input);
    const questions = all("merge", execution);
    expect(questions.length).toBeGreaterThan(8);
    for (const { index, question } of questions) {
      const [a, b] = execution.steps[index].highlightIndices!; const v = execution.steps[index].values!;
      expect(question.answer).toBe(v[a] <= v[b] ? 0 : 1);
      expect(question.options[question.answer]).toContain(String(v[a] <= v[b] ? v[a] : v[b]));
    }
  });

  it("counting: the count after the next value is exactly what the next step records", () => {
    const execution = sortRun("counting", [3, 1, 3, 2, 1, 3]);
    const questions = all("counting", execution);
    // The very first count has no step before it, so five of the six counts can be asked about.
    expect(questions).toHaveLength(5);
    expect(questions.map(({ question }) => question.options[question.answer])).toEqual(["1", "2", "1", "2", "3"]);
    for (const { question } of questions) expect(new Set(question.options).size).toBe(question.options.length);
  });

  it("radix: the bucket is the digit the next step reports", () => {
    const execution = sortRun("radix", [170, 45, 75, 90, 802, 24, 2, 66]);
    const questions = all("radix", execution);
    expect(questions.length).toBe(8 * 3 - 1);
    for (const { index, question } of questions) {
      const digit = /it is (\d)/.exec(execution.steps[index + 1].explanation)![1];
      expect(question.options[question.answer]).toBe(digit);
      expect(question.options).toHaveLength(4);
    }
  });

  it("linear search: 'is it a match?' is yes only at the target", () => {
    const execution = runLinearSearch([10, 20, 30, 40, 50], 30);
    const questions = all("linear-search", execution);
    expect(questions.map(({ question }) => question.options[question.answer])).toEqual(["No", "Yes"]);
  });

  it("floyd-warshall: says whether routes through the next node shorten any distance from the start", () => {
    const execution = ROUTE_ALGORITHMS.find((algorithm) => algorithm.id === "floyd-warshall")!.run(SAMPLE_GRAPH);
    const questions = all("floyd-warshall", execution, SAMPLE_GRAPH);
    expect(questions).toHaveLength(SAMPLE_GRAPH.nodes.length);
    for (const { index, question } of questions) expect(question.options[question.answer] === "Yes").toBe(execution.steps[index + 1].type === "update");
    expect(new Set(questions.map(({ question }) => question.answer)).size).toBe(2);
  });

  it("bellman-ford: the node that improves next is among the nodes next to ones already reached", () => {
    const execution = ROUTE_ALGORITHMS.find((algorithm) => algorithm.id === "bellman-ford")!.run(SAMPLE_GRAPH);
    const questions = all("bellman-ford", execution, SAMPLE_GRAPH);
    expect(questions.length).toBeGreaterThan(3);
    for (const { index, question } of questions) expect(question.options[question.answer]).toBe(execution.steps[index + 1].targetNode);
  });
});

describe("predict questions for components and flow", () => {
  const run = (algorithms: readonly { id: string; run: (graph: GraphInput) => AlgorithmExecution }[], id: string, graph: GraphInput) => algorithms.find((algorithm) => algorithm.id === id)!.run(graph);

  it.each(["tarjan", "kosaraju"])("%s: the correct option is the node reached next, and it is never a node already placed", (id) => {
    const execution = run(COMPONENT_ALGORITHMS, id, SCC_SAMPLE);
    const questions = all(id, execution, SCC_SAMPLE);
    expect(questions.length).toBeGreaterThan(5);
    for (const { index, question } of questions) {
      const next = execution.steps[index + 1];
      expect(question.options[question.answer]).toBe(next.currentNode);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.prompt).not.toContain(next.currentNode!);
    }
    if (id === "kosaraju") expect(questions.some(({ question }) => question.prompt === "Which node joins a component next?")).toBe(true);
  });

  it.each(["edmonds-karp", "ford-fulkerson"])("%s: the answer is the room on the path that the next round announces", (id) => {
    const execution = run(FLOW_ALGORITHMS, id, FLOW_SAMPLE);
    const questions = all(id, execution, FLOW_SAMPLE);
    expect(questions.length).toBeGreaterThanOrEqual(3);
    for (const { index, question } of questions) {
      const room = execution.steps[index + 1].dataStructure!.find((entry) => entry.label === "Room on it")!.value;
      expect(question.options[question.answer]).toBe(String(room));
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options.length).toBeLessThanOrEqual(4);
      // The question is asked before the round, so the explanation that names the path is not on the question.
      expect(question.prompt).not.toMatch(/→/);
    }
    expect(questions[0].question.prompt).toContain(id === "edmonds-karp" ? "fewest edges" : "depth-first");
  });
});
