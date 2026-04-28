import type { AnimationDoc, LayerProps, Stroke } from '../types/animation'
import { DEFAULT_LAYER_PROPS } from '../types/animation'
import { getFlatRenderIds } from '../store/animationStore'
import { loadImage } from '../utils/imageLoader'
import { trimStrokes } from '../utils/strokeTrim'
import { visibleText } from '../utils/textReveal'

/**
 * Composites one animation frame onto a Canvas2D context.
 * Matches DrawingLayer SVG rendering exactly: background, image layers, vector layers in render order.
 */
export async function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  doc: AnimationDoc,
  drawStrokes: Record<string, Stroke[]>,
  frame: number,
  getLayerPropsAtFrame: (layerId: string, frame: number) => LayerProps,
): Promise<void> {
  const { backgroundColor, layers, imageAssets } = doc

  // Fill entire canvas (including any even-dimension padding) with background color
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  const layerIds = getFlatRenderIds(doc)

  for (const layerId of layerIds) {
    const layer = layers[layerId]
    if (!layer || layer.type !== 'layer') continue

    const props = { ...DEFAULT_LAYER_PROPS, ...getLayerPropsAtFrame(layerId, frame) }
    const { x, y, rotation, scale, transparency } = props
    const pivX = layer.pivotX ?? 0
    const pivY = layer.pivotY ?? 0

    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, transparency))
    // Mirrors SVG: translate(x+pivX, y+pivY) rotate(r) scale(s) translate(-pivX, -pivY)
    ctx.translate(x + pivX, y + pivY)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale, scale)
    ctx.translate(-pivX, -pivY)

    if (layer.imageAssetId) {
      const asset = imageAssets[layer.imageAssetId]
      if (asset) {
        try {
          const img = await loadImage(asset.urls[0])
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight)
        } catch {
          // skip layers whose images fail to load
        }
      }
    } else if (layer.layerType === 'vector') {
      const committed = drawStrokes[layerId] ?? []
      const visible = trimStrokes(committed, props.progress)
      for (const stroke of visible) {
        drawStroke(ctx, stroke)
      }
    } else if (layer.layerType === 'text' && layer.text) {
      drawText(ctx, layer.text, props.progress)
    }

    ctx.restore()
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: { content: string; fontFamily: string; fontSize: number; color: string; width: number | null },
  progress: number,
): void {
  const displayed = visibleText(text.content, progress)
  if (displayed.length === 0) return
  ctx.font = `${text.fontSize}px "${text.fontFamily}", "Noto Color Emoji", sans-serif`
  ctx.fillStyle = text.color
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const lineHeight = text.fontSize * 1.2
  const lines = wrapText(ctx, displayed, text.width)
  let yOffset = 0
  for (const line of lines) {
    ctx.fillText(line, 0, yOffset)
    yOffset += lineHeight
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number | null,
): string[] {
  const paragraphs = text.split('\n')
  if (maxWidth == null) return paragraphs
  const result: string[] = []
  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      result.push('')
      continue
    }
    const words = paragraph.split(' ')
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        result.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) result.push(currentLine)
  }
  return result
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const { origin, segments, color, width } = stroke

  if (segments.length === 0) {
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, width / 2, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    return
  }

  ctx.beginPath()
  ctx.moveTo(origin.x, origin.y)
  for (const seg of segments) {
    ctx.bezierCurveTo(seg.c1.x, seg.c1.y, seg.c2.x, seg.c2.y, seg.end.x, seg.end.y)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}
