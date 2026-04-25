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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDocumentDialog({ open, onOpenChange }: Props) {
  const setDoc = useAnimationStore((s) => s.setDoc)
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame)
  const clearHeldLayers = useInteractionStore((s) => s.setHeldLayers)

  const handleConfirm = () => {
    setDoc(initialDoc)
    setCurrentFrame(0)
    useAnimationStore.temporal.getState().clear()
    clearHeldLayers([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>
            This will discard the current project and start fresh. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            Discard and start new
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
