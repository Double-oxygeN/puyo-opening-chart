# Copilot Instructions

## Project Overview

A web tool for researching Puyo Puyo Tsuu openings. The app models board states as a directed graph: nodes are board states, edges are puyo pair placements. Users build the graph by placing pairs on the board, branching to explore different opening sequences.

All UI text, comments, and documentation are in **Japanese**.

## Commands

```bash
npm run dev           # Dev server (http://localhost:5173)
npm run build         # Type-check + production build
npm run lint          # ESLint (type-checked rules)
npm run format:check  # Prettier check
npm run test          # Unit tests (Vitest)
npm run test:watch    # Unit tests in watch mode
npm run test:e2e      # E2E tests (Playwright, requires prior build)
```

Run a single unit test file:

```bash
npx vitest run src/domain/board.test.ts
```

Run a single E2E test:

```bash
npx playwright test e2e/app.spec.ts
```

## Architecture

### Domain Layer (`src/domain/`)

Pure functions with immutable data. No React dependencies. This is the functional core.

- **`color.ts`** — Puyo colors as numeric constants using the `as const` + type extraction pattern (not TypeScript enums). Provides display mappings (`PUYO_BG_CLASSES`, `PUYO_HEX_COLORS`, `COLOR_LABELS`)
- **`board.ts`** — 6×13 grid (6 cols, 12 visible rows + hidden row 13). `Board` is `PuyoColor[][]` where `board[row][col]`, **row 0 = bottom**. All operations return new arrays (immutable)
- **`pair.ts`** — Puyo pair (axis + child puyo) manipulation: movement, rotation with wall/floor kicks, placement with gravity (drop + split/ちぎり)
- **`chain.ts`** — Chain resolution and scoring. Calculates cascade elimination step by step and formats results as chain notation (see `docs/chain-notation.md`)
- **`difficulty.ts`** — Difficulty levels (Mild/Medium/Hot) and available Puyo colors per difficulty
- **`graph.ts`** — Directed graph (nodes = board states, edges = pair placements). Uses branded types (`NodeId`, `EdgeId`) for type-safe IDs

### React Layer

- **Hooks**
  - **`useGraph.ts`** — Graph state management via `useReducer`. Actions: `placeAndAddNode`, `selectNode`, `updateMemo`, `deleteNode`, `resetGraph`, `hydrateGraph`, `importGraph`
  - **`useGraphStorage.ts`** — localStorage persistence of graph data and difficulty. Import/export to JSON files
  - **`useKeyboardInput.ts`** — Keyboard event handling for pair movement (arrows), rotation (Z/X), and placement (Down/Enter)
  - **`useTsumoState.ts`** — Manages current, next, and next-next Puyo pair state with editing and random generation
- **Components**
  - **`BoardView`** — Grid display with drop preview
  - **`PairController`** — Movement/rotation controls
  - **`PairSelector`** — Color picker for new pairs
  - **`PairEditMenu`** / **`PairSlot`** — Inline pair color editing
  - **`GraphTreeView`** — Tree navigation
  - **`NodeThumbnail`** — SVG thumbnail of a board state
  - **`BoardOperationDialog`** — Side panel for pair editing, memo, and node deletion
  - **`HeaderMenu`** — Dropdown menu for difficulty, random tsumo toggle, import/export/reset

### Data Flow

```
User input → PairController → pair manipulation (domain) → useGraph dispatch
→ placePair (domain) → new Board → addNode/addEdge (domain) → re-render
                                  ↕ useGraphStorage (localStorage)
```

## Conventions

- **Const objects as enums**: Use `as const` objects + type extraction instead of TypeScript `enum`. Example: `export const PuyoColor = { Empty: 0, Red: 1, ... } as const; export type PuyoColor = (typeof PuyoColor)[keyof typeof PuyoColor]`
- **Branded types**: IDs use branded string types (e.g., `type NodeId = string & { readonly __brand: 'NodeId' }`) for compile-time safety
- **Immutable domain**: Domain functions never mutate; they return new data structures
- **Test co-location**: Unit tests live next to source files (`board.test.ts` beside `board.ts`). E2E tests are in `e2e/`
- **Styling**: Tailwind CSS v4 via Vite plugin. Color mappings in `color.ts` (`PUYO_BG_CLASSES`, `PUYO_HEX_COLORS`)
- **Formatting**: Prettier with single quotes, no semicolons, trailing commas. Enforced via husky pre-commit hook with lint-staged

## Domain Knowledge

See `docs/puyo-rules.md` for detailed game rules, `docs/chain-notation.md` for chain notation format, and `docs/data-format.md` for the JSON serialization spec. Key points for development:

- Board is 6 cols × 13 rows (row 13 is hidden, excluded from chain detection)
- A pair has an **axis puyo** (pivot) and a **child puyo** (rotates around axis)
- Pair spawns at column 3 (0-indexed: col 2), child above axis
- Column 3 row 12 blocked = game over (窒息)
- 4+ same-color connected (orthogonal) = elimination → chain
- Wall kick: rotation blocked by wall → shift 1 cell away from wall
- Split/ちぎり: when pair lands on uneven terrain, puyos separate and fall independently
