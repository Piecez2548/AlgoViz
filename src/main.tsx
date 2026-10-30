import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AlgoVizRoutes } from "./AlgoVizRoutes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AlgoVizRoutes />
    </BrowserRouter>
  </StrictMode>,
);
