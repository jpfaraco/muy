import { useCallback, useRef, useState } from 'react'
import { LayersPanel } from './LayersPanel'
import { useInteractionStore } from '../../store/interactionStore'

const MIN_WIDTH = 160
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 256

export function LeftPanel() {
  const releaseAllLayers = useInteractionStore((s) => s.releaseAllLayers)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragStartX = useRef<number | null>(null)
  const dragStartWidth = useRef<number>(DEFAULT_WIDTH)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartWidth.current = width

    const onPointerMove = (ev: PointerEvent) => {
      if (dragStartX.current === null) return
      const delta = ev.clientX - dragStartX.current
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta))
      setWidth(next)
    }

    const onPointerUp = () => {
      dragStartX.current = null
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }, [width])

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      style={{ width }}
    >
      <div className="flex flex-1 flex-col overflow-hidden" onPointerDown={() => releaseAllLayers()}>
        <LayersPanel />
      </div>

      <div
        className="absolute -right-[5px] top-1/2 z-10 h-20 w-2 -translate-y-1/2 cursor-col-resize overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar"
        onPointerDown={onPointerDown}
      >
        <div className="absolute bottom-0.5 left-1/2 top-0.5 w-0.5 -translate-x-1/2 rounded-full bg-muted-foreground" />
      </div>
    </aside>
  )
}
