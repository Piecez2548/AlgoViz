# AlgoViz

AlgoViz is an interactive algorithm visualizer for search, pathfinding, sorting, and comparative analysis. It is deployed as an independent web application with a domain-root route structure.

| Resource | URL |
| --- | --- |
| Production | https://algoviz-brown-kappa.vercel.app |
| Repository | https://github.com/Piecez2548/AlgoViz |
| Source workspace | https://github.com/Piecez2548/Nexus |

## Capabilities

- Step-by-step graph search visualizations for BFS, DFS, and Greedy Best-First Search
- Dijkstra, A* and Bellman-Ford pathfinding demonstrations
- Kruskal minimum spanning tree with kept and skipped edges shown on the graph
- Bubble, Selection, Insertion, Merge, Quick, and Heap Sort demonstrations
- Compare page: run any chosen sorting or route-finding algorithms on the same custom input (a table of measured counts), then chart how comparisons, swaps, steps or visited nodes grow with input size, on a linear or log scale
- Playback you can scrub: step bar, speed, and keyboard shortcuts (Space, arrow keys, Home, End)
- Pseudocode panel that highlights the line matching the current step
- Your own data: type or preset numbers for sorting (shareable in the URL), and draw a map with walls, heavy ground and a movable start and goal for search and pathfinding

## Technology

React 19, TypeScript, Vite, React Router, Zustand, Vitest, and Testing Library.

## Local development

Requirements: Node.js 22 or later.

```bash
npm ci
npm run dev
npm run build
npm test
```

The repository is public for professional review. Keep generated output, local environment files, and credentials out of version control.
