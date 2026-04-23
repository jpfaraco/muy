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
npm run test       # Vitest (36 tests, single run)
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

- `heldLayerIds`: layers currently held (being recorded)
- `floatingWidgets`: active property widgets on canvas
- `layerListEntries`: per-layer sensitivity % for recording
- `liveLayerProps`: property overrides applied during active gesture (not yet committed to frames)

All store actions **must return new objects/arrays** — never mutate in place. This is enforced throughout; preserve it when extending.

### Component layout

```
App
├── Header (menu bar: File, Edit, View)
├── LeftPanel
│   ├── LayersPanel (layer tree + import)
│   └── PropertiesPanel (property buttons that spawn widgets)
├── CanvasArea
│   ├── AnimationCanvas (main render canvas — reads from animationStore + liveLayerProps)
│   ├── DrawingLayer (vector strokes, pencil/eraser tools — 28 KB, complex coordinate math)
│   └── WidgetLayer (floating property widgets overlay)
└── Timeline (playback controls, mode tabs: Draw/Animate, filmstrip)
```

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
