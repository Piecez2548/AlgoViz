# AlgoViz: สรุประบบ งานที่ทำแล้ว และแผนต่อไป (handoff สำหรับแชทใหม่)

อัปเดตล่าสุด: 2026-10-31 · เทสต์ 375 ข้อ ผ่านทั้งหมด · สถานะ: ปิดงานโปรเจค (README, ภาพหน้าจอ, เมนูจัดกลุ่มเสร็จแล้ว)

## ข้อความเริ่มแชทใหม่ (คัดลอกไปวางได้เลย)

> ทำงานต่อใน `D:\Project_001\Nexus-Project\AlgoViz` อ่าน `docs/HANDOFF.md` ก่อน แล้วเริ่มจากแผนข้อ 1 ในหัวข้อ "แผนต่อไป" ตามกติกาเดิม: ทำ → เทสต์ → deploy → ตรวจ production แล้วจบด้วยแผนใหม่เป็นข้อๆ ทุกครั้ง

## 1. ระบบนี้คืออะไร

AlgoViz คือเว็บสอนอัลกอริทึมแบบโต้ตอบ ทำงานฝั่งไคลเอนต์ล้วน ไม่มี backend หรือบัญชีผู้ใช้ แสดงอัลกอริทึมทีละขั้นพร้อมคำอธิบาย pseudocode ที่ไฮไลต์บรรทัด โครงสร้างข้อมูล และตัวชี้วัดสด

- **Production:** https://algoviz-brown-kappa.vercel.app (Vercel เชื่อมกับ GitHub `Piecez2548/AlgoViz` ที่ branch `main`; push `main` แล้ว deploy เอง)
- **โค้ด:** `D:\Project_001\Nexus-Project\AlgoViz` (repo แยก) · เว็บ Nexus ลิงก์มาที่นี่ผ่าน redirect `/algoviz/*` (โค้ด AlgoViz ที่เคยฝังใน Nexus ถูกลบแล้ว)
- **Stack:** React 19, Vite 8, TypeScript, React Router 7, Zustand, Vitest + jsdom + Testing Library, lucide-react ไม่มี UI library อื่น CSS อยู่ในไฟล์เดียว `src/algoviz/algoviz.css`
- **คำสั่ง:** `npm run dev` · `npm run build` (รัน `tsc -b` ก่อน) · `npm test` (`vitest run`) · `npx tsc --noEmit -p .`
- **CSP ของ production เข้มงวด** (`script-src 'self'`): สคริปต์ inline หรือ CDN ใช้ไม่ได้ ไลบรารีต้อง bundle เข้ามา

## 2. สถาปัตยกรรม

### ข้อตกลงหลัก: engine กับ visualizer แยกกัน
อัลกอริทึมไม่วาดอะไรเลย แต่คืน `AlgorithmExecution { algorithmId, inputLabel, steps[], completed }` โดยแต่ละ step สร้างด้วย `createAlgorithmStep` (`src/algorithms/shared/utils.ts`) ซึ่ง **คัดลอก** ทุกอาร์เรย์ไว้ใน step (ไม่เช่นนั้นทุก step จะเล่นซ้ำสถานะสุดท้าย) ฟิลด์ที่ใช้บ่อยของ `AlgorithmStep` (`shared/types.ts`):

| ฟิลด์ | ใช้ทำอะไร |
|---|---|
| `type` | `visit compare enqueue dequeue discover update swap path accept reject complete` |
| `currentNode`, `targetNode`, `visited`, `frontier` | ไฮไลต์โหนดบนกราฟ |
| `activeEdge`, `acceptedEdges`, `rejectedEdges` | ไฮไลต์เส้น (key แบบ `edgeKey(a,b)` เรียงตัวอักษร เช่น `A-B`) |
| `values`, `highlightIndices`, `sortedIndices`, `activeRange` | แท่งบน canvas ของ sorting และ array search |
| `groups` | กลุ่มโหนดที่ระบายสีและมีเลข #1, #2 (SCC, min cut, ฝั่งซ้าย/ขวาของ matching) |
| `flows` | flow ต่อเส้น (คีย์ `from>to`) ในเครือข่าย flow |
| `dataStructure` | แถว label/value ในแผง inspector |
| `metrics` | `comparisons swaps visitedNodes operations flow matched` |
| `line` | บังคับบรรทัด pseudocode เมื่อ `type` อย่างเดียวกำกวม |

