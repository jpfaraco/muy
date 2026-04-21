export type PropertyKey = 'x' | 'y' | 'rotation' | 'scale' | 'transparency'

export type LayerType = 'image' | 'vector' | 'text'

export interface Point {
  x: number
  y: number
  /** Normalised pen pressure 0–1. Undefined for finger/mouse input. */
  pressure?: number
}

export interface Stroke {
  tool: 'pencil' | 'eraser'
  color: string
  width: number
  points: Point[]
}

export interface ImageAsset {
  id: string
  name: string
  /** Object URLs or data URLs — one per pose. Single-image assets have length 1. */
  urls: string[]
}

export interface Layer {
  id: string
  name: string
  type: 'layer' | 'group'
  /** Visual type for leaf layers — determines icon and available properties */
  layerType?: LayerType
  /** Reference to ImageAsset — only for leaf layers */
  imageAssetId?: string
  /** Ordered child layer IDs — only for groups */
  childIds?: string[]
  parentId: string | null
  /** Rotation pivot offset in local layer space. Non-animatable. Defaults to (0,0). */
  pivotX?: number
  pivotY?: number
}

/**
 * All renderable properties for a single layer at a single frame.
 * x/y are canvas pixels from top-left.
 * rotation is degrees (0–360).
 * scale is a multiplier (1.0 = 100%).
 * transparency is 0 (invisible) to 1 (fully opaque).
 */
export type LayerProps = Record<PropertyKey, number>

/**
 * Maps layerId → the subset of properties explicitly recorded at this frame.
 * Only properties the user actually animated are stored; getLayerPropsAtFrame
 * reconstructs a complete LayerProps by scanning backward per-property.
 */
export type FrameData = Record<string, Partial<LayerProps>>

export interface AnimationDoc {
  fps: number
  frameCount: number
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  /** Top-level layer IDs in render order (bottom → top). Groups are entries here; their children live in childIds. */
  layerIds: string[]
  layers: Record<string, Layer>
  imageAssets: Record<string, ImageAsset>
  /** Indexed 0 .. frameCount-1 */
  frames: FrameData[]
}

export const DEFAULT_LAYER_PROPS: LayerProps = {
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  transparency: 1,
}
