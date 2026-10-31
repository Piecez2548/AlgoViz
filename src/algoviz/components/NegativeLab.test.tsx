import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const jumpToEnd = () => fireEvent.keyDown(window, { key: "End" });
const explanation = () => document.querySelector(".algoviz-explanation")?.textContent ?? "";
const routeLength = () => document.querySelectorAll(".algoviz-edge-path").length;

describe("negative edges lab", () => {
  it("shows a directed graph with arrows and a negative edge, and Bellman-Ford finds the cheaper route through it", () => {
    open("/negative-weights");
    expect(screen.getByRole("heading", { level: 1, name: "Negative edges" })).toBeInTheDocument();
    expect(document.querySelectorAll("line[marker-end]").length).toBe(7);
    expect([...document.querySelectorAll(".algoviz-edge-label")].some((label) => label.textContent === "-3" && label.classList.contains("is-negative"))).toBe(true);
    jumpToEnd();
    expect(explanation()).toBe("Bellman-Ford completed.");
    // A → C → B → D → F: four edges lit, in the direction travelled.
    expect(routeLength()).toBe(4);
  });

  it("shows where Dijkstra goes wrong on the same graph", () => {
    open("/negative-weights?algorithm=dijkstra");
    expect(screen.getByText("Dijkstra assumes no edge is negative. Here it settles a node too early and reports a route costing 9, but Bellman-Ford finds one costing 7.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "bellman-ford" } });
    expect(screen.queryByText(/Dijkstra assumes/)).not.toBeInTheDocument();
  });

  it("detects a negative cycle, names it, and says no route is the cheapest", () => {
    open("/negative-weights");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "cycle" } });
    jumpToEnd();
    expect(explanation()).toMatch(/^Bellman-Ford stopped: the negative cycle (C → E → C|E → C → E) can be reached from A/);
    expect(screen.getByText(/A negative cycle \((C → E → C|E → C → E)\) can be reached from A and leads to F/)).toBeInTheDocument();
    expect(screen.queryByText(/No route exists/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "floyd-warshall" } });
    jumpToEnd();
    expect(explanation()).toMatch(/^Floyd-Warshall stopped: .* lie on a negative cycle/);
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "dijkstra" } });
    expect(screen.getAllByRole("status").map((node) => node.textContent).join(" ")).toMatch(/Dijkstra assumes no edge is negative\. This graph has a negative cycle/);
  });

  it("lets you build a directed graph with negative weights, keeps it in the link, and edges only go one way", async () => {
    open("/negative-weights");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    fireEvent.click(screen.getByText(/Nodes and edges/));
    expect(screen.getByLabelText("Weight of C→B")).toHaveValue(-3);
    fireEvent.change(screen.getByLabelText("Edge from"), { target: { value: "B" } });
    fireEvent.change(screen.getByLabelText("Edge to"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Weight for new edges"), { target: { value: "-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Set edge" }));
    // B → A is a separate edge from A → B, and a weight of -2 is accepted here.
    expect(screen.getByLabelText("Weight of B→A")).toHaveValue(-2);
    expect(screen.getByLabelText("Weight of A→B")).toHaveValue(4);
    await waitFor(() => expect(decodeURIComponent(screen.getByTestId("search").textContent!)).toContain("B:A:-2"));
    expect(decodeURIComponent(screen.getByTestId("search").textContent!)).toMatch(/~d(&|$)/);
    fireEvent.change(screen.getByLabelText("Weight for new edges"), { target: { value: "-150" } });
    expect(screen.getByRole("alert")).toHaveTextContent("whole number from -99 to 99");
  });

  it("opens a directed graph from the link", () => {
    open("/negative-weights?graph=" + encodeURIComponent("S:10:50,M:50:20,T:90:50~S:M:2,M:T:-1~S~T~d"));
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    jumpToEnd();
    expect(explanation()).toBe("Bellman-Ford completed.");
    expect(routeLength()).toBe(2);
  });
});
