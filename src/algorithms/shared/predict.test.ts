import { describe, expect, it } from "vitest";
import { ROUTE_ALGORITHMS, SPANNING_ALGORITHMS, SORTING_ALGORITHMS } from "../registry";
import { runBinarySearch } from "../searching/arraySearchAlgorithms";
import { gridToGraph, SAMPLE_GRAPH } from "./graph";
import { defaultGrid } from "./graph";
import { canPredict, questionAt } from "./predict";

const all = (id: string, execution: Parameters<typeof questionAt>[1], graph?: Parameters<typeof questionAt>[3]) =>
  execution.steps.flatMap((_, index) => { const question = questionAt(id, execution, index, graph); return question ? [{ index, question }] : []; });

describe("predict questions", () => {
  it("only offers questions for algorithms where they describe the run exactly", () => {
    expect(canPredict("dijkstra")).toBe(true);
    expect(canPredict("heap")).toBe(false);
    expect(canPredict("bellman-ford")).toBe(false);
    const heap = SORTING_ALGORITHMS.find((algorithm) => algorithm.id === "heap")!.run([5, 3, 9, 1]);
    expect(all("heap", heap)).toEqual([]);
    const bellman = ROUTE_ALGORITHMS.find((algorithm) => algorithm.id === "bellman-ford")!.run(SAMPLE_GRAPH);
    expect(all("bellman-ford", bellman, SAMPLE_GRAPH)).toEqual([]);
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
