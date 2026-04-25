import type { PropertyKey } from './animation'

export type WidgetType = 'slider-h' | 'slider-v' | 'rotation'

export interface Vec2 {
  x: number
  y: number
}

export interface FloatingWidget {
  id: string
  type: WidgetType
  property: PropertyKey
  position: Vec2
  /** Pixels-per-second velocity tracked for flick-to-dismiss */
  velocity: Vec2
  isDismissing: boolean
}

export interface LayerListEntry {
  layerId: string
}
