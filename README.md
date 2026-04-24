# Muy

A browser-based animation performance tool inspired by Bret Victor's unreleased iPad demo.

Instead of keyframes and tweens, you _perform_ animations in real time: select a layer in the layers panel, drag on the canvas, and the timeline records every frame as you move.

## Getting started

```bash
npm install
npm run dev -- --host       # http://localhost:5173
```

## Commands

```bash
npm run dev -- --host       # Dev server with HMR
npm run build               # Type-check + production bundle
npm run preview             # Preview production build locally
npm run lint                # ESLint
npm run test                # Vitest (single run)
npm run test:watch
```

## How it works

1. Open the app — a sample scene loads with several layers (background, foreground, bunny poses, etc.)
2. **Select layers** — tap a layer name in the Layers panel to toggle selection. With the Select tool active, drag the canvas to move selected layers.
3. **Animate** — select the Animate tool (filmstrip icon in the toolbar). Property widgets (Move X, Move Y, Rotate, Scale, Alpha, Path) appear above the toolbar. Hit Play, then drag a widget to record that property in real time.
4. Hit Stop, scrub the timeline, and use Undo (⌘Z / Ctrl+Z) to try again.

The toolbar also has Pencil, Eraser, and Pivot tools for building and adjusting your scene. Property widgets are dismissed by flicking them away.

## Tech stack

React 19 · TypeScript · Vite · Zustand · Tailwind CSS v4 · HTML5 Canvas · Pointer Events API

Designed for iPad + touch first; desktop mouse is secondary.

## Status

Early MVP — core performance-capture loop is working. No export or persistence; playback only.
