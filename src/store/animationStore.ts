import { create, useStore } from 'zustand'
import { temporal } from 'zundo'
import type { TemporalState } from 'zundo'
import type { AnimationDoc, Layer, LayerProps, PropertyKey, Stroke, TextStyle } from '../types/animation'
import { DEFAULT_LAYER_PROPS } from '../types/animation'
import { computeStrokeBounds } from '../utils/strokeBounds'

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
  /** Mark the pivot as user-owned, stopping future auto-center on stroke */
  markPivotUserOwned: (layerId: string) => void
  /** Set the sensitivity multiplier for a layer (rounded to 2 decimals) */
  setLayerSensitivity: (layerId: string, sensitivity: number) => void
  /** Update canvas dimensions and background color */
  setCanvasSettings: (canvasWidth: number, canvasHeight: number, backgroundColor: string) => void
  /** Set the active document palette used by color inputs */
  setPaletteId: (paletteId: number) => void
  /** Resize the timeline; truncates or extends frames immutably and clamps currentFrame */
  setTimelineLength: (frameCount: number) => void
  /** Wrap an ungrouped layer in a new group at the same position */
  groupLayer: (layerId: string) => void
  /** Move a grouped layer out of its group, placing it above the group */
  removeFromGroup: (layerId: string) => void
  /** Expand a group's children into top-level and delete the group */
  ungroupLayers: (groupId: string) => void
  /** Set hidden on a leaf layer, or on all leaf descendants of a group */
  setLayerHidden: (layerId: string, hidden: boolean) => void
  /** Batch-set hidden on multiple leaf layers in a single update */
  setLayersHidden: (leafIds: string[], hidden: boolean) => void
  /** Create a new text layer at (x, y) with optional fixed width and style defaults; returns the new layer ID */
  createTextLayer: (opts: { x: number; y: number; width: number | null; color: string; fontFamily: string; fontSize: number }) => string
  /** Replace the text content for a text layer */
  updateTextContent: (layerId: string, content: string) => void
  /** Merge partial style fields into a text layer's text payload */
  updateTextStyle: (layerId: string, partial: Partial<Pick<TextStyle, 'fontFamily' | 'fontSize' | 'color' | 'width'>>) => void
  /** Center the pivot on the text bounding box if not user-owned */
  centerTextPivot: (layerId: string, width: number, height: number) => void
}

type AnimationStore = AnimationState & AnimationActions

type PartializedAnimationState = Pick<AnimationState, 'doc' | 'drawStrokes'>

function makeEmptyFrames(count: number): AnimationDoc['frames'] {
  return Array.from({ length: count }, () => ({}))
}

