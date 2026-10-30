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
