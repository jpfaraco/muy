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

1. **Build your scene** — import image layers via the + button in the Layers panel, or draw with the Pencil or Text tool.
2. **Select layers** — tap a layer name in the Layers panel to toggle selection. With the Select tool active, drag the canvas to move selected layers.
3. **Animate** — select the Animate tool (filmstrip icon). Property buttons (Move X, Move Y, Rotate, Scale, Alpha, Reveal) appear above the toolbar. Hit Play, then drag a widget to record that property in real time.
4. Hit Stop, scrub the timeline, and use Undo (⌘Z / Ctrl+Z) to discard the entire take and try again.

The toolbar also has Pencil, Eraser, and Pivot tools for building and adjusting your scene. Property widgets are dismissed by flicking them away.

## Projects

Projects are saved to your browser's local storage. Use **File → Save** and **File → Open** to manage them. Use **File → Export** to download a `.muy` file for backup or transfer, and **File → Import** to load one.

## Tech stack

React 19 · TypeScript · Vite · Zustand · Tailwind CSS v4 · HTML5 Canvas · Pointer Events API

Designed for iPad + touch first; desktop mouse is secondary.
