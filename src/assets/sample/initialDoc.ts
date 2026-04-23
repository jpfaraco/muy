import type { AnimationDoc, FrameData } from '../../types/animation'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './sampleScene'

const FPS = 24
const FRAME_COUNT = 240 // 10 seconds
const frames: FrameData[] = Array.from({ length: FRAME_COUNT }, () => ({}))

export const initialDoc: AnimationDoc = {
  fps: FPS,
  frameCount: FRAME_COUNT,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  backgroundColor: '#ffffff',
  layerIds: [],
  layers: {},
  imageAssets: {},
  frames,
}
