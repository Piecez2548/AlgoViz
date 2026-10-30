import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AlgoVizLayout from "./algoviz/components/layout/AlgoVizLayout";
import AlgoVizHomePage from "./algoviz/pages/AlgoVizHomePage";
import AlgoVizModulePage from "./algoviz/pages/AlgoVizModulePage";
import AlgoVizNotFound from "./algoviz/pages/AlgoVizNotFound";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AlgoVizLayout />}>
          <Route index element={<AlgoVizHomePage />} />
          <Route path="search" element={<AlgoVizModulePage />} />
          <Route path="pathfinding" element={<AlgoVizModulePage />} />
          <Route path="sorting" element={<AlgoVizModulePage />} />
          <Route path="compare" element={<AlgoVizModulePage />} />
          <Route path="*" element={<AlgoVizNotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
