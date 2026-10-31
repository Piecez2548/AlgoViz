import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { decodeGraph } from "../../algorithms/shared/graphCodec";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const linkGraph = () => decodeGraph(new URLSearchParams(screen.getByTestId("search").textContent!).get("graph"));
const nodeLabels = () => [...document.querySelectorAll(".algoviz-node-label")].map((node) => node.textContent);

describe("your own graph in the link", () => {
  it("opens a graph from the link on the custom map, ready to run", async () => {
    open("/pathfinding?graph=" + encodeURIComponent("S:10:50,M:50:20,T:90:50~S:M:2,M:T:3~S~T"));
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    expect(nodeLabels()).toEqual(["S", "M", "T"]);
    fireEvent.keyDown(window, { key: "End" });
    expect(document.querySelector(".algoviz-explanation")?.textContent).toBe("Dijkstra completed.");
    expect(document.querySelectorAll(".algoviz-node.is-path")).toHaveLength(3);
  });

  it("writes your edits into the link, and takes the graph out again when you leave the custom map", async () => {
    open("/spanning?algorithm=prim");
    expect(screen.getByTestId("search").textContent).not.toContain("graph=");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    await waitFor(() => expect(linkGraph()?.nodes).toHaveLength(7));
    expect(screen.getByTestId("search").textContent).toContain("algorithm=prim");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "sample" } });
    await waitFor(() => expect(screen.getByTestId("search").textContent).not.toContain("graph="));
  });

  it("ignores a broken graph in the link and shows the sample graph", () => {
    open("/search?graph=garbage");
    expect(screen.getByLabelText("Choose map")).toHaveValue("sample");
  });
});

describe("link updates do not overwrite each other", () => {
  it("keeps a freshly chosen algorithm in the link when your graph changes afterwards", async () => {
    open("/pathfinding?algorithm=dijkstra");
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "a-star" } });
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    await waitFor(() => expect(screen.getByTestId("search").textContent).toContain("graph="));
    expect(screen.getByTestId("search").textContent).toContain("algorithm=a-star");
  });
});
