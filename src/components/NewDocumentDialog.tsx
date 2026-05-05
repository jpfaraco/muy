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
import { initialDoc } from '../assets/sample/initialDoc'
import { useInteractionStore } from '../store/interactionStore'
import { useProjectStore } from '../store/projectStore'
import { setLastOpenedProjectId } from '../lib/projectDb'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDocumentDialog({ open, onOpenChange }: Props) {
  const setDoc = useAnimationStore((s) => s.setDoc)
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame)
  const clearHeldLayers = useInteractionStore((s) => s.setHeldLayers)
  const isDirty = useProjectStore((s) => s.isDirty)
  const currentProjectName = useProjectStore((s) => s.currentProjectName)

  const handleConfirm = () => {
    const { setSuspendDirtyTracking, clearProject } = useProjectStore.getState()
    setSuspendDirtyTracking(true)
    try {
      setDoc(initialDoc)
      setCurrentFrame(0)
      useAnimationStore.temporal.getState().clear()
      clearHeldLayers([])
      clearProject()
      setLastOpenedProjectId(null)
    } finally {
      setSuspendDirtyTracking(false)
    }
    onOpenChange(false)
  }

  const hasUnsavedChanges = isDirty && currentProjectName
  const isUntitled = isDirty && !currentProjectName

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            {hasUnsavedChanges
              ? <>
                  <strong>{currentProjectName}</strong> has unsaved changes. Save it first via{' '}
                  <strong>File → Save</strong>, or discard and start fresh.
                </>
              : isUntitled
              ? <>
                  You have unsaved work. Save it first via{' '}
                  <strong>File → Save</strong>, or discard and start fresh.
                </>
              : 'This will close the current project and open a blank canvas.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            {isDirty ? 'Discard and start new' : 'Start new project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
