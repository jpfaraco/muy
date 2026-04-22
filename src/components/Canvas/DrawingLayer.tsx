import { useState, useEffect, useCallback, useRef } from 'react'
import { useAnimationStore, getFlatRenderIds } from '../../store/animationStore'
import { useInteractionStore } from '../../store/interactionStore'
import { DEFAULT_LAYER_PROPS } from '../../types/animation'
import type { Point, CubicSegment, Stroke } from '../../types/animation'
import { fitStroke } from '../../utils/strokeFitting'
import { trimStrokes } from '../../utils/strokeTrim'

// ---------------------------------------------------------------------------
// Image cache (shared with module scope so it survives re-renders)
// ---------------------------------------------------------------------------

const imageCache = new Map<string, HTMLImageElement>()

function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url)!)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { imageCache.set(url, img); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

// With pivot, the transform is: translate(lx+pivX, ly+pivY) rotate(r) scale(s) translate(-pivX, -pivY)
// Inverse: subtract (lx+pivX, ly+pivY), un-rotate, un-scale, add back (pivX, pivY)
function canvasToLayerLocal(
  cx: number,
  cy: number,
  lx: number,
  ly: number,
  rotationDeg: number,
  scale: number,
  pivotX = 0,
  pivotY = 0,
): Point {
  const tx = cx - (lx + pivotX)
  const ty = cy - (ly + pivotY)
  const rad = -(rotationDeg * Math.PI) / 180
  const rx = tx * Math.cos(rad) - ty * Math.sin(rad)
  const ry = tx * Math.sin(rad) + ty * Math.cos(rad)
  return { x: rx / scale + pivotX, y: ry / scale + pivotY }
}

function strokeToPath(stroke: Stroke): string {
  const { origin, segments } = stroke
  if (segments.length === 0) return ''
  const parts = [`M ${origin.x} ${origin.y}`]
  for (const s of segments) {
    parts.push(`C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.end.x} ${s.end.y}`)
  }
  return parts.join(' ')
}

function rawPointsToPath(points: Point[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  if (rest.length === 0) {
    return `M ${first.x - 0.5} ${first.y} L ${first.x + 0.5} ${first.y}`
  }
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(' ')
}

// ---------------------------------------------------------------------------
// Destructive eraser — segment-level, never re-fits unaffected bezier segments
// ---------------------------------------------------------------------------

function distToSegmentSq(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const ex = p.x - a.x; const ey = p.y - a.y
    return ex * ex + ey * ey
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  const cx = a.x + t * dx; const cy = a.y + t * dy
  const ex = p.x - cx; const ey = p.y - cy
  return ex * ex + ey * ey
}

const ERASE_SEGMENT_SAMPLES = 16

/** Returns true if any sampled point on the bezier segment lies within radiusSq of erase line (segA→segB). */
function isSegmentHit(
  anchor: Point,
  seg: CubicSegment,
  segA: Point,
  segB: Point,
  radiusSq: number,
): boolean {
  for (let i = 0; i <= ERASE_SEGMENT_SAMPLES; i++) {
    const t = i / ERASE_SEGMENT_SAMPLES
    const mt = 1 - t
    const x = mt*mt*mt*anchor.x + 3*mt*mt*t*seg.c1.x + 3*mt*t*t*seg.c2.x + t*t*t*seg.end.x
    const y = mt*mt*mt*anchor.y + 3*mt*mt*t*seg.c1.y + 3*mt*t*t*seg.c2.y + t*t*t*seg.end.y
    if (distToSegmentSq({ x, y }, segA, segB) <= radiusSq) return true
  }
  return false
}

/**
 * Erases by discarding hit bezier segments and splitting strokes at the gaps.
 * Unaffected segments are returned as-is — no refitting, no distortion.
 */
function eraseFromStrokes(
  strokes: Stroke[],
  segA: Point,
  segB: Point,
  radius: number,
): Stroke[] {
  const result: Stroke[] = []
  const radiusSq = radius * radius

  for (const stroke of strokes) {
    // Single-dot stroke
    if (stroke.segments.length === 0) {
      if (distToSegmentSq(stroke.origin, segA, segB) > radiusSq) result.push(stroke)
      continue
    }

    let runOrigin: Point | null = null
    let runSegments: CubicSegment[] = []
    let prevAnchor = stroke.origin

    for (const seg of stroke.segments) {
      if (isSegmentHit(prevAnchor, seg, segA, segB, radiusSq)) {
        if (runOrigin !== null && runSegments.length > 0) {
          result.push({ ...stroke, origin: runOrigin, segments: runSegments })
        }
        runOrigin = null
        runSegments = []
      } else {
        if (runOrigin === null) runOrigin = prevAnchor
        runSegments.push(seg)
      }
      prevAnchor = seg.end
    }

    if (runOrigin !== null && runSegments.length > 0) {
      result.push({ ...stroke, origin: runOrigin, segments: runSegments })
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Stroke rendering
// ---------------------------------------------------------------------------

function StrokeRenderer({ stroke }: { stroke: Stroke }) {
  const { origin, segments, color, width } = stroke

  // Single-point tap
  if (segments.length === 0) {
    return <circle cx={origin.x} cy={origin.y} r={width / 2} fill={color} />
  }

  return (
    <path
      d={strokeToPath(stroke)}
      stroke={color}
      strokeWidth={width}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

// Live preview during drag — raw polyline, zero fitting latency
function LivePreview({ points, color, width }: { points: Point[]; color: string; width: number }) {
  if (points.length === 0) return null
  if (points.length === 1) {
    return <circle cx={points[0].x} cy={points[0].y} r={width / 2} fill={color} />
  }
  return (
    <path
      d={rawPointsToPath(points)}
      stroke={color}
      strokeWidth={width}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

// ---------------------------------------------------------------------------
// Move-tool drag state
// ---------------------------------------------------------------------------

interface MoveDrag {
  startCanvasX: number
  startCanvasY: number
  layerStartPositions: Record<string, { x: number; y: number }>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DrawingLayer() {
  const mode = useInteractionStore((s) => s.mode)
  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds)
  const holdLayer = useInteractionStore((s) => s.holdLayer)
  const drawTool = useInteractionStore((s) => s.drawTool)
  const drawColor = useInteractionStore((s) => s.drawColor)
  const drawWidth = useInteractionStore((s) => s.drawWidth)
  const liveLayerProps = useInteractionStore((s) => s.liveLayerProps)
  const setLiveLayerProps = useInteractionStore((s) => s.setLiveLayerProps)
  const clearLiveLayerProps = useInteractionStore((s) => s.clearLiveLayerProps)
  const getEffectiveHeldLayers = useInteractionStore((s) => s.getEffectiveHeldLayers)
  const canvasDragActive = useInteractionStore((s) => s.canvasDragActive)
  const setCanvasDragActive = useInteractionStore((s) => s.setCanvasDragActive)
  const layerListEntries = useInteractionStore((s) => s.layerListEntries)

  const canvasWidth = useAnimationStore((s) => s.doc.canvasWidth)
  const canvasHeight = useAnimationStore((s) => s.doc.canvasHeight)
  const backgroundColor = useAnimationStore((s) => s.doc.backgroundColor)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const setLayerPivot = useAnimationStore((s) => s.setLayerPivot)
  const drawStrokes = useAnimationStore((s) => s.drawStrokes)
  const addStroke = useAnimationStore((s) => s.addStroke)
  const replaceLayerStrokes = useAnimationStore((s) => s.replaceLayerStrokes)
  const writeFrameValues = useAnimationStore((s) => s.writeFrameValues)
  const writeFrameValuesRange = useAnimationStore((s) => s.writeFrameValuesRange)
  const createVectorLayer = useAnimationStore((s) => s.createVectorLayer)
  const layers = useAnimationStore((s) => s.doc.layers)
  const doc = useAnimationStore((s) => s.doc)
  const layerIds = getFlatRenderIds(doc)
  const currentFrame = useAnimationStore((s) => s.currentFrame)
  const getLayerPropsAtFrame = useAnimationStore((s) => s.getLayerPropsAtFrame)

  const svgRef = useRef<SVGSVGElement>(null)
  // Raw points collected during drag — fitted to bezier on pointer up
  const [livePoints, setLivePoints] = useState<Point[]>([])
  const liveColorRef = useRef(drawColor)
  const liveWidthRef = useRef(drawWidth)
  const targetLayerIdRef = useRef<string | null>(null)
  const moveDragRef = useRef<MoveDrag | null>(null)
  const isErasingRef = useRef(false)
  const prevEraserCanvasPosRef = useRef<Point | null>(null)

  // Eraser cursor position in canvas units (for the circle overlay)
  const [eraserPos, setEraserPos] = useState<Point | null>(null)

  // Image preloading
  const [imageLoadVersion, setImageLoadVersion] = useState(0)
  useEffect(() => {
    const urls = Object.values(doc.imageAssets).flatMap((a) => a.urls)
    let mounted = true
    Promise.all(urls.map((url) => loadImage(url).catch(() => {}))).then(() => {
      if (mounted) setImageLoadVersion((v) => v + 1)
    })
    return () => { mounted = false }
  }, [doc.imageAssets])

  // Animate-mode image layer drag state
  const animateDragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false, lastX: 0, lastY: 0,
  })
  const prevWrittenFrameRef = useRef<number>(-1)
  const livePositionsRef = useRef<Record<string, { x: number; y: number }>>({})

  // Gap-fill for frames skipped while holding steady during playback (animate mode)
  useEffect(() => {
    if (!canvasDragActive) return
    const entries = Object.entries(livePositionsRef.current)
    if (entries.length === 0) return
    const updates = entries.flatMap(([layerId, position]) => [
      { layerId, property: 'x' as const, value: position.x },
      { layerId, property: 'y' as const, value: position.y },
    ])
    const prev = prevWrittenFrameRef.current
    const to = useAnimationStore.getState().currentFrame
    if (prev < 0) {
      writeFrameValues(to, updates)
    } else if (prev + 1 <= to) {
      writeFrameValuesRange(prev + 1, to, updates)
    }
    prevWrittenFrameRef.current = to
  }, [canvasDragActive, currentFrame, writeFrameValues, writeFrameValuesRange])

  const heldVectorLayerId =
    heldLayerIds.find((id) => {
      const l = layers[id]
      return l?.type === 'layer' && l?.layerType === 'vector'
    }) ?? null

  // Any held layer (image or vector) — used for pivot tool
  const heldPivotLayerId =
    heldLayerIds.find((id) => layers[id]?.type === 'layer') ?? null

  const isActive = mode === 'draw'

  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvasWidth / rect.width),
      y: (clientY - rect.top) * (canvasHeight / rect.height),
    }
  }, [canvasWidth, canvasHeight])

  function getEffectiveProps(layerId: string) {
    const frameProps = getLayerPropsAtFrame(layerId, currentFrame)
    const live = liveLayerProps[layerId] ?? {}
    return { ...frameProps, ...live }
  }

  function layerTransform(layerId: string): string {
    const p = getEffectiveProps(layerId)
    const layer = layers[layerId]
    const pivX = layer?.pivotX ?? 0
    const pivY = layer?.pivotY ?? 0
    return `translate(${p.x + pivX}, ${p.y + pivY}) rotate(${p.rotation}) scale(${p.scale}) translate(${-pivX}, ${-pivY})`
  }

  /** Apply eraser sweep from prevEraserCanvasPosRef → canvasPos against the given layer's strokes. */
  function applyEraser(canvasPos: Point, targetId: string) {
    const props = useAnimationStore.getState().getLayerPropsAtFrame(
      targetId,
      useAnimationStore.getState().currentFrame,
    )
    const effectiveLayer = {
      ...DEFAULT_LAYER_PROPS,
      ...props,
      ...(useInteractionStore.getState().liveLayerProps[targetId] ?? {}),
    }
    const targetLayerDef = useAnimationStore.getState().doc.layers[targetId]
    const pivX = targetLayerDef?.pivotX ?? 0
    const pivY = targetLayerDef?.pivotY ?? 0
    const toLocal = (p: Point) =>
      canvasToLayerLocal(p.x, p.y, effectiveLayer.x, effectiveLayer.y, effectiveLayer.rotation, effectiveLayer.scale, pivX, pivY)

    const localB = toLocal(canvasPos)
    const localA = toLocal(prevEraserCanvasPosRef.current ?? canvasPos)
    prevEraserCanvasPosRef.current = canvasPos

    const radius = (drawWidth / 2) / effectiveLayer.scale
    const existing = useAnimationStore.getState().drawStrokes[targetId] ?? []
    const updated = eraseFromStrokes(existing, localA, localB, radius)
    replaceLayerStrokes(targetId, updated)
  }

  function toLayerLocal(canvasPos: Point, layerId: string): Point {
    const props = useAnimationStore.getState().getLayerPropsAtFrame(
      layerId,
      useAnimationStore.getState().currentFrame,
    )
    const effectiveLayer = {
      ...DEFAULT_LAYER_PROPS,
      ...props,
      ...(useInteractionStore.getState().liveLayerProps[layerId] ?? {}),
    }
    const layerDef = useAnimationStore.getState().doc.layers[layerId]
    return canvasToLayerLocal(
      canvasPos.x,
      canvasPos.y,
      effectiveLayer.x,
      effectiveLayer.y,
      effectiveLayer.rotation,
      effectiveLayer.scale,
      layerDef?.pivotX ?? 0,
      layerDef?.pivotY ?? 0,
    )
  }

  // ── pointer handlers ──────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // ── Animate mode: image layer drag ──
      if (!isActive) {
        const effectiveHeld = getEffectiveHeldLayers()
        if (effectiveHeld.length === 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const pos = toCanvasCoords(e.clientX, e.clientY)
        animateDragRef.current = { active: true, lastX: pos.x, lastY: pos.y }
        const startFrame = useAnimationStore.getState().currentFrame
        prevWrittenFrameRef.current = startFrame
        const snapshot: Record<string, { x: number; y: number }> = {}
        for (const layerId of effectiveHeld) {
          const props = getLayerPropsAtFrame(layerId, startFrame)
          snapshot[layerId] = { x: props.x, y: props.y }
        }
        livePositionsRef.current = snapshot
        setLiveLayerProps(effectiveHeld.map((layerId) => ({ layerId, props: snapshot[layerId] })))
        setCanvasDragActive(true)
        return
      }

      // ── Move tool ──
      if (drawTool === 'move') {
        const freshHeld = useInteractionStore.getState().heldLayerIds
        if (freshHeld.length === 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const canvasPos = toCanvasCoords(e.clientX, e.clientY)
        const layerStartPositions: MoveDrag['layerStartPositions'] = {}
        for (const id of freshHeld) {
          const props = useAnimationStore.getState().getLayerPropsAtFrame(
            id,
            useAnimationStore.getState().currentFrame,
          )
          const full = { ...DEFAULT_LAYER_PROPS, ...props }
          layerStartPositions[id] = { x: full.x, y: full.y }
        }
        moveDragRef.current = {
          startCanvasX: canvasPos.x,
          startCanvasY: canvasPos.y,
          layerStartPositions,
        }
        return
      }

      // ── Eraser ──
      if (drawTool === 'eraser') {
        const freshHeld = useInteractionStore.getState().heldLayerIds
        const freshLayers = useAnimationStore.getState().doc.layers
        const targetId = freshHeld.find((id) => {
          const l = freshLayers[id]
          return l?.type === 'layer' && l?.layerType === 'vector'
        }) ?? null
        if (!targetId) return
        e.currentTarget.setPointerCapture(e.pointerId)
        targetLayerIdRef.current = targetId
        isErasingRef.current = true
        prevEraserCanvasPosRef.current = null
        applyEraser(toCanvasCoords(e.clientX, e.clientY), targetId)
        return
      }

      // ── Pivot ──
      if (drawTool === 'pivot') {
        const freshHeld = useInteractionStore.getState().heldLayerIds
        const freshLayers = useAnimationStore.getState().doc.layers
        const targetId = freshHeld.find((id) => freshLayers[id]?.type === 'layer') ?? null
        if (!targetId) return
        e.currentTarget.setPointerCapture(e.pointerId)
        targetLayerIdRef.current = targetId
        const canvasPos = toCanvasCoords(e.clientX, e.clientY)
        const props = useAnimationStore.getState().getLayerPropsAtFrame(targetId, useAnimationStore.getState().currentFrame)
        const full = { ...DEFAULT_LAYER_PROPS, ...props }
        setLayerPivot(targetId, canvasPos.x - full.x, canvasPos.y - full.y)
        return
      }

      // ── Pencil ──
      e.currentTarget.setPointerCapture(e.pointerId)

      let targetId = heldVectorLayerId
      if (!targetId) {
        const freshLayers = useAnimationStore.getState().doc.layers
        const freshHeld = useInteractionStore.getState().heldLayerIds
        const alreadyHeld = freshHeld.find((id) => {
          const l = freshLayers[id]
          return l?.type === 'layer' && l?.layerType === 'vector'
        }) ?? null
        targetId = alreadyHeld ?? createVectorLayer()
        holdLayer(targetId)
      }
      targetLayerIdRef.current = targetId
      liveColorRef.current = drawColor
      liveWidthRef.current = drawWidth

      const canvasPos = toCanvasCoords(e.clientX, e.clientY)
      const localPt = toLayerLocal(canvasPos, targetId)
      setLivePoints([localPt])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActive, heldVectorLayerId, createVectorLayer, holdLayer, toCanvasCoords, drawTool, drawColor, drawWidth, setLayerPivot, getEffectiveHeldLayers, getLayerPropsAtFrame, setLiveLayerProps, setCanvasDragActive],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // ── Animate mode: image layer drag ──
      if (!isActive && animateDragRef.current.active) {
        const pos = toCanvasCoords(e.clientX, e.clientY)
        const dx = pos.x - animateDragRef.current.lastX
        const dy = pos.y - animateDragRef.current.lastY
        animateDragRef.current.lastX = pos.x
        animateDragRef.current.lastY = pos.y
        const effectiveHeld = getEffectiveHeldLayers()
        if (effectiveHeld.length === 0) return
        const frame = useAnimationStore.getState().currentFrame
        const lastWritten = prevWrittenFrameRef.current
        if (lastWritten >= 0 && lastWritten + 1 < frame) {
          const gapUpdates: Array<{ layerId: string; property: 'x' | 'y'; value: number }> = []
          for (const layerId of effectiveHeld) {
            const live = livePositionsRef.current[layerId] ?? { x: 0, y: 0 }
            gapUpdates.push({ layerId, property: 'x', value: live.x })
            gapUpdates.push({ layerId, property: 'y', value: live.y })
          }
          writeFrameValuesRange(lastWritten + 1, frame - 1, gapUpdates)
        }
        const updates: Array<{ layerId: string; property: 'x' | 'y'; value: number }> = []
        for (const layerId of effectiveHeld) {
          const entry = layerListEntries?.find((e) => e.layerId === layerId)
          const factor = entry ? entry.sensitivity / 100 : 1
          const live = livePositionsRef.current[layerId] ?? { x: 0, y: 0 }
          const nextX = live.x + dx * factor
          const nextY = live.y + dy * factor
          livePositionsRef.current[layerId] = { x: nextX, y: nextY }
          updates.push({ layerId, property: 'x', value: nextX })
          updates.push({ layerId, property: 'y', value: nextY })
        }
        setLiveLayerProps(effectiveHeld.map((layerId) => ({
          layerId,
          props: livePositionsRef.current[layerId] ?? { x: 0, y: 0 },
        })))
        writeFrameValues(frame, updates)
        prevWrittenFrameRef.current = frame
        return
      }

      // Always update eraser cursor position when eraser tool is active
      if (drawTool === 'eraser' && isActive) {
        setEraserPos(toCanvasCoords(e.clientX, e.clientY))
      } else {
        setEraserPos(null)
      }

      // ── Move tool drag ──
      if (drawTool === 'move' && moveDragRef.current) {
        const canvasPos = toCanvasCoords(e.clientX, e.clientY)
        const dx = canvasPos.x - moveDragRef.current.startCanvasX
        const dy = canvasPos.y - moveDragRef.current.startCanvasY
        const updates = Object.entries(moveDragRef.current.layerStartPositions).map(
          ([layerId, start]) => ({
            layerId,
            props: { x: start.x + dx, y: start.y + dy },
          }),
        )
        setLiveLayerProps(updates)
        return
      }

      // ── Eraser drag ──
      if (drawTool === 'eraser' && isErasingRef.current) {
        const targetId = targetLayerIdRef.current
        if (targetId) applyEraser(toCanvasCoords(e.clientX, e.clientY), targetId)
        return
      }

      // ── Pivot drag ──
      if (drawTool === 'pivot' && targetLayerIdRef.current) {
        const targetId = targetLayerIdRef.current
        const canvasPos = toCanvasCoords(e.clientX, e.clientY)
        const props = useAnimationStore.getState().getLayerPropsAtFrame(targetId, useAnimationStore.getState().currentFrame)
        const full = { ...DEFAULT_LAYER_PROPS, ...props }
        setLayerPivot(targetId, canvasPos.x - full.x, canvasPos.y - full.y)
        return
      }

      // ── Pencil drag ──
      if (livePoints.length === 0) return
      const targetId = targetLayerIdRef.current
      if (!targetId) return

      const canvasPos = toCanvasCoords(e.clientX, e.clientY)
      const localPt = toLayerLocal(canvasPos, targetId)
      setLivePoints((prev) => [...prev, localPt])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawTool, isActive, livePoints, toCanvasCoords, setLiveLayerProps, setLayerPivot, getEffectiveHeldLayers, writeFrameValues, writeFrameValuesRange, layerListEntries],
  )

  const handlePointerUp = useCallback(() => {
    // ── Animate mode: end image layer drag ──
    if (animateDragRef.current.active) {
      const activeLayerIds = Object.keys(livePositionsRef.current)
      animateDragRef.current.active = false
      livePositionsRef.current = {}
      prevWrittenFrameRef.current = -1
      if (activeLayerIds.length > 0) {
        clearLiveLayerProps(activeLayerIds, ['x', 'y'])
      }
      setCanvasDragActive(false)
      return
    }

    // ── Commit move ──
    if (moveDragRef.current) {
      const frame = useAnimationStore.getState().currentFrame
      const ids = Object.keys(moveDragRef.current.layerStartPositions)
      const updates: Array<{ layerId: string; property: 'x' | 'y'; value: number }> = []
      for (const layerId of ids) {
        const live = useInteractionStore.getState().liveLayerProps[layerId]
        if (live?.x !== undefined) updates.push({ layerId, property: 'x', value: live.x })
        if (live?.y !== undefined) updates.push({ layerId, property: 'y', value: live.y })
      }
      if (updates.length > 0) writeFrameValues(frame, updates)
      clearLiveLayerProps(ids)
      moveDragRef.current = null
      return
    }

    // ── End erase ──
    if (isErasingRef.current) {
      isErasingRef.current = false
      prevEraserCanvasPosRef.current = null
      targetLayerIdRef.current = null
      return
    }

    // ── Commit pencil stroke ──
    const targetId = targetLayerIdRef.current
    if (livePoints.length > 0 && targetId) {
      const stroke = fitStroke(livePoints, 'pencil', liveColorRef.current, liveWidthRef.current)
      if (stroke) addStroke(targetId, stroke)
    }
    setLivePoints([])
    targetLayerIdRef.current = null
  }, [livePoints, addStroke, writeFrameValues, clearLiveLayerProps, setCanvasDragActive])

  const handlePointerLeave = useCallback(() => {
    if (drawTool === 'eraser') setEraserPos(null)
  }, [drawTool])

  // ── render ────────────────────────────────────────────────────────────────

  const cursor = !isActive
    ? 'default'
    : drawTool === 'move'
      ? 'grab'
      : drawTool === 'eraser'
        ? 'none'
        : 'crosshair'

  // Reference imageLoadVersion so the render re-runs when images finish loading
  void imageLoadVersion

  return (
    <svg
      ref={svgRef}
      width={canvasWidth}
      height={canvasHeight}
      className="block"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      overflow="visible"
      style={{ pointerEvents: 'auto', cursor, touchAction: 'none', transform: 'translateZ(0)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* Canvas background */}
      <rect width={canvasWidth} height={canvasHeight} fill={backgroundColor} />

      {/* All layers in render order (bottom → top).
          key changes each frame during playback to force remount, clearing stale SVG paint in Chrome. */}
      <g key={isPlaying ? `frame-${currentFrame}` : 'static'}>
      {layerIds.map((layerId) => {
        const layer = layers[layerId]
        if (!layer || layer.type !== 'layer') return null

        // ── Image layer ──
        if (layer.imageAssetId) {
          const asset = doc.imageAssets[layer.imageAssetId]
          if (!asset) return null
          const img = imageCache.get(asset.urls[0])
          if (!img) return null
          const p = getEffectiveProps(layerId)
          return (
            <image
              key={layerId}
              href={asset.urls[0]}
              x={-img.naturalWidth / 2}
              y={-img.naturalHeight / 2}
              width={img.naturalWidth}
              height={img.naturalHeight}
              transform={layerTransform(layerId)}
              opacity={Math.max(0, Math.min(1, p.transparency))}
            />
          )
        }

        // ── Vector layer ──
        const committed = drawStrokes[layerId] ?? []
        const isTarget = targetLayerIdRef.current === layerId
        const showLive = isTarget && livePoints.length > 0
        if (committed.length === 0 && !showLive) return null
        const effectiveProps = getEffectiveProps(layerId)
        const progress = effectiveProps.progress ?? 1
        const visible = trimStrokes(committed, progress)
        return (
          <g key={layerId} transform={layerTransform(layerId)} opacity={effectiveProps.transparency ?? 1}>
            {visible.map((stroke, i) => (
              <StrokeRenderer key={i} stroke={stroke} />
            ))}
            {showLive && (
              <LivePreview points={livePoints} color={liveColorRef.current} width={liveWidthRef.current} />
            )}
          </g>
        )
      })}
      </g>

      {/* Eraser cursor ring */}
      {drawTool === 'eraser' && eraserPos && (
        <circle
          cx={eraserPos.x}
          cy={eraserPos.y}
          r={drawWidth / 2}
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Pivot crosshair — shown when pivot tool is active and any layer is held */}
      {drawTool === 'pivot' && heldPivotLayerId && (() => {
        const pivotLayerDef = layers[heldPivotLayerId]
        const p = getEffectiveProps(heldPivotLayerId)
        const cx = p.x + (pivotLayerDef?.pivotX ?? 0)
        const cy = p.y + (pivotLayerDef?.pivotY ?? 0)
        const ARM = 14
        return (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={cx - ARM} y1={cy} x2={cx + ARM} y2={cy} stroke="rgba(0,0,0,0.5)" strokeWidth={3} strokeLinecap="round" />
            <line x1={cx} y1={cy - ARM} x2={cx} y2={cy + ARM} stroke="rgba(0,0,0,0.5)" strokeWidth={3} strokeLinecap="round" />
            <line x1={cx - ARM} y1={cy} x2={cx + ARM} y2={cy} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
            <line x1={cx} y1={cy - ARM} x2={cx} y2={cy + ARM} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={5} fill="none" stroke="#2bbcff" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={2} fill="#2bbcff" />
          </g>
        )
      })()}
    </svg>
  )
}
