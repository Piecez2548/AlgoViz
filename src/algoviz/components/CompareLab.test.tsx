import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path = "/compare") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const verdictText = () => document.querySelector(".algoviz-compare-verdict")?.textContent ?? "";
const resultsTable = () => screen.getByRole("table", { name: /Results on the same input/ });
const cell = (row: string, column: string) => {
  const table = resultsTable();
  const index = within(table).getAllByRole("columnheader").findIndex((header) => header.textContent === column);
  const exact = within(table).getAllByRole("row").find((candidate) => within(candidate).queryByRole("rowheader")?.textContent === row);
  if (!exact) throw new Error(`No row named ${row}`);
  return within(exact).getAllByRole("cell")[index - 1].textContent ?? "";
};

describe("compare: same input", () => {
  it("measures real runs on the numbers you type", () => {
    open();
    fireEvent.change(screen.getByLabelText("Your numbers"), { target: { value: "3, 2, 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Use these numbers" }));
    expect(cell("Bubble Sort", "Comparisons")).toContain("3");
    expect(cell("Bubble Sort", "Swaps or writes")).toContain("3");
    expect(verdictText()).toMatch(/made the (fewest|most) comparisons|All made/);
    expect(screen.getByTestId("search").textContent).toContain("values=3%2C2%2C1");
  });

  it("marks the lowest value in each column and explains the verdict from the numbers", () => {
    open("/compare?values=9,8,7,6,5,4,3,2,1");
    const verdict = verdictText();
    // Reversed data: bubble and quick sort tie for the most (9 × 8 ÷ 2 = 36), so both are named.
    expect(verdict).toBe("Merge Sort made the fewest comparisons (16); Bubble Sort and Quick Sort made the most (36).");
    expect(within(resultsTable()).getAllByText("lowest").length).toBeGreaterThan(0);
  });

  it("lets you add and remove algorithms but keeps at least two", () => {
    open();
    const checkboxes = () => screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes().filter((box) => box.checked)).toHaveLength(3);
    fireEvent.click(screen.getByLabelText("Heap Sort"));
    expect(within(resultsTable()).getByText("Heap Sort")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Heap Sort"));
    fireEvent.click(screen.getByLabelText("Quick Sort"));
    expect(checkboxes().filter((box) => box.checked)).toHaveLength(2);
    for (const box of checkboxes().filter((item) => item.checked)) expect(box).toBeDisabled();
  });

  it("compares search and shortest-path algorithms on one map and reports the route costs", () => {
    open();
    fireEvent.click(screen.getByLabelText("Search and shortest paths"));
    expect(verdictText()).toMatch(/All found routes cost 7/);
    expect(cell("Dijkstra's Algorithm", "Route cost")).toContain("7");
    fireEvent.click(screen.getByLabelText("Greedy Best-First Search"));
    expect(within(resultsTable()).getByText("Greedy Best-First Search")).toBeInTheDocument();
  });

  it("says when no algorithm can reach the goal on a drawn map", () => {
    open();
    fireEvent.click(screen.getByLabelText("Search and shortest paths"));
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "grid" } });
    for (const id of ["J5", "L5", "K4", "K6"]) fireEvent.keyDown(screen.getByRole("gridcell", { name: new RegExp(`^${id},`) }), { key: "Enter" });
    expect(verdictText()).toMatch(/No route exists/);
    expect(cell("A* Search", "Route cost")).toBe("No route");
  });
});

