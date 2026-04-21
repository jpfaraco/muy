Muy is a browser-based animation performance tool inspired by Bret Victor's unreleased iPad demo. Instead of keyframes/tweens, the user _performs_ animations in real time by holding layer items and dragging on canvas while the timeline records every frame.

Detailed description of Bret's demo: `_description/description.md` and attached images in `_description/assets`.

**Tech stack:** React + TypeScript, Vite, Zustand, Tailwind CSS v4, HTML5 Canvas, Pointer Events API

**Key constraints:**

- iPad + touch first (Pointer Events); desktop mouse is secondary
- No export — playback only
- No persistence — session only
- Sample assets bundled (SVG placeholders for: background, midground, foreground, trunk, leaf×2 poses, bunny×3 poses)

**Current state:**

- Full project scaffold at `/Users/jpfaraco/workspace/muy/`
- All core interactions implemented but with many bugs: layer hold, canvas drag recording, property widgets (slider-h, slider-v, rotation dial, image picker, layer list)
- 36 unit/integration tests pass (Vitest)
- Build clean (218 KB JS bundle)

**Architecture decisions:**

- `animationStore.ts` — Zustand: AnimationDoc (fps, frameCount, layers, imageAssets, frames[]) + currentFrame + isPlaying
- `interactionStore.ts` — Zustand: heldLayerIds, floatingWidgets, layerListEntries (with sensitivity %)
- `useAnimationLoop` — rAF loop driving frame advancement
- `usePropertyRecording` — connects widget manipulation to frame writes, respects sensitivity
- `useWidgetDrag` — flick-to-dismiss (velocity > 600 px/s) + position tracking

**Why:** User wants to validate the performance-capture animation UX before building asset creation tools.

**How to apply:** When extending, preserve immutable update patterns in all store actions. All frame data mutations must return new arrays/objects.
