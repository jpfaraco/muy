import { useState, useRef, useEffect, useCallback } from 'react'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8

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
  containerRef: React.RefObject<HTMLDivElement>
  setZoomPreset: (zoom: number) => void
  fit: () => void
}

export function useCanvasTransform(canvasWidth: number, canvasHeight: number): CanvasTransform {
  const [transform, setTransform] = useState<Transform>({ zoom: 1, panX: 0, panY: 0 })
  const transformRef = useRef(transform)
  transformRef.current = transform
  const containerRef = useRef<HTMLDivElement>(null)

  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<GestureState | null>(null)
  const hasFittedRef = useRef(false)

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
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor))
      const r = newZoom / zoom
      const next = {
        zoom: newZoom,
        panX: cx * (1 - r) + panX * r,
        panY: cy * (1 - r) + panY * r,
      }
      transformRef.current = next
      setTransform(next)
    } else {
      const next = { zoom, panX: panX - e.deltaX, panY: panY - e.deltaY }
      transformRef.current = next
      setTransform(next)
    }
  }, [])

  const handlePointerDown = useCallback((e: PointerEvent) => {
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
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent) => {
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
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom * scaleRatio))
    const r = newZoom / startZoom

    const newPanX = startPanX * r + (midX - startMidX)
    const newPanY = startPanY * r + (midY - startMidY)

    const next = { zoom: newZoom, panX: newPanX, panY: newPanY }
    transformRef.current = next
    setTransform(next)
  }, [])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) gestureRef.current = null
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('pointerdown', handlePointerDown, { capture: true })
    el.addEventListener('pointermove', handlePointerMove, { capture: true })
    el.addEventListener('pointerup', handlePointerUp, { capture: true })
    el.addEventListener('pointercancel', handlePointerUp, { capture: true })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      el.removeEventListener('pointermove', handlePointerMove, { capture: true })
      el.removeEventListener('pointerup', handlePointerUp, { capture: true })
      el.removeEventListener('pointercancel', handlePointerUp, { capture: true })
    }
  }, [handleWheel, handlePointerDown, handlePointerMove, handlePointerUp])

  const setZoomPreset = useCallback((zoom: number) => {
    const next = { zoom, panX: 0, panY: 0 }
    transformRef.current = next
    setTransform(next)
  }, [])

  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const padding = 48
    const fitZoom = Math.min(
      (el.clientWidth - padding) / canvasWidth,
      (el.clientHeight - padding) / canvasHeight,
      MAX_ZOOM,
    )
    const next = { zoom: Math.max(MIN_ZOOM, fitZoom), panX: 0, panY: 0 }
    transformRef.current = next
    setTransform(next)
  }, [canvasWidth, canvasHeight])

  // Initialize to fit zoom on first mount
  useEffect(() => {
    if (!hasFittedRef.current) {
      hasFittedRef.current = true
      fit()
    }
  }, [fit])

  return { ...transform, containerRef, setZoomPreset, fit }
}