describe("compare: growth chart", () => {
  it("draws one line per chosen algorithm from real measurements, with the numbers available as a table", async () => {
    open();
    const chart = screen.getByRole("img", { name: /Comparisons against numbers to sort/ });
    await waitFor(() => expect(chart.querySelectorAll("[data-series]")).toHaveLength(3));
    fireEvent.click(screen.getByText("Show the numbers behind the chart"));
    const data = screen.getByRole("table", { name: /Comparisons by numbers to sort/ });
    const rows = within(data).getAllByRole("row");
    expect(rows).toHaveLength(1 + 6);
    const lastRow = within(rows.at(-1)!).getAllByRole("cell").map((item) => item.textContent);
    // 64 numbers: bubble sort makes exactly 64 × 63 ÷ 2 comparisons.
    expect(lastRow[0]).toBe("2,016");
  });

  it("changes the chart when the data shape or measure changes", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Data shape"), { target: { value: "sorted" } });
    await waitFor(() => expect(screen.getByText(/already sorted data is its worst case/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Measure"), { target: { value: "swaps" } });
    await waitFor(() => expect(screen.getByRole("img", { name: /Swaps or writes against/ })).toBeInTheDocument());
    expect(screen.queryByText(/already sorted data is its worst case/)).not.toBeInTheDocument();
  });

  it("offers a log scale and notes that zero cannot be drawn on it", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Data shape"), { target: { value: "sorted" } });
    fireEvent.change(screen.getByLabelText("Measure"), { target: { value: "swaps" } });
    fireEvent.click(screen.getByLabelText(/Log \(shows growth rate\)/));
    await waitFor(() => expect(screen.getByText(/log scale cannot show zero/)).toBeInTheDocument());
    expect(screen.getByText(/\(log scale\)/)).toBeInTheDocument();
  });

  it("shows A* pulling away from Dijkstra as the map grows", async () => {
    open();
    fireEvent.click(screen.getByLabelText("Search and shortest paths"));
    await waitFor(() => expect(screen.getByRole("img", { name: /Nodes visited against map cells/ })).toBeInTheDocument());
    fireEvent.click(screen.getByText("Show the numbers behind the chart"));
    const data = screen.getByRole("table", { name: /Nodes visited by map cells/ });
    const headers = within(data).getAllByRole("columnheader").map((header) => header.textContent);
    const last = within(within(data).getAllByRole("row").at(-1)!).getAllByRole("cell").map((item) => Number(item.textContent!.replace(/,/g, "")));
    expect(last[headers.indexOf("A* Search") - 1]).toBeLessThan(last[headers.indexOf("Dijkstra's Algorithm") - 1] / 4);
    expect(screen.getByText(/A\* heads straight for the goal/)).toBeInTheDocument();
  });
});

describe("compare: spanning trees", () => {
  const pickTrees = () => fireEvent.click(screen.getByLabelText("Spanning trees"));

  it("shows Prim and Kruskal building the same tree with different amounts of checking", () => {
    open();
    pickTrees();
    expect(screen.getByText(/Comparing Kruskal.s Algorithm and Prim.s Algorithm./)).toBeInTheDocument();
    expect(verdictText()).toBe("Both built a tree of weight 10 from 5 edges. Kruskal's Algorithm made the fewest edge checks (7); Prim's Algorithm made the most (13).");
    expect(cell("Kruskal's Algorithm", "Edge checks")).toContain("7");
    expect(cell("Kruskal's Algorithm", "Total weight")).toBe(cell("Prim's Algorithm", "Total weight"));
    // Weight and edge count are the answer, not the effort: never labelled lowest.
    expect(cell("Kruskal's Algorithm", "Total weight")).not.toContain("lowest");
  });

  it("explains a disconnected custom graph instead of claiming the same tree", () => {
    open();
    pickTrees();
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    fireEvent.click(screen.getByText(/Nodes and edges/));
    for (const edge of ["D–F", "E–F"]) fireEvent.click(screen.getByRole("button", { name: `Remove edge ${edge}` }));
    expect(verdictText()).toMatch(/The graph is not fully connected, so the tree covers only part of it.$/);
    expect(verdictText()).toMatch(/^Both built a tree of weight 9 from 4 edges./);
  });

  it("charts edge checks against graph size and says why Prim pulls away", async () => {
    open();
    pickTrees();
    await waitFor(() => expect(screen.getByRole("img", { name: /Edge checks against nodes in the graph/ })).toBeInTheDocument());
    fireEvent.click(screen.getByText("Show the numbers behind the chart"));
    const data = screen.getByRole("table", { name: /Edge checks by nodes in the graph/ });
    const last = within(within(data).getAllByRole("row").at(-1)!).getAllByRole("cell").map((item) => Number(item.textContent!.replace(/,/g, "")));
    expect(Math.max(...last)).toBeGreaterThan(Math.min(...last) * 5);
    expect(screen.getByText(/Prim looks again at every edge that leaves the tree/)).toBeInTheDocument();
  });
});

describe("compare: searching a list", () => {
  const pickLists = () => fireEvent.click(screen.getByLabelText("Searching a list"));

  it("counts comparisons for the value you choose on the numbers you type", () => {
    open();
    pickLists();
    fireEvent.change(screen.getByLabelText("Your numbers"), { target: { value: "10, 20, 30, 40, 50, 60, 70, 80" } });
    fireEvent.click(screen.getByRole("button", { name: "Use these numbers" }));
    fireEvent.change(screen.getByLabelText("Value to find"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Search for it" }));
    expect(cell("Binary search", "Comparisons")).toContain("4");
    expect(cell("Linear search", "Comparisons")).toContain("8");
    expect(verdictText()).toBe("80 is in the list. Binary search made the fewest comparisons (4); Linear search made the most (8).");
    fireEvent.change(screen.getByLabelText("Value to find"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Search for it" }));
    expect(verdictText()).toMatch(/^5 is not in the list, so every possibility had to be ruled out./);
  });

  it("charts a straight diagonal for linear search and a nearly flat line for binary search", async () => {
    open();
    pickLists();
    await waitFor(() => expect(screen.getByRole("img", { name: /Comparisons against items in the sorted list/ })).toBeInTheDocument());
    fireEvent.click(screen.getByText("Show the numbers behind the chart"));
    const data = screen.getByRole("table", { name: /Comparisons by items in the sorted list/ });
    const headers = within(data).getAllByRole("columnheader").map((header) => header.textContent);
    const last = within(within(data).getAllByRole("row").at(-1)!).getAllByRole("cell").map((item) => item.textContent);
    expect(last[headers.indexOf("Linear search") - 1]).toBe("1,024");
    expect(last[headers.indexOf("Binary search") - 1]).toBe("11");
    expect(screen.getByText(/linear search has to look at every item/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Where is the value?"), { target: { value: "first" } });
    await waitFor(() => expect(screen.getByText(/linear search finds it in one look/)).toBeInTheDocument());
  });
});

describe("compare: negative edges", () => {
  const pickNegative = () => fireEvent.click(screen.getByLabelText("Negative edges"));

  it("shows Dijkstra paying more than Bellman-Ford and Floyd-Warshall on a graph with a negative edge", () => {
    open();
    pickNegative();
    expect(verdictText()).toBe("Bellman-Ford and Floyd-Warshall found the cheapest route (cost 7); Dijkstra's Algorithm paid 9. Dijkstra assumes no edge is negative.");
    expect(cell("Bellman-Ford", "Route cost")).toContain("7");
    expect(cell("Dijkstra's Algorithm", "Route cost")).toContain("9");
    expect(cell("Bellman-Ford", "Route cost")).toContain("lowest");
    expect(document.querySelectorAll("line[marker-end]").length).toBe(7);
  });

  it("shows which algorithms notice a negative cycle and which keep going", () => {
    open();
    pickNegative();
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "cycle" } });
    expect(cell("Bellman-Ford", "Route cost")).toBe("Negative cycle");
    expect(cell("Floyd-Warshall", "Route cost")).toBe("Negative cycle");
    expect(cell("Dijkstra's Algorithm", "Route cost")).not.toBe("Negative cycle");
    expect(verdictText()).toMatch(/^Bellman-Ford and Floyd-Warshall found a negative cycle on the way to the goal, so no route is the cheapest\. Dijkstra's Algorithm still reports a route costing -?\d+\.$/);
  });

  it("lets you drop an algorithm but keeps two, and explains why there is no growth chart", () => {
    open();
    pickNegative();
    fireEvent.click(screen.getByLabelText("Floyd-Warshall"));
    expect(within(resultsTable()).queryByText("Floyd-Warshall")).not.toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    for (const box of boxes.filter((item) => item.checked)) expect(box).toBeDisabled();
    expect(screen.getByText("Why there is no growth chart here")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /against/ })).not.toBeInTheDocument();
  });
});

describe("compare: negative cycle costs", () => {
  it("does not call a cost 'lowest' when a negative cycle means there is no cheapest route", () => {
    open();
    fireEvent.click(screen.getByLabelText("Negative edges"));
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "cycle" } });
    expect(cell("Dijkstra's Algorithm", "Route cost")).not.toContain("lowest");
  });
});

