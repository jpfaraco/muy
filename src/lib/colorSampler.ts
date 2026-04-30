export type ColorSampleHandler = (hex: string) => void

const START_EVENT = 'muy:start-color-sampling-drag'
const MOVE_EVENT = 'muy:move-color-sampling-drag'
const FINISH_EVENT = 'muy:finish-color-sampling-drag'
const CANCEL_EVENT = 'muy:cancel-color-sampling'

interface StartColorSamplingDetail {
  onSample: ColorSampleHandler
}

interface ColorSamplingPointerDetail {
  clientX: number
  clientY: number
}

export function startCanvasColorSampleDrag(onSample: ColorSampleHandler): void {
  window.dispatchEvent(new CustomEvent<StartColorSamplingDetail>(START_EVENT, { detail: { onSample } }))
}

export function moveCanvasColorSampleDrag(clientX: number, clientY: number): void {
  window.dispatchEvent(new CustomEvent<ColorSamplingPointerDetail>(MOVE_EVENT, { detail: { clientX, clientY } }))
}

export function finishCanvasColorSampleDrag(clientX: number, clientY: number): void {
  window.dispatchEvent(new CustomEvent<ColorSamplingPointerDetail>(FINISH_EVENT, { detail: { clientX, clientY } }))
}

export function cancelCanvasColorSample(): void {
  window.dispatchEvent(new CustomEvent(CANCEL_EVENT))
}

export function subscribeToCanvasColorSampleStart(
  listener: (onSample: ColorSampleHandler) => void,
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<StartColorSamplingDetail>).detail
    if (detail?.onSample) listener(detail.onSample)
  }
  window.addEventListener(START_EVENT, handler)
  return () => window.removeEventListener(START_EVENT, handler)
}

export function subscribeToCanvasColorSampleCancel(listener: () => void): () => void {
  window.addEventListener(CANCEL_EVENT, listener)
  return () => window.removeEventListener(CANCEL_EVENT, listener)
}

export function subscribeToCanvasColorSampleMove(
  listener: (clientX: number, clientY: number) => void,
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ColorSamplingPointerDetail>).detail
    if (detail) listener(detail.clientX, detail.clientY)
  }
  window.addEventListener(MOVE_EVENT, handler)
  return () => window.removeEventListener(MOVE_EVENT, handler)
}

export function subscribeToCanvasColorSampleFinish(
  listener: (clientX: number, clientY: number) => void,
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ColorSamplingPointerDetail>).detail
    if (detail) listener(detail.clientX, detail.clientY)
  }
  window.addEventListener(FINISH_EVENT, handler)
  return () => window.removeEventListener(FINISH_EVENT, handler)
}

export function rgbaToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}
