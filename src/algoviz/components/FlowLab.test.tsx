import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FLOW_SAMPLE } from "../../algorithms/shared/graph";
import { decodeGraph, encodeGraph } from "../../algorithms/shared/graphCodec";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const jumpToEnd = () => fireEvent.keyDown(window, { key: "End" });
const explanation = () => document.querySelector(".algoviz-explanation")?.textContent ?? "";
const labels = () => [...document.querySelectorAll(".algoviz-edge-label")].map((label) => label.textContent);

describe("maximum flow lab", () => {
  it("shows capacities on arrows, then flow/capacity as paths are filled, and ends with the maximum flow and the cut", () => {
    open("/max-flow");
    expect(screen.getByRole("heading", { level: 1, name: "Maximum flow" })).toBeInTheDocument();
    expect(labels()).toContain("0/16");
    expect(document.querySelectorAll("line[marker-end]")).toHaveLength(9);
    jumpToEnd();
    expect(explanation()).toMatch(/so 23 is the most that can flow/);
    expect(labels()).toContain("12/12");
    expect(document.querySelectorAll(".algoviz-edge-saturated").length).toBeGreaterThan(0);
    // The two sides of the minimum cut are drawn as two numbered groups.
    expect(new Set([...document.querySelectorAll(".algoviz-group-badge")].map((badge) => badge.textContent))).toEqual(new Set(["#1", "#2"]));
    expect(screen.getByText("Flow")).toBeInTheDocument();
  });

  it("names the narrow bridge as the limit on the sample that has one, with either algorithm", () => {
    open("/max-flow");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "cycle" } });
    jumpToEnd();
    expect(explanation()).toMatch(/so 5 is the most that can flow\..*D→E \(5\), a total capacity of 5/);
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "ford-fulkerson" } });
    jumpToEnd();
    expect(explanation()).toMatch(/so 5 is the most that can flow/);
  });

  it("takes capacities from 1 to 99 with Source and Sink pickers, and keeps your network in the link", async () => {
    open("/max-flow");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    expect(screen.getByLabelText("Source")).toBeInTheDocument();
    expect(screen.getByLabelText("Sink")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Capacity for new edges"), { target: { value: "-3" } });
    expect(screen.getByRole("alert")).toHaveTextContent("The capacity must be a whole number from 1 to 99.");
    fireEvent.change(screen.getByLabelText("Capacity for new edges"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Edge from"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Edge to"), { target: { value: "F" } });
    fireEvent.click(screen.getByRole("button", { name: "Set edge" }));
    jumpToEnd();
    expect(explanation()).toMatch(/so 73 is the most that can flow/);
    await waitFor(() => expect(decodeURIComponent(screen.getByTestId("search").textContent!)).toMatch(/A:F:50.*~df(&|$)/));
    fireEvent.click(screen.getByText(/Nodes and edges/));
    fireEvent.change(screen.getByLabelText("Capacity of A→F"), { target: { value: "5" } });
    jumpToEnd();
    expect(explanation()).toMatch(/so 28 is the most that can flow/);
  });

  it("opens a network from the link", () => {
    open("/max-flow?graph=" + encodeURIComponent("S:10:50,M:50:20,T:90:50~S:M:4,M:T:3~S~T~df"));
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    jumpToEnd();
    expect(explanation()).toMatch(/so 3 is the most that can flow/);
  });

  it("round-trips the flow flag and rejects negative capacities", () => {
    const back = decodeGraph(encodeGraph(FLOW_SAMPLE))!;
    expect(back).toMatchObject({ directed: true, flow: true });
    expect(back.edges).toEqual(FLOW_SAMPLE.edges);
    expect(decodeGraph("A:1:1,B:2:2~A:B:-2~A~B~df")).toBeNull();
    expect(decodeGraph("A:1:1,B:2:2~A:B:-2~A~B~d")).not.toBeNull();
  });
});
