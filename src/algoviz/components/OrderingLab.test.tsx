import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { encodeGraph } from "../../algorithms/shared/graphCodec";
import { DAG_SAMPLE } from "../../algorithms/shared/graph";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const jumpToEnd = () => fireEvent.keyDown(window, { key: "End" });
const explanation = () => document.querySelector(".algoviz-explanation")?.textContent ?? "";

describe("topological sort lab", () => {
  it("shows tasks with arrows and no weights, and ends with an order that respects every dependency", () => {
    open("/topological-sort");
    expect(screen.getByRole("heading", { level: 1, name: "Topological sort" })).toBeInTheDocument();
    expect(document.querySelectorAll("line[marker-end]")).toHaveLength(7);
    expect(document.querySelectorAll(".algoviz-edge-label")).toHaveLength(0);
    jumpToEnd();
    const order = /Order: (.+)\.$/.exec(explanation())![1].split(" → ");
    for (const edge of DAG_SAMPLE.edges) expect(order.indexOf(edge.from)).toBeLessThan(order.indexOf(edge.to));
    expect(screen.getByText("Placed")).toBeInTheDocument();
  });

  it("works with depth-first ordering too", () => {
    open("/topological-sort?algorithm=dfs-topological");
    jumpToEnd();
    expect(explanation()).toMatch(/^Every task is placed\. Order: /);
  });

  it("names the dependency loop in the sample that has one, with both algorithms", () => {
    open("/topological-sort");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "cycle" } });
    jumpToEnd();
    expect(explanation()).toMatch(/^No order exists: the dependency loop /);
    expect(screen.getByText(/These tasks depend on each other in a loop \(/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "dfs-topological" } });
    jumpToEnd();
    expect(explanation()).toMatch(/^No order exists: the dependency loop /);
  });

  it("lets you edit dependencies without weights or start and goal, and keeps them in the link", async () => {
    open("/topological-sort");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    expect(screen.queryByLabelText("Weight for new edges")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Goal")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Edge from"), { target: { value: "F" } });
    fireEvent.change(screen.getByLabelText("Edge to"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Add dependency" }));
    jumpToEnd();
    expect(explanation()).toMatch(/^No order exists/);
    await waitFor(() => expect(decodeURIComponent(screen.getByTestId("search").textContent!)).toContain("F:A:1"));
    expect(decodeURIComponent(screen.getByTestId("search").textContent!)).toMatch(/~du(&|$)/);
    fireEvent.click(screen.getByText(/Nodes and edges/));
    expect(screen.queryByLabelText("Weight of F→A")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove edge F→A" }));
    jumpToEnd();
    expect(explanation()).toMatch(/^Every task is placed/);
  });

  it("opens a graph from the link and asks which task leaves the queue next in predict mode", () => {
    open("/topological-sort?graph=" + encodeURIComponent(encodeGraph(DAG_SAMPLE)));
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    fireEvent.click(screen.getByRole("checkbox", { name: "Predict the next step" }));
    const panel = screen.getByRole("region", { name: "Predict the next step" });
    expect(within(panel).getByText("Which node does the algorithm take next?")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "A" }));
    expect(within(panel).getByRole("status")).toHaveTextContent(/^Correct\./);
  });
});
