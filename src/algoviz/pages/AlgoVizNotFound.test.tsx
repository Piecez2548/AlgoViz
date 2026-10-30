import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgoVizNotFound from "./AlgoVizNotFound";

describe("AlgoViz not found", () => {
  it("explains the missing page and links back to Learn", () => {
    render(
      <MemoryRouter initialEntries={["/nope"]}>
        <Routes>
          <Route path="*" element={<AlgoVizNotFound />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Learn/ })).toHaveAttribute("href", "/");
  });
});