### โฟลเดอร์สำคัญ
- `src/algorithms/<กลุ่ม>/` — engine ล้วน ไม่มี React: `search`, `pathfinding`, `spanning`, `sorting`, `searching` (array search), `ordering` (topological), `connectivity` (SCC), `flow`, `matching`
- `src/algorithms/registry.ts` — รายการอัลกอริทึมต่อกลุ่ม (`SEARCH_ALGORITHMS`, `PATHFINDING_ALGORITHMS`, `SORTING_ALGORITHMS`, `ARRAY_SEARCH_ALGORITHMS`, `NEGATIVE_ALGORITHMS`, `ORDERING_ALGORITHMS`, `COMPONENT_ALGORITHMS`, `FLOW_ALGORITHMS`, `MATCHING_ALGORITHMS`, ...) ทุกหน้า เมนู และ Compare อ่านจากที่นี่
- `src/algorithms/shared/` — `graph.ts` (กราฟตัวอย่างทั้งหมด `SAMPLE_GRAPH`, `DIRECTED_*`, `DAG_*`, `SCC_SAMPLE`, `FLOW_*`, `MATCH_*`, `gridToGraph`, `getNeighbors`), `graphTypes.ts`, `graphEdit.ts` (เพิ่ม/ลบ/ย้ายโหนดและเส้น), `graphCodec.ts` (กราฟ ↔ ข้อความใน URL), `pseudocode.ts` (`PSEUDOCODE` + `activeLine`), `benchmark.ts` (วัดจากการรันจริงสำหรับ Compare), `predict.ts` (คำถามโหมดทาย), `arrayInput.ts`
- `src/algoviz/pages/` — `AlgoVizHomePage`, `AlgoVizModulePage` (หน้า lab ทุกหน้าใช้คอมโพเนนต์นี้ ตาราง `moduleContent` ผูก path กับ category และ options)
- `src/algoviz/components/` — `AlgoVizLab` (เฉพาะ lab หนึ่งหน้า), `CompareLab`, `GraphCanvas` (SVG, ลูกศร, label น้ำหนัก/flow, ลากโหนด), `MapInput` (hook `useMapInput(mode)` + ตัวเลือกกราฟ + ตัวแก้กราฟ), `InputEditors` (ช่องตัวเลข, กริดแผนที่, ช่องค่าที่หา), `PredictPanel`, `PlaybackControls`, `usePlayback`, `LineChart`
- `src/AlgoVizRoutes.tsx` — `MODULE_PATHS` (ทุกลิงก์ในเมนูต้องมี route ที่นี่ มีเทสต์เฝ้า)

### หน้า (path → category ใน `AlgoVizLab`)
`/search` `/pathfinding` `/spanning` `/sorting` `/array-search` `/negative-weights` (negative) `/topological-sort` (ordering) `/strongly-connected` (components) `/max-flow` (flow) `/matching` `/compare`

### โหมดกราฟของ `useMapInput`
`off` · `route` (ไม่มีทิศทาง มีน้ำหนัก ใช้ Search/Pathfinding รองรับกริดแผนที่) · `tree` (Spanning) · `directed` (น้ำหนักติดลบได้) · `dag` (task graph ไม่มีน้ำหนัก) · `scc` · `flow` (ความจุ 1–99, source/sink = start/goal) · `match` (สองฝั่ง ไม่มีทิศทาง ไม่มีน้ำหนัก) ธงบน `GraphInput`: `directed`, `unweighted`, `flow` ฟังก์ชัน `graphFits(mode, graph)` เช็กว่ากราฟจากลิงก์เข้ากับโหมด และ `allowsNegative(graph)` กำหนดช่วงน้ำหนัก

### รูปแบบกราฟใน URL (`graphCodec.ts`)
`?graph=<โหนด>~<เส้น>~<start>~<goal>[~ธง]` โหนดแบบ `id:x:y` คั่นด้วย `,` เส้นแบบ `from:to:weight` ธง: `d` (มีทิศทาง น้ำหนักติดลบได้) `du` (มีทิศทาง ไม่มีน้ำหนัก) `df` (flow) `u` (ไม่มีทิศทาง ไม่มีน้ำหนัก) ค่าที่ผิดรูปแบบหรือเกินช่วงจะถูกทิ้งแล้วกลับไปกราฟตัวอย่าง

พารามิเตอร์ URL อื่น: `algorithm`, `values` (ตัวเลขที่พิมพ์เอง), `target` (ค่าที่หา), `family` (กลุ่มใน Compare) `AlgoVizModulePage.updateParams` อ่านลิงก์ล่าสุดจาก ref เสมอ (เคยมีบั๊กที่การเปลี่ยนลิงก์สองอย่างเขียนทับกัน ห้ามกลับไปใช้ `setSearchParams((prev)=>...)` แบบเดิม)

## 3. สิ่งที่ทำเสร็จแล้ว (ทั้งหมดอยู่บน production)

