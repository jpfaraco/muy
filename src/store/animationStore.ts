import { create } from 'zustand'
import type { AnimationDoc, Layer, LayerProps, PropertyKey, Stroke } from '../types/animation'
import { DEFAULT_LAYER_PROPS } from '../types/animation'

/** DFS-expand top-level layerIds to flat leaf render order */
export function getFlatRenderIds(doc: AnimationDoc): string[] {
  const expand = (id: string): string[] => {
    const layer = doc.layers[id]
    if (layer?.type === 'group' && layer.childIds) {
      return layer.childIds.flatMap(expand)
    }
    return [id]
  }
  return doc.layerIds.flatMap(expand)
}

interface AnimationState {
  doc: AnimationDoc
  currentFrame: number
  isPlaying: boolean
  /** Per-layer draw strokes — indexed by layerId, not frame-specific */
  drawStrokes: Record<string, Stroke[]>
}

interface AnimationActions {
  setDoc: (doc: AnimationDoc) => void
  setCurrentFrame: (frame: number) => void
  setIsPlaying: (playing: boolean) => void
  /** Write a single property value to a layer at a given frame */
  writeFrameValue: (frame: number, layerId: string, property: PropertyKey, value: number) => void
  /** Write multiple layer properties at once (used during drag recording) */
  writeFrameValues: (frame: number, updates: Array<{ layerId: string; property: PropertyKey; value: number }>) => void
  /** Write the same property updates to every frame in [fromFrame, toFrame] in one store update */
  writeFrameValuesRange: (fromFrame: number, toFrame: number, updates: Array<{ layerId: string; property: PropertyKey; value: number }>) => void
  getLayerPropsAtFrame: (layerId: string, frame: number) => LayerProps
  /** Append a completed stroke to a layer's draw strokes */
  addStroke: (layerId: string, stroke: Stroke) => void
  /** Overwrite all strokes for a layer (used by destructive eraser) */
  replaceLayerStrokes: (layerId: string, strokes: Stroke[]) => void
  /** Delete a layer and all its descendants */
  deleteLayer: (layerId: string) => void
  /** Rename a layer */
  renameLayer: (layerId: string, name: string) => void
  /** Reorder layers: move draggingIds before insertBefore inside insertParent (null = top-level) */
  reorderLayers: (draggingIds: string[], insertBefore: string | null, insertParent: string | null) => void
  /** Create a new empty vector layer at canvas origin and return its ID */
  createVectorLayer: () => string
  /** Set the pivot offset (local space) for a layer */
  setLayerPivot: (layerId: string, pivotX: number, pivotY: number) => void
  /** Update canvas dimensions and background color */
  setCanvasSettings: (canvasWidth: number, canvasHeight: number, backgroundColor: string) => void
}

type AnimationStore = AnimationState & AnimationActions

