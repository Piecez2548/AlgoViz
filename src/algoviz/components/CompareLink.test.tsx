import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function CurrentSearch() { return <output data-testid="search">{useLocation().search}</output>; }
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<><AlgoVizModulePage /><CurrentSearch /></>} /></Routes></MemoryRouter>);
}
const search = () => decodeURIComponent(screen.getByTestId("search").textContent!);
const verdict = () => document.querySelector(".algoviz-compare-verdict")?.textContent ?? "";
const twoWay = encodeURIComponent("S:10:50,M:50:20,T:90:50~M:S:2,M:T:3~S~T");
const oneWay = encodeURIComponent("S:10:50,M:50:20,T:90:50~S:M:2,M:T:-1,S:T:9~S~T~d");

describe("comparison links", () => {
  it("opens on the family in the link, with your own graph on it", () => {
    open(`/compare?family=trees&graph=${twoWay}`);
    expect(screen.getByLabelText("Spanning trees")).toBeChecked();
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    // Two edges of weight 2 and 3: the only tree uses both.
    expect(verdict()).toMatch(/^Both built a tree of weight 5 from 2 edges\./);
  });

  it("opens a directed graph on the negative-edges family and compares the three algorithms on it", () => {
    open(`/compare?family=negative&graph=${oneWay}`);
    expect(screen.getByLabelText("Negative edges")).toBeChecked();
    expect(screen.getByLabelText("Choose map")).toHaveValue("custom");
    const table = screen.getByRole("table", { name: /Results on the same input/ });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    // S → M → T costs 2 + (-1) = 1, cheaper than the direct edge (9).
    expect(verdict()).toMatch(/cost 1\)|All found routes cost 1/);
  });

  it("ignores a graph that does not suit the family and an unknown family", () => {
    open(`/compare?family=routes&graph=${oneWay}`);
    expect(screen.getByLabelText("Search and shortest paths")).toBeChecked();
    expect(screen.getByLabelText("Choose map")).toHaveValue("sample");
  });

  it("falls back to sorting for an unknown family", () => {
    open("/compare?family=nonsense");
    expect(screen.getByLabelText("Sorting algorithms")).toBeChecked();
  });

  it("writes the family and your edits into the link, and drops the graph when you change family", async () => {
    open("/compare");
    fireEvent.click(screen.getByLabelText("Spanning trees"));
    expect(search()).toContain("family=trees");
    fireEvent.change(screen.getByLabelText("Choose map"), { target: { value: "custom" } });
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    await waitFor(() => expect(search()).toMatch(/graph=.*G:/));
    fireEvent.click(screen.getByLabelText("Negative edges"));
    // The custom graph from the other family does not carry over; the new family starts on its sample.
    expect(screen.getByLabelText("Choose map")).toHaveValue("sample");
    await waitFor(() => expect(search()).not.toContain("graph="));
    expect(search()).toContain("family=negative");
  });

  it("keeps the value to find in the link for list searches", () => {
    open("/compare?family=lists&values=10,20,30,40,50,60,70,80&target=80");
    expect(screen.getByLabelText("Value to find")).toHaveValue("80");
    expect(verdict()).toMatch(/^80 is in the list\. Binary search made the fewest comparisons \(4\)/);
    fireEvent.change(screen.getByLabelText("Value to find"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Search for it" }));
    expect(search()).toContain("target=20");
  });
});
