import { create } from 'zustand'
import type { FloatingWidget, LayerListEntry, Vec2, WidgetType } from '../types/interaction'
import type { LayerProps, PropertyKey } from '../types/animation'

export type AppMode = 'animate' | 'draw'
export type DrawTool = 'pencil' | 'eraser' | 'move' | 'pivot'
export type ActiveTool = 'select' | 'hand' | 'pencil' | 'eraser' | 'pivot' | 'animate'

interface InteractionState {
  /** Unified toolbar tool — drives both mode and drawTool */
  activeTool: ActiveTool
  /** Current editor mode */
  mode: AppMode
  /** Active drawing tool (draw mode only) */
  drawTool: DrawTool
  /** Stroke color as CSS hex string */
  drawColor: string
  /** Pencil stroke width (1–64) */
  pencilWidth: number
  /** Pencil smoothing (0–100); 0 = default fidelity, 100 = maximum smoothing */
  pencilSmoothing: number
  /** Eraser stroke width (1–128) */
  eraserWidth: number
  /** Active stroke width forwarded to DrawingLayer (mirrors pencilWidth or eraserWidth) */
  drawWidth: number
  /** Layer IDs currently held (finger down) in the layers panel */
  heldLayerIds: string[]
  /** Group IDs that were directly tapped (not inferred from children) */
  heldGroupIds: string[]
  /** Persistent selection — survives pointer release, drives filmstrip keyframe display */
  selectedLayerIds: string[]
  /** When active, a floating multi-layer list widget is present */
  layerListEntries: LayerListEntry[] | null
  /** All floating property/image widgets on the canvas */
  floatingWidgets: FloatingWidget[]
  /** Tracks if the canvas is being dragged (for x/y recording) */
  canvasDragActive: boolean
  /** Live property overrides that should win while a pointer is actively manipulating */
  liveLayerProps: Record<string, Partial<LayerProps>>
  /** Active layer reorder drag state */
  reorderDrag: { draggingLayerIds: string[]; insertBefore: string | null; insertParent: string | null } | null
  /** Whether the sensitivity scrubbers are visible in the layers panel */
  showLayerSensitivity: boolean
}

interface InteractionActions {
  setActiveTool: (tool: ActiveTool) => void
  setMode: (mode: AppMode) => void
  setDrawTool: (tool: DrawTool) => void
  setDrawColor: (color: string) => void
  setPencilWidth: (width: number) => void
  setPencilSmoothing: (smoothing: number) => void
  setEraserWidth: (width: number) => void
  setHeldLayers: (layerIds: string[]) => void
  holdLayer: (layerId: string) => void
  releaseLayer: (layerId: string) => void
  releaseAllLayers: () => void
  holdGroup: (groupId: string) => void
  releaseGroup: (groupId: string) => void
  addWidget: (widget: Omit<FloatingWidget, 'id' | 'velocity' | 'isDismissing'>) => string
  updateWidgetPosition: (id: string, position: Vec2, velocity: Vec2) => void
  dismissWidget: (id: string) => void
  removeWidget: (id: string) => void
  selectLayers: (ids: string[]) => void
  setLayerListEntries: (entries: LayerListEntry[] | null) => void
  addLayerToList: (layerId: string) => void
  setShowLayerSensitivity: (show: boolean) => void
  setCanvasDragActive: (active: boolean) => void
  setLiveLayerProps: (updates: Array<{ layerId: string; props: Partial<LayerProps> }>) => void
  startReorder: (layerIds: string[]) => void
  updateReorderInsert: (insertBefore: string | null, insertParent: string | null) => void
  endReorder: () => void
  clearLiveLayerProps: (layerIds: string[], properties?: PropertyKey[]) => void
  /** Returns the effective held layer IDs — from layerListEntries if present, else heldLayerIds */
  getEffectiveHeldLayers: () => string[]
}

type InteractionStore = InteractionState & InteractionActions

let widgetIdCounter = 0

