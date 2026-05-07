import { CheckCircle2, Share, CircleChevronDown, SquarePlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function isStandalone(): boolean {
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

const steps = [
  {
    icon: Share,
    label: <>Tap the <strong>Share</strong> button in the browser toolbar</>,
  },
  {
    icon: CircleChevronDown,
    label: <>Tap <strong>View More</strong></>,
  },
  {
    icon: SquarePlus,
    label: <>Tap <strong>Add to Home Screen</strong></>,
  },
]

export function AddToHomeScreenDialog({ open, onOpenChange }: Props) {
  const installed = isStandalone()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to home screen</DialogTitle>
          <DialogDescription>
            {installed
              ? 'Muy is already installed on your home screen.'
              : 'Follow these steps in your browser to install Muy as an app.'}
          </DialogDescription>
        </DialogHeader>

        {installed ? (
          <div className="flex items-center gap-3 rounded-lg bg-accent px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-foreground" />
            <p className="text-sm text-foreground">Already installed</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {steps.map(({ icon: Icon, label }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground">
                  {i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground mt-px" />
                  <p className="text-sm text-muted-foreground leading-snug">{label}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}
