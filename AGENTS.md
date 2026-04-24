Muy is a browser-based animation performance tool inspired by Bret Victor's unreleased iPad demo. Instead of keyframes/tweens, the user _performs_ animations in real time: tap layers to select them, then drag property widgets while the timeline records every frame.

Detailed description of Bret's demo: `_description/description.md` and attached images in `_description/assets`.

**Tech stack:** React 19 + TypeScript, Vite, Zustand 5 + zundo (undo/redo), Tailwind CSS v4, shadcn/ui, Base UI, HTML5 Canvas, Pointer Events API

**UI primitives note:** Prefer Base UI primitives for overlay controls that must work with Apple Pencil on iPad. In this codebase, Base UI fixed Pencil interaction for dropdown menus and dialogs, while the equivalent Radix UI primitives did not. `Popover` is still fine as a Radix primitive.

**Key constraints:**

- iPad + touch first (Pointer Events); desktop mouse is secondary
- No export — playback only
- No persistence — session only
- Sample assets bundled (SVG placeholders for: background, midground, foreground, trunk, leaf×2 poses, bunny×3 poses)

**Current state:**

- Full project at `/Users/jpfaraco/workspace/muy/`
- Core interaction loop implemented: layer selection, canvas drag, property widget recording, vector drawing, undo/redo
- 64 unit/integration tests pass (Vitest), TypeScript compiles clean

**Architecture decisions:**

- `animationStore.ts` — Zustand + zundo temporal middleware: AnimationDoc (fps, frameCount, layers, imageAssets, frames[], canvasWidth, canvasHeight, backgroundColor) + drawStrokes + currentFrame + isPlaying. Only `doc` and `drawStrokes` are in the undo history; playback state is excluded.
- `interactionStore.ts` — Zustand (no undo): heldLayerIds (selected layers, tap to toggle), floatingWidgets, layerListEntries (with sensitivity %), liveLayerProps, activeTool ('select' | 'pencil' | 'eraser' | 'pivot' | 'animate')
- `useAnimationLoop` — rAF loop driving frame advancement
- `usePropertyRecording` — connects widget manipulation to frame writes, respects sensitivity, coalesces each gesture into one undo entry via captureHistoryEntry + pause/resume
- `useWidgetDrag` — flick-to-dismiss (velocity > 600 px/s) + position tracking
- `useUndoRedo` — keyboard handler for ⌘Z / ⌘⇧Z
- `CanvasSettingsDialog` — modal (opened from Header) for setting canvas width/height/background color
- `Toolbox` — persistent toolbar rendered inside Timeline: Select, Undo, Redo, Pencil, Eraser, Pivot, Animate
- `DrawingLayer` — vector strokes, pencil/eraser tools (complex coordinate math with matrix transforms)

**How the tools work:**

- **Select** — tap a layer in the Layers panel to toggle selection; drag canvas to move all selected layers
- **Pencil** — draw vector strokes; color and stroke-width options appear above the toolbar
- **Eraser** — erase vector strokes; width option appears above the toolbar
- **Pivot** — reposition the rotation pivot; Auto center button appears above the toolbar
- **Animate** — reveals 6 property widgets above the toolbar: Move X, Move Y, Rotate, Scale, Alpha, Path; drag a widget while playing to record

**Why:** User wants to validate the performance-capture animation UX before building asset creation tools.

**How to apply:** When extending, preserve immutable update patterns in all store actions. All frame data mutations must return new arrays/objects. Wrap gestures with captureHistoryEntry() + pause()/resume() to keep undo granularity at one step per gesture.
