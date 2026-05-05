import type { AnimationDoc, Stroke } from '../types/animation'
import { renderFrameToCanvas } from '../export/renderFrameToCanvas'
import { useAnimationStore } from '../store/animationStore'

// 480×270 gives enough pixels for non-16:9 content (e.g. a 9:16 canvas renders
// at ~150 px wide instead of ~75 px), making text and detail legible.
const THUMB_WIDTH = 480
const THUMB_HEIGHT = 270

/**
 * Generates a 240×135 JPEG thumbnail of the given frame.
 * Returns null on any failure so callers can save with thumbnail: null.
 */
export async function generateThumbnail(
  doc: AnimationDoc,
  drawStrokes: Record<string, Stroke[]>,
  currentFrame: number,
): Promise<string | null> {
  try {
    // Render to a full-resolution offscreen canvas first, then scale down.
    // This avoids transform interference with renderFrameToCanvas's own fillRect calls.
    const offscreen = document.createElement('canvas')
    offscreen.width = doc.canvasWidth
    offscreen.height = doc.canvasHeight
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return null

    const { getLayerPropsAtFrame } = useAnimationStore.getState()
    await renderFrameToCanvas(offCtx, doc, drawStrokes, currentFrame, getLayerPropsAtFrame)

    const thumb = document.createElement('canvas')
    thumb.width = THUMB_WIDTH
    thumb.height = THUMB_HEIGHT
    const thumbCtx = thumb.getContext('2d')
    if (!thumbCtx) return null

    // Scale to fit, preserving aspect ratio, and letterbox with the doc background colour.
    const scale = Math.min(THUMB_WIDTH / doc.canvasWidth, THUMB_HEIGHT / doc.canvasHeight)
    const drawW = doc.canvasWidth * scale
    const drawH = doc.canvasHeight * scale
    const drawX = (THUMB_WIDTH - drawW) / 2
    const drawY = (THUMB_HEIGHT - drawH) / 2

    thumbCtx.imageSmoothingEnabled = true
    thumbCtx.imageSmoothingQuality = 'high'
    thumbCtx.fillStyle = doc.backgroundColor
    thumbCtx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT)
    thumbCtx.drawImage(offscreen, drawX, drawY, drawW, drawH)
    return thumb.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  }
}