describe("compare: strongly connected components", () => {
  const pickComponents = () => fireEvent.click(screen.getByLabelText("Strongly connected components"));

  it("shows both algorithms finding the same four components, Kosaraju checking more edges", () => {
    open();
    pickComponents();
    expect(screen.getByText(/Comparing Tarjan.s Algorithm and Kosaraju.s Algorithm\./)).toBeInTheDocument();
    expect(verdictText()).toBe("Both found 4 strongly connected components. Tarjan's Algorithm made the fewest edge checks (10); Kosaraju's Algorithm made the most (20).");
    expect(cell("Tarjan's Algorithm", "Components found")).toBe(cell("Kosaraju's Algorithm", "Components found"));
    expect(cell("Tarjan's Algorithm", "Components found")).not.toContain("lowest");
    expect(cell("Tarjan's Algorithm", "Edge checks")).toContain("lowest");
  });

  it("charts edge checks against graph size with Kosaraju twice as high", async () => {
    open();
    pickComponents();
    await waitFor(() => expect(screen.getByRole("img", { name: /Edge checks against nodes in the graph/ })).toBeInTheDocument());
    fireEvent.click(screen.getByText("Show the numbers behind the chart"));
    const data = screen.getByRole("table", { name: /Edge checks by nodes in the graph/ });
    const headers = within(data).getAllByRole("columnheader").map((header) => header.textContent);
    const last = within(within(data).getAllByRole("row").at(-1)!).getAllByRole("cell").map((item) => Number(item.textContent!.replace(/,/g, "")));
    expect(last[headers.indexOf("Kosaraju's Algorithm") - 1]).toBe(2 * last[headers.indexOf("Tarjan's Algorithm") - 1]);
    expect(screen.getByText(/exactly twice as high/)).toBeInTheDocument();
  });
});

