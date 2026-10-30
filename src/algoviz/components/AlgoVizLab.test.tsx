import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const stepText = () => screen.getByRole("slider", { name: "Step position" }).getAttribute("aria-valuetext");

afterEach(() => vi.useRealTimers());

describe("playback controls", () => {
  it("lets you jump to any step with the slider", () => {
    open("/sorting?algorithm=bubble");
    const slider = screen.getByRole("slider", { name: "Step position" });
    expect(stepText()).toMatch(/^Step 1 of /);
    fireEvent.change(slider, { target: { value: "5" } });
    expect(stepText()).toMatch(/^Step 6 of /);
  });

  it("steps and jumps with the keyboard but leaves form fields alone", () => {
    open("/sorting?algorithm=bubble");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(stepText()).toMatch(/^Step 3 of /);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(stepText()).toMatch(/^Step 2 of /);
    fireEvent.keyDown(window, { key: "End" });
    const total = Number(stepText()!.split(" of ")[1]);
    expect(stepText()).toBe(`Step ${total} of ${total}`);
    fireEvent.keyDown(window, { key: "Home" });
    expect(stepText()).toMatch(/^Step 1 of /);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowRight" });
    expect(stepText()).toMatch(/^Step 1 of /);
  });

  it("plays automatically, and play on a finished run starts it over", () => {
    vi.useFakeTimers();
    open("/sorting?algorithm=selection");
    fireEvent.keyDown(window, { key: " " });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(Number(stepText()!.match(/Step (\d+)/)![1])).toBeGreaterThan(1);
    fireEvent.keyDown(window, { key: "End" });
    fireEvent.click(screen.getByRole("button", { name: "Play playback" }));
    expect(stepText()).toMatch(/^Step 1 of /);
  });

  it("highlights the pseudocode line for the current action", () => {
    open("/search?algorithm=bfs");
    expect(document.querySelector(".algoviz-pseudocode li.is-active")).not.toBeNull();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.querySelectorAll(".algoviz-pseudocode li.is-active")).toHaveLength(1);
  });
});

describe("sorting your own numbers", () => {
  it("applies valid numbers, shows them in the input label and the URL", () => {
    open("/sorting?algorithm=quick");
    fireEvent.change(screen.getByLabelText("Your numbers"), { target: { value: "9, 4, 7, 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Use these numbers" }));
    expect(screen.getByText("Array · [9, 4, 7, 1]")).toBeInTheDocument();
    expect(screen.getByTestId("search").textContent).toContain("values=9%2C4%2C7%2C1");
    expect(screen.getByTestId("search").textContent).toContain("algorithm=quick");
  });

  it("explains invalid input and keeps the previous data", () => {
    open("/sorting");
    fireEvent.change(screen.getByLabelText("Your numbers"), { target: { value: "5, abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Use these numbers" }));
    expect(screen.getByRole("alert")).toHaveTextContent('"abc" is not a whole number');
    expect(screen.getByText(/Array · \[42, 18, 64/)).toBeInTheDocument();
  });

  it("restores shared numbers from the link", () => {
    open("/sorting?algorithm=merge&values=3,2,1");
    expect(screen.getByText("Array · [3, 2, 1]")).toBeInTheDocument();
  });

  it("offers presets", () => {
    open("/sorting");
    fireEvent.change(screen.getByLabelText("Preset data"), { target: { value: "sorted" } });
    const label = screen.getByText(/^Array · \[/).textContent!;
    const numbers = label.replace(/^Array · \[|\]$/g, "").split(", ").map(Number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });
});

describe("drawing your own map", () => {
  const useGrid = () => fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "grid" } });

  it("shows a keyboard-operable map with named cells", () => {
    open("/pathfinding");
    useGrid();
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: /^B5, start/ })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: /^K5, goal/ })).toBeInTheDocument();
  });

  it("walls a cell with the keyboard and reports when the goal becomes unreachable", () => {
    open("/pathfinding");
    useGrid();
    // Seal the goal on all four sides.
    for (const id of ["J5", "L5", "K4", "K6"]) {
      const cell = screen.getByRole("gridcell", { name: new RegExp(`^${id},`) });
      fireEvent.keyDown(cell, { key: "Enter" });
    }
    expect(screen.getByText(/No route exists from B5 to K5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear walls" }));
    expect(screen.queryByText(/No route exists/)).not.toBeInTheDocument();
  });

  it("keeps the found route on the map after the run completes", () => {
    open("/pathfinding");
    useGrid();
    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getByText("Complete")).toBeInTheDocument();
    // Only the route itself is marked, not every cell the algorithm settled on the way.
    const marked = document.querySelectorAll(".algoviz-cell.is-path").length;
    expect(marked).toBeGreaterThan(5);
    expect(marked).toBeLessThan(20);
    expect(document.querySelectorAll(".algoviz-cell.is-visited").length).toBeGreaterThan(marked);
  });

  it("moves the start with the Move start tool and never lets start sit on the goal", () => {
    open("/search");
    useGrid();
    fireEvent.click(screen.getByLabelText("Move start"));
    fireEvent.keyDown(screen.getByRole("gridcell", { name: /^A1,/ }), { key: "Enter" });
    expect(screen.getByRole("gridcell", { name: /^A1, start/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("gridcell", { name: /^K5, goal/ }), { key: "Enter" });
    expect(screen.getByRole("gridcell", { name: /^A1, start/ })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: /^K5, goal/ })).toBeInTheDocument();
  });

  it("swaps start and goal instead of allowing the same node on the sample graph", () => {
    open("/pathfinding");
    const [start, goal] = screen.getAllByRole("combobox").filter((select) => (select as HTMLSelectElement).options.length === 6) as HTMLSelectElement[];
    fireEvent.change(start, { target: { value: "F" } });
    expect(start.value).toBe("F");
    expect(goal.value).toBe("A");
  });
});

describe("spanning trees", () => {
  it("has no map or endpoint pickers, keeps the tree edges on screen and names the steps", () => {
    open("/spanning");
    expect(screen.queryByLabelText("Choose map")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Spanning trees" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Compare");
    fireEvent.keyDown(window, { key: "End" });
    expect(document.querySelectorAll(".algoviz-edge-accepted")).toHaveLength(5);
    expect(document.querySelectorAll(".algoviz-edge-rejected")).toHaveLength(2);
    expect(screen.getByText(/Minimum spanning tree found/)).toBeInTheDocument();
    expect(screen.getByText("Edges kept").previousSibling).toHaveTextContent("5");
  });

  it("calls an accepted edge 'Keep edge' on its own step", () => {
    open("/spanning");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Keep edge");
    expect(document.querySelectorAll(".algoviz-pseudocode li.is-active")).toHaveLength(1);
  });
});

describe("Bellman-Ford and heap sort in the labs", () => {
  it("runs Bellman-Ford on a drawn map and keeps the route", () => {
    open("/pathfinding?algorithm=bellman-ford");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "grid" } });
    fireEvent.keyDown(window, { key: "End" });
    const marked = document.querySelectorAll(".algoviz-cell.is-path").length;
    expect(marked).toBeGreaterThan(5);
    expect(marked).toBeLessThan(20);
  });

  it("sorts your numbers with heap sort", () => {
    open("/sorting?algorithm=heap&values=5,3,9,1");
    expect(screen.getByText("Array · [5, 3, 9, 1]")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getAllByText("Complete").length).toBeGreaterThan(0);
  });
});
