import { Route, Routes } from "react-router-dom";
import AlgoVizLayout from "./algoviz/components/layout/AlgoVizLayout";
import AlgoVizHomePage from "./algoviz/pages/AlgoVizHomePage";
import AlgoVizModulePage from "./algoviz/pages/AlgoVizModulePage";
import AlgoVizNotFound from "./algoviz/pages/AlgoVizNotFound";

/** Every lab that appears in the navigation needs a route here; AlgoVizRoutes.test.tsx checks it. */
export const MODULE_PATHS = ["search", "pathfinding", "spanning", "sorting", "array-search", "negative-weights", "topological-sort", "compare"] as const;

export function AlgoVizRoutes() {
  return (
    <Routes>
      <Route element={<AlgoVizLayout />}>
        <Route index element={<AlgoVizHomePage />} />
        {MODULE_PATHS.map((path) => <Route key={path} path={path} element={<AlgoVizModulePage />} />)}
        <Route path="*" element={<AlgoVizNotFound />} />
      </Route>
    </Routes>
  );
}