export const useAnimationStore = create<AnimationStore>()(
  temporal(
    (set, get) => ({
  doc: {
    fps: 24,
    frameCount: 240,
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#ffffff',
    paletteId: 1,
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
    set((state) => {
      const updatedStrokes = [...(state.drawStrokes[layerId] ?? []), stroke]
      const layer = state.doc.layers[layerId]
      const shouldAutoCenter = layer?.layerType === 'vector' && !layer?.pivotUserOwned
      if (!shouldAutoCenter) {
        return { drawStrokes: { ...state.drawStrokes, [layerId]: updatedStrokes } }
      }
      const bounds = computeStrokeBounds(updatedStrokes)
      if (!bounds) {
        return { drawStrokes: { ...state.drawStrokes, [layerId]: updatedStrokes } }
      }
      const pivotX = (bounds.minX + bounds.maxX) / 2
      const pivotY = (bounds.minY + bounds.maxY) / 2
      return {
        drawStrokes: { ...state.drawStrokes, [layerId]: updatedStrokes },
        doc: {
          ...state.doc,
          layers: {
            ...state.doc.layers,
            [layerId]: { ...layer, pivotX, pivotY },
          },
        },
      }
    }),

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

      // Sort draggingIds to preserve their original relative order within their container.
      // draggingIds arrives in tap order, which may differ from stack order.
      const orderedDraggingIds = [...draggingIds].sort((a, b) => {
        const la = state.doc.layers[a]
        const lb = state.doc.layers[b]
        if (la?.parentId === null && lb?.parentId === null) {
          return state.doc.layerIds.indexOf(a) - state.doc.layerIds.indexOf(b)
        }
        if (la?.parentId !== null && la?.parentId === lb?.parentId) {
          const childIds = state.doc.layers[la.parentId]?.childIds ?? []
          return childIds.indexOf(a) - childIds.indexOf(b)
        }
        return 0
      })

      // Remove each dragging ID from its current container
      for (const id of orderedDraggingIds) {
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
        layerIds = [...layerIds.slice(0, safeIdx), ...orderedDraggingIds, ...layerIds.slice(safeIdx)]
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
              childIds: [...childIds.slice(0, safeIdx), ...orderedDraggingIds, ...childIds.slice(safeIdx)],
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

  markPivotUserOwned: (layerId) =>
    set((state) => {
      const layer = state.doc.layers[layerId]
      if (!layer || layer.pivotUserOwned) return state
      return {
        doc: {
          ...state.doc,
          layers: {
            ...state.doc.layers,
            [layerId]: { ...layer, pivotUserOwned: true },
          },
        },
      }
    }),

  setLayerSensitivity: (layerId, sensitivity) => {
    const rounded = Math.round(sensitivity * 100) / 100
    set((state) => ({
      doc: {
        ...state.doc,
        layers: {
          ...state.doc.layers,
          [layerId]: { ...state.doc.layers[layerId], sensitivity: rounded },
        },
      },
    }))
  },

  setCanvasSettings: (canvasWidth, canvasHeight, backgroundColor) =>
    set((state) => ({
      doc: { ...state.doc, canvasWidth, canvasHeight, backgroundColor },
    })),

  setPaletteId: (paletteId) =>
    set((state) => ({
      doc: { ...state.doc, paletteId },
    })),

  setTimelineLength: (frameCount) =>
    set((state) => {
      const next = Math.max(1, Math.floor(frameCount))
      const oldFrames = state.doc.frames
      let frames: AnimationDoc['frames']
      if (next === oldFrames.length) {
        frames = oldFrames
      } else if (next < oldFrames.length) {
        frames = oldFrames.slice(0, next)
      } else {
        frames = [...oldFrames, ...makeEmptyFrames(next - oldFrames.length)]
      }
      return {
        doc: { ...state.doc, frameCount: next, frames },
        currentFrame: Math.min(state.currentFrame, next - 1),
      }
    }),

  groupLayer: (layerId) =>
    set((state) => {
      const layer = state.doc.layers[layerId]
      if (!layer || layer.type !== 'layer' || layer.parentId !== null) return state

      const existingNums = Object.values(state.doc.layers)
        .filter((l) => l.type === 'group')
        .map((l) => { const m = l.name.match(/^Group (\d+)$/); return m ? parseInt(m[1], 10) : 0 })
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1

      const groupId = `group-${Date.now()}`
      const group: Layer = { id: groupId, name: `Group ${nextNum}`, type: 'group', childIds: [layerId], parentId: null }
      const layerIds = state.doc.layerIds.map((id) => (id === layerId ? groupId : id))
      const layers = { ...state.doc.layers, [groupId]: group, [layerId]: { ...layer, parentId: groupId } }
      return { doc: { ...state.doc, layers, layerIds } }
    }),

  removeFromGroup: (layerId) =>
    set((state) => {
      const layer = state.doc.layers[layerId]
      if (!layer || layer.type !== 'layer' || layer.parentId === null) return state
      const groupId = layer.parentId
      const group = state.doc.layers[groupId]
      if (!group || group.type !== 'group') return state

      const newChildIds = (group.childIds ?? []).filter((id) => id !== layerId)
      const groupIdx = state.doc.layerIds.indexOf(groupId)
      const insertAt = groupIdx === -1 ? state.doc.layerIds.length : groupIdx + 1
      const layerIds = [...state.doc.layerIds.slice(0, insertAt), layerId, ...state.doc.layerIds.slice(insertAt)]
      const layers = { ...state.doc.layers, [layerId]: { ...layer, parentId: null }, [groupId]: { ...group, childIds: newChildIds } }
      return { doc: { ...state.doc, layers, layerIds } }
    }),

  ungroupLayers: (groupId) =>
    set((state) => {
      const group = state.doc.layers[groupId]
      if (!group || group.type !== 'group') return state

      const childIds = group.childIds ?? []
      const groupIdx = state.doc.layerIds.indexOf(groupId)
      const safeIdx = groupIdx === -1 ? state.doc.layerIds.length : groupIdx
      const layerIds = [...state.doc.layerIds.slice(0, safeIdx), ...childIds, ...state.doc.layerIds.slice(safeIdx + 1)]

      const { [groupId]: _removed, ...layersWithoutGroup } = state.doc.layers
      const layers = childIds.reduce<typeof layersWithoutGroup>(
        (acc, id) => acc[id] ? { ...acc, [id]: { ...acc[id], parentId: null } } : acc,
        layersWithoutGroup,
      )
      return { doc: { ...state.doc, layers, layerIds } }
    }),

  setLayersHidden: (leafIds, hidden) =>
    set((state) => {
      const idSet = new Set(leafIds)
      const layers = Object.fromEntries(
        Object.entries(state.doc.layers).map(([id, layer]) =>
          idSet.has(id) ? [id, { ...layer, hidden }] : [id, layer]
        )
      )
      return { doc: { ...state.doc, layers } }
    }),

  setLayerHidden: (layerId, hidden) =>
    set((state) => {
      const layer = state.doc.layers[layerId]
      if (!layer) return state

      const collectLeafIds = (id: string): string[] => {
        const l = state.doc.layers[id]
        if (!l) return []
        if (l.type === 'layer') return [id]
        return (l.childIds ?? []).flatMap(collectLeafIds)
      }

      const idsToUpdate = layer.type === 'group' ? collectLeafIds(layerId) : [layerId]
      const updatedLayers = idsToUpdate.reduce(
        (acc, id) => ({ ...acc, [id]: { ...acc[id], hidden } }),
        state.doc.layers,
      )
      return { doc: { ...state.doc, layers: updatedLayers } }
    }),

  createTextLayer: ({ x, y, width, color, fontFamily, fontSize }) => {
    const id = `txt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const count = Object.keys(get().doc.layers).filter(
      (k) => get().doc.layers[k].layerType === 'text'
    ).length
    const newLayer: Layer = {
      id,
      name: `Text ${count + 1}`,
      type: 'layer',
      layerType: 'text',
      parentId: null,
      text: { content: '', fontFamily, fontSize, color, width },
    }
    set((state) => {
      const frames = state.doc.frames.map((fd, i) => {
        if (i !== 0) return fd
        const existing = fd[id] ?? {}
        return { ...fd, [id]: { ...existing, x, y } }
      })
      return {
        doc: {
          ...state.doc,
          layers: { ...state.doc.layers, [id]: newLayer },
          layerIds: [...state.doc.layerIds, id],
          frames,
        },
      }
    })
    return id
  },

  updateTextContent: (layerId, content) =>
    set((state) => {
      const layer = state.doc.layers[layerId]
      if (!layer?.text) return state
      return {
        doc: {
          ...state.doc,
          layers: {
            ...state.doc.layers,
            [layerId]: { ...layer, text: { ...layer.text, content } },
          },
        },
      }
    }),

  updateTextStyle: (layerId, partial) =>
    set((state) => {
      const layer = state.doc.layers[layerId]
      if (!layer?.text) return state
      return {
        doc: {
          ...state.doc,
          layers: {
            ...state.doc.layers,
            [layerId]: { ...layer, text: { ...layer.text, ...partial } },
          },
        },
      }
    }),

  centerTextPivot: (layerId, width, height) =>
    set((state) => {
      const layer = state.doc.layers[layerId]
      if (!layer || layer.pivotUserOwned) return state
      return {
        doc: {
          ...state.doc,
          layers: {
            ...state.doc.layers,
            [layerId]: { ...layer, pivotX: width / 2, pivotY: height / 2 },
          },
        },
      }
    }),

    }),
    {
      partialize: (state): PartializedAnimationState => ({
        doc: state.doc,
        drawStrokes: state.drawStrokes,
      }),
      limit: 50,
      equality: (a, b) => a.doc === b.doc && a.drawStrokes === b.drawStrokes,
    }
  )
)

export function useAnimationHistory<T>(
  selector: (state: TemporalState<PartializedAnimationState>) => T,
): T {
  return useStore(useAnimationStore.temporal, selector)
}

/**
 * Manually push the current doc+drawStrokes into the undo history.
 * Call this right before starting a multi-step gesture (drag, stroke, erase),
 * then call temporal.getState().pause() to suppress per-frame entries.
 * Call temporal.getState().resume() when the gesture ends.
 */
export function captureHistoryEntry() {
  const { doc, drawStrokes } = useAnimationStore.getState()
  const snapshot: PartializedAnimationState = { doc, drawStrokes }
  const temporal = useAnimationStore.temporal
  temporal.setState({
    pastStates: temporal.getState().pastStates.concat([snapshot]),
    futureStates: [],
  })
}