### อัลกอริทึม 30 ตัว
- **Search (4):** BFS, DFS, Bidirectional BFS, Greedy Best-First
- **Pathfinding (4):** Dijkstra, A*, Bellman-Ford (มีตรวจ negative cycle), Floyd-Warshall
- **Spanning (2):** Kruskal, Prim
- **Sorting (9):** Bubble, Selection, Insertion, Shell, Merge, Quick, Heap, Counting, Radix
- **Array search (2):** Binary, Linear
- **Topological (2):** Kahn, DFS ordering (ตรวจ dependency loop)
- **SCC (2):** Tarjan, Kosaraju
- **Max flow (2):** Edmonds-Karp, Ford-Fulkerson (แสดง min cut เป็นสองกลุ่มสี)
- **Matching (3):** Kuhn, Hopcroft-Karp, Greedy matching
- หน้า Negative edges ยังรวม Dijkstra ไว้โชว์ว่าพลาดตรงไหน (มีข้อความเทียบกับ Bellman-Ford)

### ฟีเจอร์ของแพลตฟอร์ม
- ควบคุมการเล่น: slider, ก่อนหน้า/ถัดไป, play, ความเร็ว, คีย์ลัด (Space, ←, →, Home, End; ไม่ทำงานเมื่อโฟกัสอยู่ในช่องกรอก)
- อินพุตเอง: ตัวเลข/preset สำหรับ sorting, กริดแผนที่วาดเอง (กำแพง ภูมิประเทศหนัก ย้ายจุดเริ่ม/จุดหมาย), **ตัวแก้กราฟ** (ลาก/เพิ่มโหนด ต่อเส้น แก้น้ำหนัก ลบ ใช้คีย์บอร์ดได้) และเก็บไว้ใน URL
- **Compare (8 กลุ่ม):** Sorting, Search & shortest paths, Spanning trees, Searching a list, Negative edges, SCC, Max flow, Matching ตัวเลขทุกตัวมาจากการรันจริง (`benchmark.ts` `measure`) มีตารางเทียบบนอินพุตเดียวกัน ประโยคสรุปที่คำนวณจากตัวเลข และกราฟการเติบโตตามขนาดอินพุตสำหรับกลุ่มที่มีความหมาย (sorting, routes, trees, lists, components) ส่วน negative, flow, matching ไม่มีกราฟโดยตั้งใจ
- **โหมดทายขั้นถัดไป** (`predict.ts`): คำถามคำนวณจาก step ที่บันทึกไว้จริง ไม่เฉลยในคำถาม มีคะแนน รองรับ: BFS DFS Bi-BFS Greedy Dijkstra A* Kahn Tarjan Kosaraju (โหนดไหนต่อ), Bubble/Insertion/Shell (สลับหรือไม่), Selection/Quick/Heap/Merge, Counting, Radix, Kruskal, Prim, Binary/Linear search, Bellman-Ford, Floyd-Warshall, Edmonds-Karp, Ford-Fulkerson
- การเข้าถึง: label/aria ครบ, ตาราง/กราฟมีข้อมูลสำรอง, สีไม่ใช่ช่องทางเดียว (รูป marker, ลายเส้น, เลขกลุ่ม), axe-core ไม่เหลือปัญหาทั้งจอกว้างและมือถือ (ตรวจที่ 1280 และ 375 px)

### การทดสอบ (375 ข้อ)
- **Engine:** property test เทียบ oracle อิสระทุกอัลกอริทึมสำคัญ (A* = Dijkstra, Bellman-Ford เทียบ Floyd, Kruskal เทียบ Prim, SCC เทียบ reachability, max flow เทียบ min cut ที่ไล่ทุกการตัด, matching เทียบ flow, ลำดับ topological ตรวจทุก dependency, negative cycle เทียบ oracle)
- **UI:** `*.test.tsx` ทุกหน้า รวม Compare, ลิงก์, โหมดทาย, ตัวแก้กราฟ และเทสต์ route ที่ตรวจว่าทุกลิงก์ในเมนูมีหน้า
- **ตรวจจริง:** สคริปต์ Playwright + axe ที่รันบน `vite preview` (ไม่ได้อยู่ใน repo เพราะ production บล็อก axe ด้วย CSP) ใช้ Playwright จาก `Nexus\node_modules`

## 4. วิธีทำงานที่ใช้มาตลอด (ให้ทำต่อแบบเดิม)

