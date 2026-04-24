import { useEffect } from 'react'
import { useAnimationStore } from '../store/animationStore'

export function useUndoRedo() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z') return
      const { undo, redo } = useAnimationStore.temporal.getState()
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
