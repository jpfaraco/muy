import { SkipBack, Play, Pause, SkipForward } from 'lucide-react'
import { useAnimationStore } from '../../store/animationStore'
import { ThumbnailStrip } from './ThumbnailStrip'

function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = frame / fps
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const frames = frame % fps
  return [
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
    String(frames).padStart(2, '0'),
  ].join(' : ')
}

export function Timeline() {
  const { isPlaying, setIsPlaying, currentFrame } = useAnimationStore()
  const fps = useAnimationStore((s) => s.doc.fps)
  const frameCount = useAnimationStore((s) => s.doc.frameCount)
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame)

  return (
    <div className="flex shrink-0 items-center gap-4 border-t border-border bg-sidebar px-4 pb-6 pt-4">
      <div className="flex shrink-0 items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border p-1.5 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
            aria-label="Skip to start"
            onPointerDown={(e) => { e.stopPropagation(); setCurrentFrame(0) }}
          >
            <SkipBack className="h-full w-full" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border p-2.5 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onPointerDown={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying) }}
          >
            {isPlaying ? <Pause className="h-full w-full" /> : <Play className="h-full w-full" />}
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border p-1.5 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
            aria-label="Skip to end"
            onPointerDown={(e) => { e.stopPropagation(); setCurrentFrame(frameCount - 1) }}
          >
            <SkipForward className="h-full w-full" />
          </button>
        </div>
        <div
          className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground tabular-nums"
          style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
        >
          {formatTimestamp(currentFrame, fps)}
        </div>
      </div>
      <ThumbnailStrip />
    </div>
  )
}
