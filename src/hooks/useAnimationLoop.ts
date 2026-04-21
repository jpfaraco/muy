import { useEffect, useRef } from 'react'
import { useAnimationStore } from '../store/animationStore'

/**
 * Drives the animation playback via requestAnimationFrame.
 * Advances currentFrame based on fps and elapsed time.
 * Should be mounted once at the root.
 *
 * IMPORTANT: Reads currentFrame directly from the store (getState) rather than
 * from a ref synced via React render. During slow renders (e.g. complex vector
 * scenes), React may not commit for 100ms+, which would stall a ref-based read
 * on an outdated frame value, causing setCurrentFrame to repeatedly advance by
 * the same amount from the same base and effectively freeze playback.
 */
export function useAnimationLoop() {
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const fps = useAnimationStore((s) => s.doc.fps)
  const frameCount = useAnimationStore((s) => s.doc.frameCount)
  const lastTimestampRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    const frameDuration = 1000 / fps

    function tick(timestamp: number) {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
      }

      const elapsed = timestamp - lastTimestampRef.current

      if (elapsed >= frameDuration) {
        const steps = Math.floor(elapsed / frameDuration)
        lastTimestampRef.current = timestamp - (elapsed % frameDuration)

        const store = useAnimationStore.getState()
        const nextFrame = store.currentFrame + steps
        if (nextFrame >= frameCount) {
          store.setCurrentFrame(frameCount - 1)
          store.setIsPlaying(false)
          return
        }
        store.setCurrentFrame(nextFrame)
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isPlaying, fps, frameCount])
}
