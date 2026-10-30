import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";
import { toCanvasPoint } from "./GraphCanvas";

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<AlgoVizModulePage />} /></Routes></MemoryRouter>);
}
const build = () => fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
const nodes = () => screen.getAllByRole("button").filter((item) => item.getAttribute("aria-label")?.startsWith("Node ")).map((item) => item.getAttribute("aria-label")!.split(",")[0]);
const jumpToEnd = () => fireEvent.keyDown(window, { key: "End" });
const explanation = () => document.querySelector(".algoviz-explanation")?.textContent ?? "";

describe("build your own graph", () => {
  it("starts as the sample graph with editable, keyboard-focusable nodes", () => {
    open("/pathfinding");
    build();
    expect(nodes()).toEqual(["Node A", "Node B", "Node C", "Node D", "Node E", "Node F"]);
    expect(screen.getByRole("button", { name: "Node A, start" })).toHaveAttribute("tabindex", "0");
  });

  it("adds a node and an edge, then Dijkstra routes through them", () => {
    open("/pathfinding?algorithm=dijkstra");
    build();
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    expect(nodes()).toContain("Node G");
    fireEvent.change(screen.getByLabelText("Weight for new edges"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Edge from"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("to"), { target: { value: "G" } });
    fireEvent.click(screen.getByRole("button", { name: "Set edge" }));
    fireEvent.change(screen.getByLabelText("Edge from"), { target: { value: "G" } });
    fireEvent.change(screen.getByLabelText("to"), { target: { value: "F" } });
    fireEvent.click(screen.getByRole("button", { name: "Set edge" }));
    jumpToEnd();
    expect(explanation()).toBe("Dijkstra completed.");
    // A → G → F costs 1 + 1 = 2, far cheaper than the sample graph's 7.
    const path = [...document.querySelectorAll(".algoviz-node.is-path")].length;
    expect(path).toBe(3);
  });

  it("lets you change an edge's weight and remove an edge or a node", () => {
    open("/pathfinding");
    build();
    fireEvent.click(screen.getByText(/Nodes and edges/));
    fireEvent.change(screen.getByLabelText("Weight of A–B"), { target: { value: "20" } });
    expect(screen.getByLabelText("Weight of A–B")).toHaveValue(20);
    fireEvent.click(screen.getByRole("button", { name: "Remove edge A–B" }));
    expect(screen.queryByLabelText("Weight of A–B")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove node C" }));
    expect(nodes()).not.toContain("Node C");
    expect(screen.queryByLabelText("Weight of A–C")).not.toBeInTheDocument();
  });

  it("says so when your graph has no route from the start to the goal", () => {
    open("/pathfinding");
    build();
    fireEvent.click(screen.getByText(/Nodes and edges/));
    for (const edge of ["D–F", "E–F"]) fireEvent.click(screen.getByRole("button", { name: `Remove edge ${edge}` }));
    expect(screen.getByRole("status")).toHaveTextContent(/No route exists from A to F/);
  });

  it("moves a node with the arrow keys and connects two nodes with Enter", () => {
    open("/pathfinding");
    build();
    const before = document.querySelectorAll(".algoviz-node")[0].getAttribute("cx");
    fireEvent.keyDown(screen.getByRole("button", { name: "Node A, start" }), { key: "ArrowRight" });
    expect(Number(document.querySelectorAll(".algoviz-node")[0].getAttribute("cx"))).toBeGreaterThan(Number(before));
    fireEvent.click(screen.getByLabelText("Connect nodes"));
    fireEvent.keyDown(screen.getByRole("button", { name: "Node A, start" }), { key: "Enter" });
    expect(screen.getByRole("button", { name: /Node A, start, selected/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Node D" }), { key: "Enter" });
    fireEvent.click(screen.getByText(/Nodes and edges/));
    expect(screen.getByLabelText("Weight of A–D")).toHaveValue(3);
  });

  it("maps a pointer position onto the 0–100 canvas", () => {
    expect(toCanvasPoint(150, 250, { left: 100, top: 200, width: 200, height: 100 })).toEqual({ x: 25, y: 50 });
  });

  it("rejects a weight outside 1–99", () => {
    open("/pathfinding");
    build();
    fireEvent.change(screen.getByLabelText("Weight for new edges"), { target: { value: "150" } });
    expect(screen.getByRole("alert")).toHaveTextContent(/whole number from 1 to 99/);
    expect(screen.getByRole("button", { name: "Set edge" })).toBeDisabled();
  });

  it("works for spanning trees too: Prim and Kruskal agree on a rearranged graph", () => {
    open("/spanning?algorithm=prim");
    build();
    expect(screen.queryByLabelText("Goal")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Nodes and edges/));
    fireEvent.change(screen.getByLabelText("Weight of A–B"), { target: { value: "9" } });
    jumpToEnd();
    const prim = explanation();
    expect(prim).toMatch(/total weight \d+/);
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "kruskal" } });
    jumpToEnd();
    expect(explanation()).toBe(prim);
  });
});
