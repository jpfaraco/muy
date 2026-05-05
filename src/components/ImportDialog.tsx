import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'
import { useCanvasViewStore } from '../store/canvasViewStore'
import { useProjectStore } from '../store/projectStore'
import { readMuyFile, MuyFileError } from '../lib/muyFile'
import { setLastOpenedProjectId } from '../lib/projectDb'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setDoc = useAnimationStore((s) => s.setDoc)
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const setHeldLayers = useInteractionStore((s) => s.setHeldLayers)
  const setLayerListEntries = useInteractionStore((s) => s.setLayerListEntries)
  const clearLiveLayerProps = useInteractionStore((s) => s.clearLiveLayerProps)
  const fit = useCanvasViewStore((s) => s.fit)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null)
      setLoading(false)
    }
    onOpenChange(next)
  }

  const handleChooseFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input so the same file can be re-chosen after an error
    e.target.value = ''
    if (!file) return

    setError(null)
    setLoading(true)

    try {
      const muyFile = await readMuyFile(file)
      const { setSuspendDirtyTracking, clearProject } = useProjectStore.getState()

      setSuspendDirtyTracking(true)
      try {
        setDoc(muyFile.doc)
        useAnimationStore.setState({ drawStrokes: muyFile.drawStrokes })
        setCurrentFrame(0)
        setIsPlaying(false)
        useAnimationStore.temporal.getState().clear()
        setHeldLayers([])
        setLayerListEntries(null)
        clearLiveLayerProps(Object.keys(muyFile.doc.layers))
        fit()
        // Imported project is untitled — user must Save to keep it in IDB
        clearProject()
        setLastOpenedProjectId(null)
      } finally {
        setSuspendDirtyTracking(false)
      }

      handleOpenChange(false)
    } catch (err) {
      if (err instanceof MuyFileError) {
        setError(err.message)
      } else {
        setError("Couldn't open this file.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Hidden file input — opened programmatically to avoid native dialog issues on iPad */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".muy,application/json"
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Import project</DialogTitle>
          <DialogDescription>
            Open a <code>.muy</code> file from your device. Your current work will be replaced — save first if needed.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={loading} />}>Cancel</DialogClose>
          <Button onClick={handleChooseFile} disabled={loading}>
            {loading ? 'Opening…' : 'Choose file…'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
