export type PropertyKey = 'x' | 'y' | 'rotation' | 'scale' | 'transparency' | 'progress'

export type LayerType = 'image' | 'vector' | 'text'

export interface Point {
  x: number
  y: number
}

/** One cubic bezier segment: previous anchor → c1 → c2 → end */
export interface CubicSegment {
  c1: Point
  c2: Point
  end: Point
}

export interface Stroke {
  tool: 'pencil' | 'eraser'
  color: string
  width: number
  /** Start anchor of the path */
  origin: Point
  /** Cubic bezier segments following the origin */
  segments: CubicSegment[]
}

export interface ImageAsset {
  id: string
  name: string
  /** Object URLs or data URLs — one per pose. Single-image assets have length 1. */
  urls: string[]
}

export const DEFAULT_LAYER_SENSITIVITY = 1

/** Style and content payload for text layers. */
export interface TextStyle {
  /** Raw string content, may contain '\n' */
  content: string
  /** CSS font-family name from CURATED_FONTS */
  fontFamily: string
  /** Font size in canvas/world-space pixels */
  fontSize: number
  /** CSS hex color string */
  color: string
  /** null = auto-width (no wrap); number = fixed pixel width with wrapping */
  width: number | null
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
  /**
   * True once the user has manually placed the pivot, or animated rotation/scale.
   * While false, addStroke re-centers the pivot automatically after each stroke.
   */
  pivotUserOwned?: boolean
  /** Multiplier applied to all property recording deltas. Default 1. Supports negatives and values > 1. */
  sensitivity?: number
  /** Whether this layer (or all descendants for groups) is hidden from the canvas. */
  hidden?: boolean
  /** Text content and style — only for layerType === 'text' */
  text?: TextStyle
}

/**
 * All renderable properties for a single layer at a single frame.
 * x/y are canvas pixels from top-left.
 * rotation is degrees (0–360).
 * scale is a multiplier (1.0 = 100%).
 * transparency is 0 (invisible) to 1 (fully opaque).
 * progress is 0 (nothing drawn) to 1 (fully drawn) — vector layers only.
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
  paletteId: number
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
  progress: 1,
}
