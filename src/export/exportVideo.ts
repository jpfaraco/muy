import { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource } from 'mediabunny'
import type { AnimationDoc, LayerProps, Stroke } from '../types/animation'
import { renderFrameToCanvas } from './renderFrameToCanvas'

export type VideoFormat = 'mp4' | 'webm'

export interface ExportOptions {
  doc: AnimationDoc
  drawStrokes: Record<string, Stroke[]>
  getLayerPropsAtFrame: (layerId: string, frame: number) => LayerProps
  format: VideoFormat
  bitrate: number
  onProgress: (progress: number, frame: number) => void
  signal: AbortSignal
}

export async function exportVideo({
  doc,
  drawStrokes,
  getLayerPropsAtFrame,
  format,
  bitrate,
  onProgress,
  signal,
}: ExportOptions): Promise<Blob> {
  const { fps, frameCount } = doc

  // AVC/H.264 requires even dimensions; round up by 1 if odd
  const w = doc.canvasWidth % 2 === 0 ? doc.canvasWidth : doc.canvasWidth + 1
  const h = doc.canvasHeight % 2 === 0 ? doc.canvasHeight : doc.canvasHeight + 1

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas 2D context')

  const target = new BufferTarget()
  const outputFormat =
    format === 'mp4'
      ? new Mp4OutputFormat({ fastStart: 'in-memory' })
      : new WebMOutputFormat()

  const output = new Output({ target, format: outputFormat })
  const codec = format === 'mp4' ? 'avc' : 'vp9'
  const videoSource = new CanvasSource(canvas, {
    codec,
    bitrate,
    alpha: 'discard',
    keyFrameInterval: fps * 2,
  })
  output.addVideoTrack(videoSource, { frameRate: fps })

  await output.start()

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError')

      await renderFrameToCanvas(ctx, doc, drawStrokes, frame, getLayerPropsAtFrame)
      await videoSource.add(frame / fps, 1 / fps)
      onProgress((frame + 1) / frameCount, frame + 1)

      // Yield to event loop every 8 frames to keep UI responsive
      if (frame % 8 === 0) await new Promise<void>((r) => setTimeout(r, 0))
    }
  } finally {
    videoSource.close()
  }

  await output.finalize()

  if (!target.buffer) throw new Error('Export produced no output')
  const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm'
  return new Blob([target.buffer], { type: mimeType })
}
