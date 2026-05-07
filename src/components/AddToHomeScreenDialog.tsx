import { CheckCircle2, Share, Plus } from 'lucide-react'
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

function detectContext(): 'standalone' | 'ios' | 'other' {
  const isStandalone =
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  if (isStandalone) return 'standalone'

  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document)
  return isIOS ? 'ios' : 'other'
}

const steps = [
  {
    icon: Share,
    label: <>Tap the <strong>Share</strong> button (⬆) in Safari's toolbar</>,
  },
  {
    icon: Plus,
    label: <>Scroll down and tap <strong>Add to Home Screen</strong></>,
  },
  {
    icon: CheckCircle2,
    label: <>Tap <strong>Add</strong> — Muy will appear as an app icon</>,
  },
]

export function AddToHomeScreenDialog({ open, onOpenChange }: Props) {
  const context = detectContext()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to home screen</DialogTitle>
          <DialogDescription>
            {context === 'standalone'
              ? 'Muy is already installed on your home screen.'
              : context === 'ios'
              ? 'Follow these steps in Safari to install Muy as an app.'
              : 'Open muy.video in Safari on your iPad or iPhone, then follow these steps.'}
          </DialogDescription>
        </DialogHeader>

        {context === 'standalone' ? (
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
