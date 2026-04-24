import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useAnimationStore } from '../../store/animationStore'
import { useInteractionStore } from '../../store/interactionStore'
import { LayerTreeItem } from './LayerTreeItem'
import { Button } from '@/components/ui/button'
import { DEFAULT_LAYER_PROPS } from '../../types/animation'
import type { Layer, ImageAsset } from '../../types/animation'

export function LayersPanel() {
  const doc = useAnimationStore((s) => s.doc)
  const { reorderLayers, setDoc } = useAnimationStore()
  const reorderDrag = useInteractionStore((s) => s.reorderDrag)
  const { updateReorderInsert, endReorder } = useInteractionStore()
  const [insertionLineY, setInsertionLineY] = useState<number | null>(null)
  const [insertionLineLeft, setInsertionLineLeft] = useState(12)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // doc.layerIds is top-level; display reversed so foreground is at the top
  const topLevelIds = doc.layerIds

  const handleImportFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (fileArray.length === 0) return

    const urls = fileArray.map((f) => URL.createObjectURL(f))
    const name = fileArray[0].name.replace(/\.[^.]+$/, '')
    const ts = Date.now()
    const assetId = `asset-import-${ts}`
    const layerId = `layer-import-${ts}`

    const newAsset: ImageAsset = { id: assetId, name, urls }
    const newLayer: Layer = {
      id: layerId,
      name,
      type: 'layer',
      layerType: 'image',
      imageAssetId: assetId,
      parentId: null,
    }

    const baseProps = { ...DEFAULT_LAYER_PROPS, x: 400, y: 250 }
    const { doc: currentDoc } = useAnimationStore.getState()
    const frames = currentDoc.frames.map((fd, i) =>
      i === 0 ? { ...fd, [layerId]: { ...baseProps } } : fd
    )

    setDoc({
      ...currentDoc,
      layerIds: [...currentDoc.layerIds, layerId],
      layers: { ...currentDoc.layers, [layerId]: newLayer },
      imageAssets: { ...currentDoc.imageAssets, [assetId]: newAsset },
      frames,
    })

    e.target.value = ''
  }, [setDoc])

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!reorderDrag || !scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    const containerRect = scrollContainer.getBoundingClientRect()
    const items = Array.from(
      scrollContainer.querySelectorAll<HTMLElement>('[data-layer-item]')
    ).filter((el) => {
      const id = el.dataset.layerId ?? ''
      const parentId = el.dataset.parentId ?? ''
      // Exclude the dragged items themselves and any children of a dragged group
      return !reorderDrag.draggingLayerIds.includes(id) &&
             !reorderDrag.draggingLayerIds.includes(parentId)
    })

    if (items.length === 0) {
      updateReorderInsert(null, null)
      setInsertionLineY(null)
      return
    }

    const pointerY = e.clientY

    // Items are in DOM order = reversed topLevelIds = foreground at top.
    // For the reversed display, pointer between items[i] and items[i+1] means
    // insert before items[i] in layerIds (items[i] is more foreground).
    let insertBefore: string | null = null
    let insertParent: string | null = null
    let lineY = 0
    let lineLeft = 12

    const firstRect = items[0].getBoundingClientRect()
    if (pointerY < firstRect.top + firstRect.height / 2) {
      // Above first item (most foreground) → new top item (end of layerIds)
      insertBefore = null
      insertParent = items[0].dataset.parentId || null
      lineY = firstRect.top - containerRect.top + scrollContainer.scrollTop
      lineLeft = 12 + parseInt(items[0].dataset.depth ?? '0') * 24
    } else {
      let placed = false
      for (let i = 0; i < items.length - 1; i++) {
        const currRect = items[i].getBoundingClientRect()
        const nextRect = items[i + 1].getBoundingClientRect()
        const midpoint = currRect.bottom + (nextRect.top - currRect.bottom) / 2
        if (pointerY < midpoint) {
          const depth = parseInt(items[i].dataset.depth ?? '0')
          if (items[i].dataset.isGroup === 'true') {
            // Pointer is below a group header → drop inside the group at the top
            insertBefore = null
            insertParent = items[i].dataset.layerId ?? null
            lineLeft = 12 + (depth + 1) * 24
          } else {
            // Between items[i] and items[i+1] → insert before items[i] in its container
            insertBefore = items[i].dataset.layerId ?? null
            insertParent = items[i].dataset.parentId || null
            lineLeft = 12 + depth * 24
          }
          lineY = currRect.bottom - containerRect.top + scrollContainer.scrollTop
          placed = true
          break
        }
      }
      if (!placed) {
        // Below last item (most background) → new bottom item
        const lastItem = items[items.length - 1]
        const lastRect = lastItem.getBoundingClientRect()
        const depth = parseInt(lastItem.dataset.depth ?? '0')
        if (lastItem.dataset.isGroup === 'true') {
          // Empty group at the bottom → drop inside it
          insertBefore = null
          insertParent = lastItem.dataset.layerId ?? null
          lineLeft = 12 + (depth + 1) * 24
        } else {
          insertBefore = lastItem.dataset.layerId ?? null
          insertParent = lastItem.dataset.parentId || null
          lineLeft = 12 + depth * 24
        }
        lineY = lastRect.bottom - containerRect.top + scrollContainer.scrollTop
      }
    }

    updateReorderInsert(insertBefore, insertParent)
    setInsertionLineY(lineY)
    setInsertionLineLeft(lineLeft)
  }

  // Document-level pointerup to commit reorder even when finger lifts outside panel.
  // pointercancel cleans up without committing (browser stole the touch).
  const isReordering = reorderDrag !== null
  useEffect(() => {
    if (!isReordering) return
    const commit = () => {
      const { reorderDrag: current } = useInteractionStore.getState()
      if (!current) return
      reorderLayers(current.draggingLayerIds, current.insertBefore, current.insertParent)
      endReorder()
      setInsertionLineY(null)
    }
    const cancel = () => {
      endReorder()
      setInsertionLineY(null)
    }
    document.addEventListener('pointerup', commit)
    document.addEventListener('pointercancel', cancel)
    return () => {
      document.removeEventListener('pointerup', commit)
      document.removeEventListener('pointercancel', cancel)
    }
  }, [isReordering]) // eslint-disable-line

  // Prevent native touch scroll while reordering so pointer events reach our handlers.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el || !isReordering) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    el.addEventListener('touchmove', prevent, { passive: false })
    return () => el.removeEventListener('touchmove', prevent)
  }, [isReordering])

  return (
    <div className="flex flex-col">
      {/* Panel header */}
      <div className="flex h-10 items-center pl-3 pr-2">
        <span className="flex-1 truncate text-sm font-semibold text-foreground">Layers</span>

        <input
          ref={importInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImportFiles}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label="Import image"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => importInputRef.current?.click()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer tree — reversed so foreground is at the top */}
      <div
        ref={scrollContainerRef}
        className="relative overflow-y-auto"
        onPointerMove={handlePointerMove}
      >
        {[...topLevelIds].reverse().map((id) => (
          <LayerTreeItem key={id} layerId={id} depth={0} />
        ))}

        {reorderDrag && insertionLineY !== null && (
          <div
            className="pointer-events-none absolute right-0 h-0.5 rounded-full bg-blue-400"
            style={{ top: insertionLineY, left: insertionLineLeft }}
          />
        )}
      </div>
    </div>
  )
}
