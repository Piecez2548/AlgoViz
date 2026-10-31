import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MATCH_SAMPLE } from "../../algorithms/shared/graph";
import { decodeGraph, encodeGraph } from "../../algorithms/shared/graphCodec";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const jumpToEnd = () => fireEvent.keyDown(window, { key: "End" });
const explanation = () => document.querySelector(".algoviz-explanation")?.textContent ?? "";

describe("bipartite matching lab", () => {
  it("shows two sides with no arrows or weights, and Kuhn pairs all four people with a job", () => {
    open("/matching");
    expect(screen.getByRole("heading", { level: 1, name: "Bipartite matching" })).toBeInTheDocument();
    expect(document.querySelectorAll("line[marker-end]")).toHaveLength(0);
    expect(document.querySelectorAll(".algoviz-edge-label")).toHaveLength(0);
    expect(new Set([...document.querySelectorAll(".algoviz-group-badge")].map((badge) => badge.textContent))).toEqual(new Set(["#1", "#2"]));
    jumpToEnd();
    expect(explanation()).toMatch(/^Matched 4 pairs: /);
    expect(explanation()).toMatch(/No left node can find an augmenting path any more/);
    expect(document.querySelectorAll(".algoviz-edge-accepted")).toHaveLength(4);
    expect(screen.getByText("Matched")).toBeInTheDocument();
  });

  it("shows greedy matching leaving B without a job on the same sample", () => {
    open("/matching?algorithm=greedy-matching");
    jumpToEnd();
    expect(explanation()).toMatch(/^Matched 3 pairs: /);
    expect(explanation()).toMatch(/Greedy never moves a pair/);
    expect(document.querySelectorAll(".algoviz-edge-accepted")).toHaveLength(3);
  });

  it("shows Kuhn leaving one person out when three want the same two jobs", () => {
    open("/matching");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "cycle" } });
    jumpToEnd();
    expect(explanation()).toMatch(/^Matched 3 pairs: /);
  });

  it("says when your edges cannot be split into two sides, and keeps your graph in the link", async () => {
    open("/matching");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    expect(screen.queryByLabelText("Goal")).not.toBeInTheDocument();
    // A and B are both on the left, so an edge between them cannot be split.
    fireEvent.change(screen.getByLabelText("Edge from"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Edge to"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "Add dependency" }));
    jumpToEnd();
    expect(explanation()).toMatch(/^No bipartite matching here: /);
    expect(screen.getByText(/cannot be split into two sides/)).toBeInTheDocument();
    await waitFor(() => expect(decodeURIComponent(screen.getByTestId("search").textContent!)).toMatch(/~u(&|$)/));
    fireEvent.click(screen.getByText(/Nodes and edges/));
    fireEvent.click(screen.getByRole("button", { name: "Remove edge A–B" }));
    jumpToEnd();
    expect(explanation()).toMatch(/^Matched 4 pairs/);
  });

  it("opens a graph from the link and round-trips the unweighted two-way flag", () => {
    const back = decodeGraph(encodeGraph(MATCH_SAMPLE))!;
    expect(back.unweighted).toBe(true);
    expect(back.directed).toBeUndefined();
    expect(encodeGraph(MATCH_SAMPLE).endsWith("~u")).toBe(true);
    open("/matching?graph=" + encodeURIComponent(encodeGraph(MATCH_SAMPLE)));
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    jumpToEnd();
    expect(explanation()).toMatch(/^Matched 4 pairs/);
  });
});