export const useInteractionStore = create<InteractionStore>((set, get) => ({
  activeTool: 'select',
  mode: 'animate',
  drawTool: 'pencil',
  drawColor: '#000000',
  pencilWidth: 16,
  pencilSmoothing: 0,
  eraserWidth: 32,
  drawWidth: 16,
  heldLayerIds: [],
  heldGroupIds: [],
  selectedLayerIds: [],
  layerListEntries: null,
  floatingWidgets: [],
  canvasDragActive: false,
  liveLayerProps: {},
  reorderDrag: null,
  showLayerSensitivity: false,

  setActiveTool: (tool) => {
    const modeMap: Record<ActiveTool, AppMode> = {
      select: 'animate',
      hand: 'animate',
      pencil: 'draw',
      eraser: 'draw',
      pivot: 'draw',
      animate: 'animate',
    }
    const drawToolMap: Partial<Record<ActiveTool, DrawTool>> = {
      pencil: 'pencil',
      eraser: 'eraser',
      pivot: 'pivot',
    }
    const { pencilWidth, eraserWidth } = get()
    const next: Partial<{ activeTool: ActiveTool; mode: AppMode; drawTool: DrawTool; drawWidth: number }> = {
      activeTool: tool,
      mode: modeMap[tool],
    }
    if (drawToolMap[tool]) next.drawTool = drawToolMap[tool]
    if (tool === 'pencil') next.drawWidth = pencilWidth
    if (tool === 'eraser') next.drawWidth = eraserWidth
    set(next)
  },
  setMode: (mode) => set({ mode }),
  setDrawTool: (drawTool) => set({ drawTool }),
  setDrawColor: (drawColor) => set({ drawColor }),
  setPencilWidth: (pencilWidth) =>
    set((state) => ({
      pencilWidth,
      ...(state.activeTool === 'pencil' ? { drawWidth: pencilWidth } : {}),
    })),
  setPencilSmoothing: (pencilSmoothing) => set({ pencilSmoothing }),
  setEraserWidth: (eraserWidth) =>
    set((state) => ({
      eraserWidth,
      ...(state.activeTool === 'eraser' ? { drawWidth: eraserWidth } : {}),
    })),
  setHeldLayers: (layerIds) => {
    const deduped = Array.from(new Set(layerIds))
    set({
      heldLayerIds: deduped,
      selectedLayerIds: deduped,
    })
  },

  holdLayer: (layerId) =>
    set((state) => {
      if (state.heldLayerIds.includes(layerId)) return {}
      const isFirstHeld = state.heldLayerIds.length === 0
      return {
        heldLayerIds: [...state.heldLayerIds, layerId],
        selectedLayerIds: isFirstHeld
          ? [layerId]
          : [...state.selectedLayerIds, layerId],
      }
    }),

  selectLayers: (ids) => set({ selectedLayerIds: ids }),

  releaseLayer: (layerId) =>
    set((state) => ({
      heldLayerIds: state.heldLayerIds.filter((id) => id !== layerId),
      selectedLayerIds: state.selectedLayerIds.filter((id) => id !== layerId),
    })),

  releaseAllLayers: () => set({ heldLayerIds: [], heldGroupIds: [], selectedLayerIds: [] }),

  holdGroup: (groupId) =>
    set((state) => {
      if (state.heldGroupIds.includes(groupId)) return {}
      return { heldGroupIds: [...state.heldGroupIds, groupId] }
    }),

  releaseGroup: (groupId) =>
    set((state) => ({ heldGroupIds: state.heldGroupIds.filter((id) => id !== groupId) })),

  addWidget: (widget) => {
    const id = `widget-${++widgetIdCounter}`
    const full: FloatingWidget = {
      ...widget,
      id,
      velocity: { x: 0, y: 0 },
      isDismissing: false,
    }
    set((state) => ({ floatingWidgets: [...state.floatingWidgets, full] }))
    return id
  },

  updateWidgetPosition: (id, position, velocity) =>
    set((state) => ({
      floatingWidgets: state.floatingWidgets.map((w) =>
        w.id === id ? { ...w, position, velocity } : w
      ),
    })),

  dismissWidget: (id) =>
    set((state) => ({
      floatingWidgets: state.floatingWidgets.map((w) =>
        w.id === id ? { ...w, isDismissing: true } : w
      ),
    })),

  removeWidget: (id) =>
    set((state) => ({
      floatingWidgets: state.floatingWidgets.filter((w) => w.id !== id),
    })),

  setLayerListEntries: (entries) =>
    set((state) => ({
      layerListEntries: entries,
      selectedLayerIds: entries ? entries.map((e) => e.layerId) : state.selectedLayerIds,
    })),

  addLayerToList: (layerId) =>
    set((state) => {
      if (!state.layerListEntries) return {}
      if (state.layerListEntries.some((e) => e.layerId === layerId)) return {}
      return {
        layerListEntries: [...state.layerListEntries, { layerId }],
      }
    }),

  setShowLayerSensitivity: (showLayerSensitivity) => set({ showLayerSensitivity }),

  setCanvasDragActive: (canvasDragActive) => set({ canvasDragActive }),

  startReorder: (layerIds) =>
    set({ reorderDrag: { draggingLayerIds: layerIds, insertBefore: null, insertParent: null } }),

  updateReorderInsert: (insertBefore, insertParent) =>
    set((state) =>
      state.reorderDrag ? { reorderDrag: { ...state.reorderDrag, insertBefore, insertParent } } : {}
    ),

  endReorder: () => set({ reorderDrag: null }),

  setLiveLayerProps: (updates) =>
    set((state) => {
      let liveLayerProps = state.liveLayerProps

      for (const { layerId, props } of updates) {
        const existing = liveLayerProps[layerId] ?? {}
        liveLayerProps = {
          ...liveLayerProps,
          [layerId]: { ...existing, ...props },
        }
      }

      return { liveLayerProps }
    }),

  clearLiveLayerProps: (layerIds, properties) =>
    set((state) => {
      let liveLayerProps = state.liveLayerProps

      for (const layerId of layerIds) {
        const existing = liveLayerProps[layerId]
        if (!existing) continue

        if (!properties || properties.length === 0) {
          const { [layerId]: _removed, ...rest } = liveLayerProps
          liveLayerProps = rest
          continue
        }

        const nextProps = { ...existing }
        for (const property of properties) {
          delete nextProps[property]
        }

        if (Object.keys(nextProps).length === 0) {
          const { [layerId]: _removed, ...rest } = liveLayerProps
          liveLayerProps = rest
          continue
        }

        liveLayerProps = {
          ...liveLayerProps,
          [layerId]: nextProps,
        }
      }

      return { liveLayerProps }
    }),

  getEffectiveHeldLayers: () => {
    const { heldLayerIds, layerListEntries } = get()
    if (layerListEntries && layerListEntries.length > 0) {
      return layerListEntries.map((e) => e.layerId)
    }
    return heldLayerIds
  },
}))

/** Map a PropertyKey to its widget type */
export function propertyToWidgetType(property: PropertyKey): WidgetType {
  switch (property) {
    case 'y':
      return 'slider-v'
    case 'rotation':
      return 'rotation'
    case 'progress':
      return 'slider-h'
    default:
      return 'slider-h'
  }
}
