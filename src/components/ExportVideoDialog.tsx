import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnimationStore } from '../store/animationStore'
import { exportVideo, type VideoFormat } from '../export/exportVideo'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Phase = 'settings' | 'exporting' | 'done' | 'error'
type QualityPreset = 'low' | 'medium' | 'high' | 'custom'

const BITRATES: Record<Exclude<QualityPreset, 'custom'>, number> = {
  low: 2_000_000,
  medium: 8_000_000,
  high: 20_000_000,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function triggerDownload(blob: Blob, format: VideoFormat): void {
  const ext = format === 'mp4' ? 'mp4' : 'webm'
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `muy-${ts}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportVideoDialog({ open, onOpenChange }: Props) {
  const doc = useAnimationStore((s) => s.doc)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)

  const [format, setFormat] = useState<VideoFormat>('mp4')
  const [quality, setQuality] = useState<QualityPreset>('medium')
  const [customMbps, setCustomMbps] = useState('8')
  const [phase, setPhase] = useState<Phase>('settings')
  const [progress, setProgress] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const abortRef = useRef<AbortController | null>(null)

  const getBitrate = useCallback((): number => {
    if (quality === 'custom') {
      const mbps = parseFloat(customMbps)
      return isNaN(mbps) || mbps <= 0 ? 8_000_000 : mbps * 1_000_000
    }
    return BITRATES[quality]
  }, [quality, customMbps])

  const handleExport = useCallback(async () => {
    setIsPlaying(false)
    setPhase('exporting')
    setProgress(0)
    setCurrentFrame(0)
    setBlob(null)
    setErrorMsg('')

    const controller = new AbortController()
    abortRef.current = controller

    const { doc: currentDoc, drawStrokes, getLayerPropsAtFrame } = useAnimationStore.getState()

    try {
      const result = await exportVideo({
        doc: currentDoc,
        drawStrokes,
        getLayerPropsAtFrame,
        format,
        bitrate: getBitrate(),
        onProgress: (p, frame) => {
          setProgress(p)
          setCurrentFrame(frame)
        },
        signal: controller.signal,
      })
      setBlob(result)
      setPhase('done')
      triggerDownload(result, format)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setPhase('settings')
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred')
        setPhase('error')
      }
    } finally {
      abortRef.current = null
    }
  }, [format, getBitrate, setIsPlaying])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (phase === 'exporting') return
    if (!nextOpen) {
      setPhase('settings')
      setProgress(0)
      setCurrentFrame(0)
      setBlob(null)
      setErrorMsg('')
    }
    onOpenChange(nextOpen)
  }, [phase, onOpenChange])

  const handleDownloadAgain = useCallback(() => {
    if (blob) triggerDownload(blob, format)
  }, [blob, format])

  const durationSec = (doc.frameCount / doc.fps).toFixed(1)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">

        {phase === 'settings' && (
          <>
            <DialogHeader>
              <DialogTitle>Export video</DialogTitle>
              <DialogDescription className="text-xs">
                {doc.canvasWidth}×{doc.canvasHeight} · {doc.frameCount} frames · {doc.fps} fps · {durationSec}s
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Format</p>
                <Tabs value={format} onValueChange={(v) => setFormat(v as VideoFormat)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="mp4" className="flex-1">MP4 (H.264)</TabsTrigger>
                    <TabsTrigger value="webm" className="flex-1">WebM (VP9)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium">Quality</p>
                <Tabs value={quality} onValueChange={(v) => setQuality(v as QualityPreset)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="low" className="flex-1">Low</TabsTrigger>
                    <TabsTrigger value="medium" className="flex-1">Medium</TabsTrigger>
                    <TabsTrigger value="high" className="flex-1">High</TabsTrigger>
                    <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
                  </TabsList>
                </Tabs>
                {quality === 'custom' && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      min="0.1"
                      max="200"
                      step="0.5"
                      value={customMbps}
                      onChange={(e) => setCustomMbps(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">Mbps</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleExport} className="w-full">
                Export
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === 'exporting' && (
          <>
            <DialogHeader>
              <DialogTitle>Exporting…</DialogTitle>
              <DialogDescription className="text-xs">
                Frame {currentFrame} of {doc.frameCount}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-100"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-right text-xs text-muted-foreground">
                {Math.round(progress * 100)}%
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>Export complete</DialogTitle>
              <DialogDescription className="text-xs">
                {blob ? formatBytes(blob.size) : ''} · {format.toUpperCase()}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button variant="outline" onClick={handleDownloadAgain} className="w-full">
                Download again
              </Button>
              <Button onClick={() => handleOpenChange(false)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle>Export failed</DialogTitle>
              <DialogDescription className="text-xs text-destructive">
                {errorMsg || 'An error occurred during export.'}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPhase('settings')} className="w-full">
                Try again
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
