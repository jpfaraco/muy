import { create } from 'zustand'

export const MIN_CANVAS_ZOOM = 0.1
export const MAX_CANVAS_ZOOM = 8
export const CANVAS_ZOOM_STEP = 1.25

interface CanvasViewState {
  zoom: number
  panX: number
  panY: number
  fitHandler: (() => void) | null
}

interface CanvasViewActions {
  setTransform: (transform: { zoom: number; panX: number; panY: number }) => void
  setZoomPreset: (zoom: number) => void
  zoomByFactor: (factor: number) => void
  setFitHandler: (handler: (() => void) | null) => void
  fit: () => void
}

type CanvasViewStore = CanvasViewState & CanvasViewActions

function clampZoom(zoom: number) {
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, zoom))
}

export const useCanvasViewStore = create<CanvasViewStore>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  fitHandler: null,

  setTransform: ({ zoom, panX, panY }) =>
    set({
      zoom: clampZoom(zoom),
      panX,
      panY,
    }),

  setZoomPreset: (zoom) =>
    set({
      zoom: clampZoom(zoom),
      panX: 0,
      panY: 0,
    }),

  zoomByFactor: (factor) =>
    set((state) => ({
      zoom: clampZoom(state.zoom * factor),
      panX: state.panX,
      panY: state.panY,
    })),

  setFitHandler: (fitHandler) => set({ fitHandler }),

  fit: () => {
    get().fitHandler?.()
  },
}))