1. ทำบน branch `claude/changes` → ทดสอบ (`npx tsc --noEmit -p .` และ `npx vitest run`) → build → ตรวจในเบราว์เซอร์/axe ที่ 1280 และ 375 px
2. merge fast-forward เข้า `main` แล้ว `git push origin main` (Vercel deploy เอง) → รอจน bundle บน production มีข้อความใหม่ → ตรวจ production ด้วย Playwright
3. commit ลงท้ายด้วย `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
4. **ปิดท้ายทุกงานด้วย "แผนใหม่" เป็นข้อๆ พร้อมบอกข้อที่แนะนำ** (กติกาของผู้ใช้)
5. เป็นนิสัยเสมอ: เขียนเทสต์ที่ล้มก่อนแก้ถ้าเป็นบั๊ก, ไม่อ้างว่าเสร็จก่อนตรวจ production, ระบุข้อจำกัดตรงๆ

### ข้อควรระวังทางเทคนิค (เจอมาแล้ว)
- ไฟล์ใน repo บางไฟล์เป็น CRLF: สคริปต์แก้ไฟล์ต้องแปลงเป็น LF ก่อนแล้วค่อยเขียนกลับตามเดิม
- ใน Git Bash การเขียนโค้ดที่มี backslash ผ่าน heredoc/`sed`/`node -e` ทำให้ `\d`, `\(` หาย ให้เขียนสคริปต์ patch ด้วยเครื่องมือ Write/Edit แล้วค่อยรัน
- `/tmp` ของ Git Bash กับของ node คนละที่ ใช้ `$(cygpath -m /tmp)`
- `role="status"` มีหลายตัวบนหน้า ในเทสต์ให้ค้นด้วยข้อความ ไม่ใช่ role
- ถ้าโฟกัสอยู่ที่ checkbox/ช่องกรอก คีย์ลัดเล่น/ข้ามขั้นจะไม่ทำงาน (ตั้งใจ)
- Tarjan เรียงกลุ่มต่างจาก Kosaraju เสมอ เทสต์ต้องเทียบแบบเซต ไม่ใช่ลำดับ
- สร้างโหนดใหม่ในตัวแก้กราฟใช้ตัวอักษรแรกที่ว่าง (อาจซ้ำ id ของโหนดที่ลบไปแล้ว)

## 5. ข้อจำกัดที่ยังมีอยู่

- กราฟสูงสุด 12 โหนดในตัวแก้กราฟ (ตัวเลขที่พิมพ์เองสูงสุด 24 ตัว)
- Compare: กราฟที่สร้างเองเก็บใน URL ได้ แต่กลุ่ม negative/flow ไม่มีกราฟการเติบโต (matching มีแล้ว บนกราฟสองฝั่งที่ `bipartiteGraph(n)` สร้างให้; ช่องว่าง Kuhn กับ Hopcroft-Karp เป็นสมบัติของกราฟนี้ ไม่ใช่กรณีทั่วไป)
- โหมดทายยังไม่มีสำหรับ Hopcroft-Karp (Kuhn, Greedy และ DFS ordering มีแล้ว)
- Bellman-Ford ในกราฟสองทางบันทึกเฉพาะขั้นที่ระยะดีขึ้น (จำนวน step สั้นกว่าความจริง มีหมายเหตุบนหน้า Compare)
- A*, BFS, DFS, Greedy ไม่รองรับกราฟติดลบ (ไม่มี heuristic ที่ปลอดภัย) จึงไม่อยู่ในหน้า Negative edges
- ยังไม่มีการวัดเวลาจริง ("steps" คือจำนวนขั้นที่บันทึกไว้เพื่อแสดงผล ไม่ใช่เวลา)
- เมนูจัดกลุ่มเป็น Graphs / Sorting & searching / Flow & matching พร้อม Learn และ Compare (ตั้งใจให้เพิ่มหน้าใหม่ในกลุ่มที่มีอยู่)

## 6. สถานะแผน

เสร็จแล้ว: โหมดทาย Matching + DFS ordering, Hopcroft-Karp + กราฟการเติบโตของ matching, จัดกลุ่มเมนู/Home, README พร้อมภาพหน้าจอ (`docs/screenshots`), ตรวจ production ด้วย axe ที่ 1280 และ 375 px (ไม่พบปัญหา)

ยังไม่ได้ทำ (ตัดสินใจหยุดเพราะผลตอบแทนน้อย):

1. ตัวแก้กราฟเกิน 12 โหนด พร้อม layout อัตโนมัติและปุ่มสุ่มกราฟ
2. ตัววัดเวลาจริง (ms) เป็นแท็บเสริมใน Compare พร้อมคำเตือนว่าผลขึ้นกับเครื่อง
3. โหมดทายสำหรับ Hopcroft-Karp

## 7. งานค้างฝั่งอื่น (นอก AlgoViz แต่อยู่ในแผนรวม)

- Nexus: เปิด "Confirm email" ใน Supabase กลับหลังตั้ง SMTP, ตั้ง `ANTHROPIC_API_KEY` และ deploy ฟังก์ชัน AI Coach, แก้เทสต์ `TopBar.test.tsx` ที่ flaky, ลบบัญชีทดสอบใน Supabase Auth ถ้าเป็นบัญชีชั่วคราว
- โฟลเดอร์ซ้ำ `D:\Project_001\AlgoViz` ถูกลบแล้ว (2026-10-31) งานทั้งหมดอยู่ที่ `D:\Project_001\Nexus-Project\AlgoViz` เท่านั้น
