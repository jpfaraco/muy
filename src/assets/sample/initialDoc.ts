import type { AnimationDoc, Layer, FrameData } from '../../types/animation'
import { SAMPLE_IMAGE_ASSETS, CANVAS_WIDTH, CANVAS_HEIGHT } from './sampleScene'

const layers: Record<string, Layer> = {
  'group-scenery': { id: 'group-scenery', name: 'Scenery', type: 'group', childIds: ['layer-bg', 'layer-mid', 'layer-fg'], parentId: null },
  'layer-bg': { id: 'layer-bg', name: 'Background', type: 'layer', layerType: 'image', imageAssetId: 'asset-background', parentId: 'group-scenery' },
  'layer-mid': { id: 'layer-mid', name: 'Midground', type: 'layer', layerType: 'image', imageAssetId: 'asset-midground', parentId: 'group-scenery' },
  'layer-fg': { id: 'layer-fg', name: 'Foreground', type: 'layer', layerType: 'image', imageAssetId: 'asset-foreground', parentId: 'group-scenery' },
  'group-tree': { id: 'group-tree', name: 'Tree', type: 'group', childIds: ['layer-trunk', 'layer-leaf'], parentId: null },
  'layer-trunk': { id: 'layer-trunk', name: 'Trunk', type: 'layer', layerType: 'image', imageAssetId: 'asset-trunk', parentId: 'group-tree' },
  'layer-leaf': { id: 'layer-leaf', name: 'Leaf', type: 'layer', layerType: 'image', imageAssetId: 'asset-leaf', parentId: 'group-tree' },
  'layer-bunny': { id: 'layer-bunny', name: 'Bunny', type: 'layer', layerType: 'image', imageAssetId: 'asset-bunny', parentId: null },
}

// Top-level render order: bottom to top (groups expand via childIds)
const layerIds = ['group-scenery', 'group-tree', 'layer-bunny']

const FPS = 24
const FRAME_COUNT = 240 // 10 seconds

/** Create a frame with sensible starting positions */
function makeBaseFrame(): FrameData {
  return {
    'layer-bg':    { x: CANVAS_WIDTH / 2,    y: CANVAS_HEIGHT / 2,    rotation: 0, scale: 2.4,  transparency: 1 },
    'layer-mid':   { x: CANVAS_WIDTH / 2,    y: CANVAS_HEIGHT * 0.65, rotation: 0, scale: 2.75, transparency: 1 },
    'layer-fg':    { x: CANVAS_WIDTH / 2,    y: CANVAS_HEIGHT * 0.88, rotation: 0, scale: 2.4,  transparency: 1 },
    'layer-trunk': { x: CANVAS_WIDTH * 0.33, y: CANVAS_HEIGHT * 0.5,  rotation: 0, scale: 3.0,  transparency: 1 },
    'layer-leaf':  { x: CANVAS_WIDTH * 0.36, y: CANVAS_HEIGHT * 0.2,  rotation: 0, scale: 2.4,  transparency: 1 },
    'layer-bunny': { x: CANVAS_WIDTH * 0.72, y: CANVAS_HEIGHT * 0.72, rotation: 0, scale: 3.6,  transparency: 1 },
  }
}

const baseFrame = makeBaseFrame()
// Only frame 0 has explicit positions. Carry-forward in getLayerPropsAtFrame
// propagates these values to subsequent frames, matching Flash's keyframe model.
const frames: FrameData[] = Array.from({ length: FRAME_COUNT }, (_, i) =>
  i === 0 ? { ...baseFrame } : {}
)

export const initialDoc: AnimationDoc = {
  fps: FPS,
  frameCount: FRAME_COUNT,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  backgroundColor: '#1a1a2e',
  layerIds,
  layers,
  imageAssets: {
    'asset-background': SAMPLE_IMAGE_ASSETS.background,
    'asset-midground': SAMPLE_IMAGE_ASSETS.midground,
    'asset-foreground': SAMPLE_IMAGE_ASSETS.foreground,
    'asset-trunk': SAMPLE_IMAGE_ASSETS.trunk,
    'asset-leaf': SAMPLE_IMAGE_ASSETS.leaf,
    'asset-bunny': SAMPLE_IMAGE_ASSETS.bunny,
  },
  frames,
}
