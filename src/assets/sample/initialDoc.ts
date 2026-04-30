import type { AnimationDoc, FrameData } from '../../types/animation'

export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

const FPS = 24
const FRAME_COUNT = 240 // 10 seconds
const frames: FrameData[] = Array.from({ length: FRAME_COUNT }, () => ({}))

export const initialDoc: AnimationDoc = {
  fps: FPS,
  frameCount: FRAME_COUNT,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  backgroundColor: '#ffffff',
  paletteId: 1,
  layerIds: [],
  layers: {},
  imageAssets: {},
  frames,
}
