# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Muy

Muy is a browser-based animation performance tool inspired by Bret Victor's unreleased iPad demo. Instead of keyframes/tweens, the user _performs_ animations in real time: select a layer in the layers panel, drag on canvas, and the timeline records every frame. See `_description/description.md` for a full description of the original demo.

Key constraints:

- iPad + touch first (Pointer Events API); desktop mouse is secondary
- No export, no persistence — playback only, session only
- Sample assets bundled (SVG placeholders: background, midground, foreground, trunk, leaf×2, bunny×3 poses)
- Prefer Base UI for overlay controls that must work with Apple Pencil on iPad. In this app, Base UI fixed Pencil interaction for dropdown menus and dialogs; the equivalent Radix UI versions did not. `Popover` remains safe to use.

## Commands

```bash
npm run dev        # Vite dev server on port 5173
npm run build      # tsc -b && vite build (produces ~218 KB JS bundle)
npm run lint       # ESLint
npm run test       # Vitest (64 tests, single run)
npm run test:watch # Vitest watch mode
npm run preview    # Local production preview on port 4173
```

Run a single test file:

```bash
npx vitest run src/test/animationStore.test.ts
```

## Architecture

### State — two Zustand stores

**`src/store/animationStore.ts`** — animation data and playback state

- `AnimationDoc`: `fps`, `frameCount`, `layers[]`, `imageAssets[]`, `frames[]`
- `currentFrame`, `isPlaying`
- `frames[]` is sparse: only animated properties are stored; `getLayerPropsAtFrame()` scans backward to find the last-set value for any property

**`src/store/interactionStore.ts`** — ephemeral UI interaction state

- `heldLayerIds`: currently selected layer IDs (tap to toggle in the Layers panel)
- `floatingWidgets`: active property widgets on canvas
- `layerListEntries`: per-layer sensitivity % for recording
- `liveLayerProps`: property overrides applied during active gesture (not yet committed to frames)

All store actions **must return new objects/arrays** — never mutate in place. This is enforced throughout; preserve it when extending.

### Component layout

```
App
├── Header (menu bar: File, Edit, View; help button)
├── LeftPanel
│   ├── LayersPanel (layer tree + import; tap to toggle layer selection)
│   └── PropertiesPanel (property buttons that spawn widgets)
├── CanvasArea
│   ├── AnimationCanvas (main render canvas — reads from animationStore + liveLayerProps)
│   ├── DrawingLayer (vector strokes, pencil/eraser tools — complex coordinate math)
│   └── WidgetLayer (floating property widgets overlay)
└── Timeline (playback controls + filmstrip)
    └── Toolbox (persistent toolbar: Select, Undo, Redo, Pencil, Eraser, Pivot, Animate)
```

**Active tool** (`ActiveTool = 'select' | 'pencil' | 'eraser' | 'pivot' | 'animate'`) lives in `interactionStore`. Selecting Animate reveals 6 property buttons (Move X, Move Y, Rotate, Scale, Alpha, Path) above the toolbar. In Select mode, dragging the canvas moves all selected layers. In Pencil/Eraser/Pivot modes, the canvas handles drawing/erasing/pivot interactions instead.

**Undo/redo** uses `zundo` temporal middleware wrapping `animationStore`. Only `doc` and `drawStrokes` are partialized; playback state (`currentFrame`, `isPlaying`) is excluded. Each gesture (stroke, erase, animate drag, layer move) is coalesced into one history entry via `captureHistoryEntry()` + `pause()`/`resume()`. Keyboard: ⌘Z / ⌘⇧Z; also available as toolbar buttons and Edit menu items.

### Core hooks

**`useAnimationLoop`** — rAF-driven playback. Uses `getState()` inside the loop (not React state) to avoid stale closure issues with `isPlaying` and `fps`.

**`usePropertyRecording`** — Most complex hook. Connects widget manipulation to frame writes.

- Maintains `liveValuesRef` across frames
- `prevWrittenFrameRef` tracks last write to gap-fill frames skipped by React batching
- `recordDelta()` applies sensitivity % from `LayerListEntry`
- Writes via `writeFrameValues` / `writeFrameValuesRange` in animationStore

**`useWidgetDrag`** — Tracks pointer position and velocity for flick-to-dismiss (threshold: 600 px/s).

**`useCanvasTransform`** — Zoom/pan state; provides matrix transform for the canvas container.

### Floating widgets

Located in `src/components/widgets/`. Each widget type (`SliderWidget`, `RotationWidget`, `LayerListWidget`) is spawned by PropertyButton and overlaid on WidgetLayer. Widgets are dismissed by flick gesture or manual close.

### Canvas coordinate transforms

`DrawingLayer.tsx` applies matrix transforms (pivot rotation → scale → translate) and their inverses when recording strokes in local layer space. This is the most intricate geometric code in the project.

## UI components (CRITICAL)

**Always use shadcn/ui for standard UI components. Never build buttons, inputs, dialogs, labels, selects, checkboxes, or other common UI primitives from scratch.**

### Workflow

1. **Check `src/components/ui/` first.** These shadcn components are already installed:
   - `button` — `Button`
   - `dialog` — `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
   - `dropdown-menu` — `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuSub`, etc.
   - `field` — `Field`
   - `input` — `Input`
   - `label` — `Label`
   - `popover` — `Popover`, `PopoverContent`, `PopoverTrigger`
   - `separator` — `Separator`
   - `tabs` — `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

2. **If a needed component is not installed**, install it before writing any code:
   ```bash
   npx shadcn@latest add <component>
   ```
   Do **not** hand-roll a substitute — run the CLI.

3. **Use context7 to look up the correct shadcn API** before using a component. Import paths, prop names, and composition patterns differ from the docs of other libraries and must be exact.

4. **Never re-implement shadcn component internals** or copy-paste their markup into a new file. Import the component and compose it.

5. **Exception:** Base UI components (`@base-ui-components/react`) are used for overlay controls (menus, dialogs) that must work with Apple Pencil — see the key constraints above. Do not replace these with shadcn/Radix equivalents.

## Tech stack

| Layer     | Technology                                        |
| --------- | ------------------------------------------------- |
| Framework | React 19, TypeScript 6                            |
| Build     | Vite 8 + `@vitejs/plugin-react` (Oxc transformer) |
| State     | Zustand 5                                         |
| Styling   | Tailwind CSS v4, shadcn/ui, Base UI + Radix primitives |
| Canvas    | HTML5 Canvas 2D, Pointer Events API               |
| Icons     | Lucide React                                      |
| Testing   | Vitest 4, @testing-library/react, jsdom           |

Path alias `@/` maps to `src/` (configured in `tsconfig.app.json` and `vite.config.ts`).

## Testing

Tests live in `src/test/`. Coverage targets: stores, hooks, and sample scene initialization. The jsdom environment is configured in `vite.config.ts`; setup file at `src/test/setup.ts` imports `@testing-library/jest-dom`.
