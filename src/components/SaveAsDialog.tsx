import { useState, useEffect, useRef } from 'react'
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-filled name (e.g. current project name or "untitled") */
  defaultName: string
  /** Called with the name the user confirmed */
  onConfirm: (name: string) => Promise<void>
}

export function SaveAsDialog({ open, onOpenChange, defaultName, onConfirm }: Props) {
  const [name, setName] = useState(defaultName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync name when defaultName changes (e.g. dialog re-opens)
  useEffect(() => {
    if (open) {
      setName(defaultName)
      setError(null)
      setSaving(false)
    }
  }, [open, defaultName])

  // Auto-select the name text when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [open])

  const handleConfirm = async () => {
    const trimmed = name.trim() || 'Untitled'
    setError(null)
    setSaving(true)
    try {
      await onConfirm(trimmed)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) handleConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as…</DialogTitle>
          <DialogDescription>
            Give this project a name. It will be saved locally in this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="save-as-name">Project name</Label>
          <Input
            id="save-as-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Untitled"
            disabled={saving}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={saving} />}>Cancel</DialogClose>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
