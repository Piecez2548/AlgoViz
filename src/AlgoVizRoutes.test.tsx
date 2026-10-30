import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AlgoVizRoutes } from "./AlgoVizRoutes";

function openAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AlgoVizRoutes /></MemoryRouter>);
}

describe("AlgoViz routes", () => {
  it("opens a lab for every link in the navigation and every card on the home page", () => {
    const { unmount } = openAt("/");
    const hrefs = new Set([...document.querySelectorAll<HTMLAnchorElement>("nav a, .algoviz-category-row, .algoviz-catalog-card")].map((link) => link.getAttribute("href")!).filter((href) => href.startsWith("/") && href !== "/"));
    unmount();
    expect(hrefs.size).toBeGreaterThanOrEqual(10);
    for (const href of hrefs) {
      const view = openAt(href);
      expect(screen.queryByText("Page not found"), href).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("still shows the not-found page for an unknown address", () => {
    openAt("/nope");
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});