describe("compare: maximum flow", () => {
  it("compares the rounds each algorithm needs while both reach the same flow", () => {
    open();
    fireEvent.click(screen.getByLabelText("Maximum flow"));
    expect(screen.getByText(/Comparing Edmonds-Karp and Ford-Fulkerson \(depth-first\)\./)).toBeInTheDocument();
    expect(verdictText()).toMatch(/^Both reach a maximum flow of 23\. /);
    expect(cell("Edmonds-Karp", "Max flow")).toBe(cell("Ford-Fulkerson (depth-first)", "Max flow"));
    expect(cell("Edmonds-Karp", "Max flow")).not.toContain("lowest");
    expect(cell("Edmonds-Karp", "Rounds")).toMatch(/^\d+/);
    expect(screen.getByText("Why there is no growth chart here")).toBeInTheDocument();
  });

  it("opens a flow network from the link", () => {
    open("/compare?family=flow&graph=" + encodeURIComponent("S:10:50,M:50:20,T:90:50~S:M:4,M:T:3~S~T~df"));
    expect(screen.getByLabelText("Maximum flow")).toBeChecked();
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    expect(verdictText()).toMatch(/^Both reach a maximum flow of 3\. Both needed 1 round\./);
  });
});

describe("compare: maximum flow on the depth-first sample", () => {
  it("shows Ford-Fulkerson needing three times the rounds", () => {
    open();
    fireEvent.click(screen.getByLabelText("Maximum flow"));
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "extra" } });
    expect(verdictText()).toMatch(/Edmonds-Karp needed the fewest rounds \(3\); Ford-Fulkerson \(depth-first\) the most \(9\)\.$/);
    expect(cell("Ford-Fulkerson (depth-first)", "Rounds")).toContain("9");
  });
});

describe("compare: bipartite matching", () => {
  it("shows Kuhn matching more pairs than Greedy on the sample", () => {
    open();
    fireEvent.click(screen.getByLabelText("Bipartite matching"));
    expect(verdictText()).toBe("Kuhn's Algorithm and Hopcroft-Karp matched 4 pairs; Greedy Matching only 3. A matching that cannot be grown by adding a pair can still be smaller than the best one.");
    expect(cell("Kuhn's Algorithm", "Pairs matched")).toContain("4");
    expect(cell("Hopcroft-Karp", "Pairs matched")).toContain("4");
    expect(cell("Greedy Matching", "Pairs matched")).toContain("3");
    expect(cell("Kuhn's Algorithm", "Pairs matched")).not.toContain("lowest");
    expect(screen.queryByText("Why there is no growth chart here")).not.toBeInTheDocument();
  });

  it("draws the growth chart from real runs, with Kuhn's checks ending far above Hopcroft-Karp's", async () => {
    open("/compare?family=matching");
    const chart = screen.getByRole("img", { name: /Edge checks against nodes in the graph/ });
    await waitFor(() => expect(chart.querySelectorAll("[data-series]")).toHaveLength(3));
    fireEvent.click(screen.getByText("Show the numbers behind the chart"));
    const data = screen.getByRole("table", { name: /Edge checks by nodes in the graph/ });
    const header = within(data).getAllByRole("columnheader").map((item) => item.textContent);
    const last = within(within(data).getAllByRole("row").at(-1)!).getAllByRole("cell").map((item) => item.textContent);
    expect(last[header.indexOf("Kuhn's Algorithm") - 1]).toBe("1,924");
    expect(last[header.indexOf("Hopcroft-Karp") - 1]).toBe("244");
    expect(screen.getByText(/The gap is a property of this graph/)).toBeInTheDocument();
  });

  it("says both matched the same when nothing blocks greedy", () => {
    open("/compare?family=matching&graph=" + encodeURIComponent("A:20:20,B:20:60,1:80:20,2:80:60~A:1:1,B:2:1~A~2~u"));
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    expect(verdictText()).toBe("All matched 2 pairs, the most that can be matched here.");
  });
});
