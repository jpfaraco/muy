import { ImageUp, ImageOff } from 'lucide-react'
import { useDragDrop } from '../hooks/useDragDrop'

export function DragDropOverlay() {
  const { isDragging, hasValidFiles } = useDragDrop()

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center',
        'pointer-events-none transition-opacity duration-150',
        isDragging ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative flex flex-col items-center gap-3 text-white select-none">
        {hasValidFiles ? (
          <>
            <ImageUp className="h-16 w-16 opacity-90" strokeWidth={1.25} />
            <span className="text-2xl font-medium tracking-wide">Drop to import</span>
          </>
        ) : (
          <>
            <ImageOff className="h-16 w-16 opacity-90" strokeWidth={1.25} />
            <span className="text-2xl font-medium tracking-wide">No supported images</span>
          </>
        )}
      </div>
    </div>
  )
}
