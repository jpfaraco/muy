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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAnimationStore } from '../store/animationStore'
import { useProjectStore } from '../store/projectStore'
import { serializeProject, downloadMuyFile, MuyFileError } from '../lib/muyFile'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({ open, onOpenChange }: Props) {
  const currentProjectName = useProjectStore((s) => s.currentProjectName)
  const defaultFilename = currentProjectName
    ? (currentProjectName.endsWith('.muy') ? currentProjectName : `${currentProjectName}.muy`)
    : 'untitled.muy'

  const [filename, setFilename] = useState(defaultFilename)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const doc = useAnimationStore((s) => s.doc)
  const drawStrokes = useAnimationStore((s) => s.drawStrokes)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Re-sync filename when dialog opens
      const name = currentProjectName
        ? (currentProjectName.endsWith('.muy') ? currentProjectName : `${currentProjectName}.muy`)
        : 'untitled.muy'
      setFilename(name)
      setError(null)
      setExporting(false)
    } else {
      setError(null)
      setExporting(false)
    }
    onOpenChange(next)
  }

  const handleExport = async () => {
    const trimmed = filename.trim() || 'untitled'
    setError(null)
    setExporting(true)

    try {
      const file = await serializeProject(doc, drawStrokes)
      await downloadMuyFile(file, trimmed)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof MuyFileError) {
        setError(err.message)
      } else {
        setError("Couldn't export the file. Please try again.")
      }
    } finally {
      setExporting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !exporting) handleExport()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export project</DialogTitle>
          <DialogDescription>
            Save your project as a <code>.muy</code> file. Image assets are bundled into the file so it can be reopened anywhere.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="export-filename">Filename</Label>
          <Input
            id="export-filename"
            ref={inputRef}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="untitled.muy"
            disabled={exporting}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={exporting} />}>Cancel</DialogClose>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
