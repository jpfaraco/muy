import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../assets/sample/sampleScene'
import type { PropertyKey } from '../../types/animation'
import type { Vec2 } from '../../types/interaction'

const WIDGET_LAYER_SELECTOR = '[data-widget-layer-root="true"]'
const PROPERTIES_PANEL_SELECTOR = '[data-properties-panel="true"]'

export interface SliderSpec {
  min: number
  max: number
  format: (value: number) => string
}

export function getWidgetLayerElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(WIDGET_LAYER_SELECTOR)
}

export function clientToWidgetLayerPosition(clientX: number, clientY: number): Vec2 {
  const layer = getWidgetLayerElement()
  if (!layer) return { x: clientX, y: clientY }

  const rect = layer.getBoundingClientRect()
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

export function getCanvasCenter(): Vec2 {
  const layer = getWidgetLayerElement()
  if (!layer) return { x: 300, y: 200 }
  const rect = layer.getBoundingClientRect()
  return { x: rect.width / 2, y: rect.height / 2 }
}

export function isPointInsidePropertiesPanel(clientX: number, clientY: number): boolean {
  const panel = document.querySelector<HTMLElement>(PROPERTIES_PANEL_SELECTOR)
  if (!panel) return false

  const rect = panel.getBoundingClientRect()
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}

export function denormalize(progress: number, min: number, max: number): number {
  return min + clamp(progress, 0, 1) * (max - min)
}

export function getSliderSpec(property: PropertyKey): SliderSpec {
  switch (property) {
    case 'x':
      return {
        min: 0,
        max: CANVAS_WIDTH,
        format: (value) => `${Math.round(value)} px`,
      }
    case 'y':
      return {
        min: 0,
        max: CANVAS_HEIGHT,
        format: (value) => `${Math.round(value)} px`,
      }
    case 'scale':
      return {
        min: 0.2,
        max: 3,
        format: (value) => `${value.toFixed(2)}x`,
      }
    case 'transparency':
      return {
        min: 0,
        max: 1,
        format: (value) => `${Math.round(value * 100)}%`,
      }
    default:
      return {
        min: -180,
        max: 180,
        format: (value) => `${Math.round(value)}`,
      }
  }
}