function makeEmptyFrames(count: number): AnimationDoc['frames'] {
  return Array.from({ length: count }, () => ({}))
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  doc: {
    fps: 24,
    frameCount: 240,
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#1a1a2e',
    layerIds: [],
    layers: {},
    imageAssets: {},
    frames: makeEmptyFrames(240),
  },
  currentFrame: 0,
  isPlaying: false,
  drawStrokes: {},

  setDoc: (doc) => set({ doc }),

  setCurrentFrame: (frame) =>
    set((state) => ({
      currentFrame: Math.max(0, Math.min(frame, state.doc.frameCount - 1)),
    })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  writeFrameValue: (frame, layerId, property, value) =>
    set((state) => {
      const frames = state.doc.frames.map((fd, i) => {
        if (i !== frame) return fd
        const existing = fd[layerId] ?? {}
        return { ...fd, [layerId]: { ...existing, [property]: value } }
      })
      return { doc: { ...state.doc, frames } }
    }),

  writeFrameValues: (frame, updates) =>
    set((state) => {
      const frames = state.doc.frames.map((fd, i) => {
        if (i !== frame) return fd
        let next = { ...fd }
        for (const { layerId, property, value } of updates) {
          const existing = next[layerId] ?? {}
          next = { ...next, [layerId]: { ...existing, [property]: value } }
        }
        return next
      })
      return { doc: { ...state.doc, frames } }
    }),

  getLayerPropsAtFrame: (layerId, frame) => {
    const { doc } = get()
    const keys: PropertyKey[] = ['x', 'y', 'rotation', 'scale', 'transparency', 'progress']
    const result: Partial<LayerProps> = {}
    for (const key of keys) {
      for (let i = frame; i >= 0; i--) {
        const entry = doc.frames[i]?.[layerId]
        if (entry !== undefined && key in entry) {
          result[key] = entry[key]
          break
        }
      }
      if (!(key in result)) result[key] = DEFAULT_LAYER_PROPS[key]
    }
    return result as LayerProps
  },

  addStroke: (layerId, stroke) =>
    set((state) => ({
      drawStrokes: {
        ...state.drawStrokes,
        [layerId]: [...(state.drawStrokes[layerId] ?? []), stroke],
      },
    })),

  writeFrameValuesRange: (fromFrame, toFrame, updates) =>
    set((state) => {
      const frames = state.doc.frames.map((fd, i) => {
        if (i < fromFrame || i > toFrame) return fd
        let next = { ...fd }
        for (const { layerId, property, value } of updates) {
          const existing = next[layerId] ?? {}
          next = { ...next, [layerId]: { ...existing, [property]: value } }
        }
        return next
      })
      return { doc: { ...state.doc, frames } }
    }),

  replaceLayerStrokes: (layerId, strokes) =>
    set((state) => ({
      drawStrokes: { ...state.drawStrokes, [layerId]: strokes },
    })),

  deleteLayer: (layerId) =>
    set((state) => {
      // Collect layerId + all descendants recursively
      const toDelete = new Set<string>()
      const collect = (id: string) => {
        toDelete.add(id)
        const layer = state.doc.layers[id]
        if (layer?.type === 'group' && layer.childIds) {
          for (const childId of layer.childIds) {
            collect(childId)
          }
        }
      }
      collect(layerId)

      // Remove from layers map
      const layers = Object.fromEntries(
        Object.entries(state.doc.layers).filter(([id]) => !toDelete.has(id))
      )

      // Remove from top-level layerIds
      const layerIds = state.doc.layerIds.filter((id) => !toDelete.has(id))

      // Remove from any parent's childIds
      const layersWithCleanedChildren = Object.fromEntries(
        Object.entries(layers).map(([id, layer]) => {
          if (layer.type !== 'group' || !layer.childIds) return [id, layer]
          return [id, { ...layer, childIds: layer.childIds.filter((cid) => !toDelete.has(cid)) }]
        })
      )

      // Remove draw strokes for deleted layers
      const drawStrokes = Object.fromEntries(
        Object.entries(state.drawStrokes).filter(([id]) => !toDelete.has(id))
      )

      return {
        doc: { ...state.doc, layers: layersWithCleanedChildren, layerIds },
        drawStrokes,
      }
    }),

  renameLayer: (layerId, name) =>
    set((state) => ({
      doc: {
        ...state.doc,
        layers: {
          ...state.doc.layers,
          [layerId]: { ...state.doc.layers[layerId], name },
        },
      },
    })),

  reorderLayers: (draggingIds, insertBefore, insertParent) =>
    set((state) => {
      let layers = { ...state.doc.layers }
      let layerIds = [...state.doc.layerIds]

      // Remove each dragging ID from its current container
      for (const id of draggingIds) {
        const layer = layers[id]
        if (!layer) continue
        const oldParent = layer.parentId
        if (oldParent === null) {
          layerIds = layerIds.filter((lid) => lid !== id)
        } else {
          const grp = layers[oldParent]
          if (grp?.type === 'group' && grp.childIds) {
            layers = { ...layers, [oldParent]: { ...grp, childIds: grp.childIds.filter((c) => c !== id) } }
          }
        }
        layers = { ...layers, [id]: { ...layer, parentId: insertParent } }
      }

      // Insert into target container
      if (insertParent === null) {
        const idx = insertBefore !== null ? layerIds.indexOf(insertBefore) : layerIds.length
        const safeIdx = idx === -1 ? layerIds.length : idx
        layerIds = [...layerIds.slice(0, safeIdx), ...draggingIds, ...layerIds.slice(safeIdx)]
      } else {
        const grp = layers[insertParent]
        if (grp?.type === 'group') {
          const childIds = grp.childIds ?? []
          const idx = insertBefore !== null ? childIds.indexOf(insertBefore) : childIds.length
          const safeIdx = idx === -1 ? childIds.length : idx
          layers = {
            ...layers,
            [insertParent]: {
              ...grp,
              childIds: [...childIds.slice(0, safeIdx), ...draggingIds, ...childIds.slice(safeIdx)],
            },
          }
        }
      }

      return { doc: { ...state.doc, layers, layerIds } }
    }),

  createVectorLayer: () => {
    const id = `vec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const count = Object.keys(get().doc.layers).filter(
      (k) => get().doc.layers[k].layerType === 'vector'
    ).length
    const newLayer: Layer = {
      id,
      name: `Vector ${count + 1}`,
      type: 'layer',
      layerType: 'vector',
      parentId: null,
    }
    set((state) => ({
      doc: {
        ...state.doc,
        layers: { ...state.doc.layers, [id]: newLayer },
        layerIds: [...state.doc.layerIds, id],
      },
    }))
    return id
  },

  setLayerPivot: (layerId, pivotX, pivotY) =>
    set((state) => ({
      doc: {
        ...state.doc,
        layers: {
          ...state.doc.layers,
          [layerId]: { ...state.doc.layers[layerId], pivotX, pivotY },
        },
      },
    })),

  setCanvasSettings: (canvasWidth, canvasHeight, backgroundColor) =>
    set((state) => ({
      doc: { ...state.doc, canvasWidth, canvasHeight, backgroundColor },
    })),
}))
