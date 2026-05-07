import { useEffect, useRef, useState } from 'react'
import { useAnimationStore } from '../store/animationStore'
import { importImageFiles } from '../lib/importImages'

export interface DragDropState {
  isDragging: boolean
  hasValidFiles: boolean
}

function hasImageFiles(dt: DataTransfer): boolean {
  if (dt.items.length === 0) return false
  return Array.from(dt.items).some(
    (item) => item.kind === 'file' && (item.type.startsWith('image/') || item.type === '')
  )
}

export function useDragDrop(): DragDropState {
  const [isDragging, setIsDragging] = useState(false)
  const [hasValidFiles, setHasValidFiles] = useState(false)
  const enterCount = useRef(0)

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      enterCount.current += 1
      if (enterCount.current === 1) {
        setHasValidFiles(hasImageFiles(e.dataTransfer))
        setIsDragging(true)
      }
    }

    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      // Keep dropEffect consistent so browsers don't show the "no drop" cursor
      e.dataTransfer.dropEffect = 'copy'
    }

    function onDragLeave(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return
      enterCount.current -= 1
      if (enterCount.current === 0) {
        setIsDragging(false)
        setHasValidFiles(false)
      }
    }

    function onDrop(e: DragEvent) {
      e.preventDefault()
      enterCount.current = 0
      setIsDragging(false)
      setHasValidFiles(false)

      if (!e.dataTransfer) return
      const { setDoc } = useAnimationStore.getState()
      importImageFiles(Array.from(e.dataTransfer.files), setDoc)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return { isDragging, hasValidFiles }
}
