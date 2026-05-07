import { useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'
import { DEFAULT_LAYER_PROPS } from '../types/animation'
import type { AnimationDoc, ImageAsset, Layer } from '../types/animation'

type SetDoc = (doc: AnimationDoc) => void

export function importImageFiles(files: File[], setDoc: SetDoc): void {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
  if (imageFiles.length === 0) return

  const ts = Date.now()
  const { doc: currentDoc } = useAnimationStore.getState()

  const newAssets: Record<string, ImageAsset> = {}
  const newLayers: Record<string, Layer> = {}
  const newLayerIds: string[] = []

  imageFiles.forEach((file, i) => {
    const assetId = `asset-import-${ts}-${i}`
    const layerId = `layer-import-${ts}-${i}`
    const name = file.name.replace(/\.[^.]+$/, '')

    newAssets[assetId] = { id: assetId, name, urls: [URL.createObjectURL(file)] }
    newLayers[layerId] = {
      id: layerId,
      name,
      type: 'layer',
      layerType: 'image',
      imageAssetId: assetId,
      parentId: null,
    }
    newLayerIds.push(layerId)
  })

  const baseProps = { ...DEFAULT_LAYER_PROPS, x: 400, y: 250 }
  const frames = currentDoc.frames.map((fd, i) => {
    if (i !== 0) return fd
    const frameUpdate: typeof fd = { ...fd }
    for (const layerId of newLayerIds) {
      frameUpdate[layerId] = { ...baseProps }
    }
    return frameUpdate
  })

  setDoc({
    ...currentDoc,
    layerIds: [...currentDoc.layerIds, ...newLayerIds],
    layers: { ...currentDoc.layers, ...newLayers },
    imageAssets: { ...currentDoc.imageAssets, ...newAssets },
    frames,
  })

  const { setActiveTool, setHeldLayers } = useInteractionStore.getState()
  setActiveTool('select')
  setHeldLayers(newLayerIds)
}
