import { useRef, useEffect, useCallback } from 'react'
import {
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  useCanvasViewStore,
} from '../store/canvasViewStore'
import { useInteractionStore } from '../store/interactionStore'

interface Transform {
  zoom: number
  panX: number
  panY: number
}

interface GestureState {
  startDistance: number
  startZoom: number
  startMidX: number
  startMidY: number
  startPanX: number
  startPanY: number
}

export interface CanvasTransform {
  zoom: number
  panX: number
  panY: number
  containerRef: React.RefObject<HTMLDivElement | null>
  setZoomPreset: (zoom: number) => void
  fit: () => void
}

export function useCanvasTransform(canvasWidth: number, canvasHeight: number): CanvasTransform {
  const zoom = useCanvasViewStore((s) => s.zoom)
  const panX = useCanvasViewStore((s) => s.panX)
  const panY = useCanvasViewStore((s) => s.panY)
  const setTransform = useCanvasViewStore((s) => s.setTransform)
  const setZoomPreset = useCanvasViewStore((s) => s.setZoomPreset)
  const fit = useCanvasViewStore((s) => s.fit)
  const setFitHandler = useCanvasViewStore((s) => s.setFitHandler)
  const transform: Transform = { zoom, panX, panY }
  const transformRef = useRef(transform)
  transformRef.current = transform
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTool = useInteractionStore((s) => s.activeTool)
  const activeToolRef = useRef(activeTool)
  activeToolRef.current = activeTool

  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<GestureState | null>(null)
  const panDragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null)
  const hasFittedRef = useRef(false)

  const shouldIgnorePointer = useCallback((e: PointerEvent) => {
    const target = e.target
    if (!(target instanceof Element)) return false
    return Boolean(target.closest('[data-canvas-gesture-ignore]'))
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = e.clientX - (rect.left + rect.width / 2)
    const cy = e.clientY - (rect.top + rect.height / 2)
    const { zoom, panX, panY } = transformRef.current

    if (e.ctrlKey) {
      const factor = Math.exp(-e.deltaY * 0.01)
      const newZoom = Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, zoom * factor))
      const r = newZoom / zoom
      const next = {
        zoom: newZoom,
        panX: cx * (1 - r) + panX * r,
        panY: cy * (1 - r) + panY * r,
      }
      setTransform(next)
    } else {
      const next = { zoom, panX: panX - e.deltaX, panY: panY - e.deltaY }
      setTransform(next)
    }
  }, [setTransform])

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (shouldIgnorePointer(e)) return
    if (activeToolRef.current === 'hand' && activePointersRef.current.size === 0) {
      e.stopPropagation()
      panDragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY }
      return
    }
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointersRef.current.size === 2) {
      const [p1, p2] = [...activePointersRef.current.values()]
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const { zoom, panX, panY } = transformRef.current
      gestureRef.current = {
        startDistance: dist,
        startZoom: zoom,
        startMidX: (p1.x + p2.x) / 2,
        startMidY: (p1.y + p2.y) / 2,
        startPanX: panX,
        startPanY: panY,
      }
    }
  }, [shouldIgnorePointer])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (panDragRef.current?.pointerId === e.pointerId) {
      e.stopPropagation()
      const { lastX, lastY } = panDragRef.current
      const { panX, panY } = transformRef.current
      setTransform({ ...transformRef.current, panX: panX + e.clientX - lastX, panY: panY + e.clientY - lastY })
      panDragRef.current = { ...panDragRef.current, lastX: e.clientX, lastY: e.clientY }
      return
    }
    if (!activePointersRef.current.has(e.pointerId)) return
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointersRef.current.size < 2 || !gestureRef.current) return

    e.stopPropagation()
    e.preventDefault()

    const [p1, p2] = [...activePointersRef.current.values()]
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2

    const { startDistance, startZoom, startMidX, startMidY, startPanX, startPanY } = gestureRef.current

    const scaleRatio = dist / startDistance
    const newZoom = Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, startZoom * scaleRatio))
    const r = newZoom / startZoom

    const newPanX = startPanX * r + (midX - startMidX)
    const newPanY = startPanY * r + (midY - startMidY)

    const next = { zoom: newZoom, panX: newPanX, panY: newPanY }
    setTransform(next)
  }, [setTransform])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (panDragRef.current?.pointerId === e.pointerId) {
      panDragRef.current = null
      return
    }
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) gestureRef.current = null
  }, [])

  const clearGestureState = useCallback(() => {
    activePointersRef.current.clear()
    gestureRef.current = null
    panDragRef.current = null
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('pointerdown', handlePointerDown, { capture: true })
    el.addEventListener('pointermove', handlePointerMove, { capture: true })
    window.addEventListener('pointerup', handlePointerUp, { capture: true })
    window.addEventListener('pointercancel', handlePointerUp, { capture: true })
    window.addEventListener('blur', clearGestureState)
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      el.removeEventListener('pointermove', handlePointerMove, { capture: true })
      window.removeEventListener('pointerup', handlePointerUp, { capture: true })
      window.removeEventListener('pointercancel', handlePointerUp, { capture: true })
      window.removeEventListener('blur', clearGestureState)
    }
  }, [handleWheel, handlePointerDown, handlePointerMove, handlePointerUp, clearGestureState])

  const fitToViewport = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const padding = 48
    const fitZoom = Math.min(
      (el.clientWidth - padding) / canvasWidth,
      (el.clientHeight - padding) / canvasHeight,
      MAX_CANVAS_ZOOM,
    )
    const next = { zoom: Math.max(MIN_CANVAS_ZOOM, fitZoom), panX: 0, panY: 0 }
    setTransform(next)
  }, [canvasWidth, canvasHeight])

  useEffect(() => {
    setFitHandler(fitToViewport)
    return () => setFitHandler(null)
  }, [fitToViewport, setFitHandler])

  // Initialize to fit zoom on first mount
  useEffect(() => {
    if (!hasFittedRef.current) {
      hasFittedRef.current = true
      fitToViewport()
    }
  }, [fitToViewport])

  return { zoom, panX, panY, containerRef, setZoomPreset, fit }
}
