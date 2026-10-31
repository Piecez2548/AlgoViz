import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlgoVizModulePage from "../pages/AlgoVizModulePage";

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:module" element={<AlgoVizModulePage />} /></Routes></MemoryRouter>);
}
const turnOn = () => fireEvent.click(screen.getByRole("checkbox", { name: "Predict the next step" }));
const panel = () => screen.getByRole("region", { name: "Predict the next step" });
const score = () => within(panel()).getByText(/of \d+ right/).textContent;
const stepText = () => screen.getByRole("slider", { name: "Step position" }).getAttribute("aria-valuetext");

afterEach(() => vi.useRealTimers());

describe("predict mode", () => {
  it("is off until you turn it on, and turning it off removes the panel", () => {
    open("/sorting?algorithm=bubble&values=3,1,2");
    expect(screen.queryByRole("region", { name: "Predict the next step" })).not.toBeInTheDocument();
    turnOn();
    expect(panel()).toBeInTheDocument();
    turnOn();
    expect(screen.queryByRole("region", { name: "Predict the next step" })).not.toBeInTheDocument();
  });

  it("asks about the next step, scores a right answer and shows what happened", () => {
    open("/sorting?algorithm=bubble&values=3,1,2");
    turnOn();
    expect(within(panel()).getByText("It compares 3 and 1. Will it swap them?")).toBeInTheDocument();
    expect(score()).toBe("0 of 0 right");
    fireEvent.click(within(panel()).getByRole("button", { name: "Yes, swap them" }));
    expect(within(panel()).getByRole("status")).toHaveTextContent("Correct. Swap them so the larger value moves right.");
    expect(score()).toBe("1 of 1 right");
    expect(within(panel()).getByRole("button", { name: "Yes, swap them" })).toBeDisabled();
    fireEvent.click(within(panel()).getByRole("button", { name: "Show the step" }));
    expect(stepText()).toBe("Step 2 of " + stepText()!.split(" of ")[1]);
  });

  it("says what the answer was when you get it wrong, and counts it", () => {
    open("/sorting?algorithm=bubble&values=3,1,2");
    turnOn();
    fireEvent.click(within(panel()).getByRole("button", { name: "No, leave them" }));
    expect(within(panel()).getByRole("status")).toHaveTextContent("Not quite. The answer was Yes, swap them.");
    expect(score()).toBe("0 of 1 right");
  });

  it("asks which node comes next on a graph, without naming it in the question", () => {
    open("/search?algorithm=bfs");
    turnOn();
    const group = within(panel()).getByRole("group");
    const options = within(group).getAllByRole("button").map((button) => button.textContent!);
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(within(panel()).getByText("Which node does the algorithm take next?")).toBeInTheDocument();
    fireEvent.click(within(group).getAllByRole("button")[0]);
    expect(within(panel()).getByRole("status")).toBeInTheDocument();
  });

  it("keeps the score when you step around, starts over for another algorithm, and says when there are no questions", () => {
    open("/sorting?algorithm=bubble&values=3,1,2");
    turnOn();
    fireEvent.click(within(panel()).getByRole("button", { name: "Yes, swap them" }));
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(panel()).getByText(/No question at this step|Will it swap them/)).toBeInTheDocument();
    expect(score()).toBe("1 of 1 right");
    fireEvent.change(screen.getByLabelText("Choose algorithm"), { target: { value: "heap" } });
    expect(score()).toBe("0 of 0 right");
    // Heap sort now has questions too: the first comparison asks whether the child is larger than its parent.
    expect(within(panel()).getByText(/Is the child .* larger than it?|Is .* larger than it?/)).toBeInTheDocument();
  });

  it("asks about the kept half in binary search and keep-or-skip for Kruskal", () => {
    const first = open("/array-search?algorithm=binary-search&values=10,20,30,40,50,60,70,80&target=70");
    turnOn();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(panel()).getByText(/The target is 70/)).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Found it" }));
    expect(within(panel()).getByRole("status")).toHaveTextContent(/^Correct\./);
    first.unmount();
    open("/spanning?algorithm=kruskal");
    turnOn();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(screen.getAllByRole("region", { name: "Predict the next step" }).at(-1)!).getByText(/Will edge .+ be kept or skipped\?/)).toBeInTheDocument();
  });

  it("stops autoplay when predictions are switched on", () => {
    vi.useFakeTimers();
    open("/sorting?algorithm=bubble&values=3,1,2");
    fireEvent.click(screen.getByRole("button", { name: "Play playback" }));
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeInTheDocument();
    turnOn();
    expect(screen.getByRole("button", { name: "Play playback" })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(stepText()).toMatch(/^Step 1 of /);
  });
});
