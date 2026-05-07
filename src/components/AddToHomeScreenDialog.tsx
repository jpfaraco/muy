import { CheckCircle2, Share, Plus, MoreHorizontal, Menu } from 'lucide-react'
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

type Context = 'standalone' | 'ios-safari' | 'ios-chrome' | 'ios-firefox' | 'ios-other' | 'other'

function detectContext(): Context {
  const isStandalone =
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  if (isStandalone) return 'standalone'

  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document)

  if (!isIOS) return 'other'
  if (/CriOS/.test(ua)) return 'ios-chrome'
  if (/FxiOS/.test(ua)) return 'ios-firefox'
  if (/Safari/.test(ua)) return 'ios-safari'
  return 'ios-other'
}

type Step = { icon: React.ElementType; label: React.ReactNode }

const sharedSteps: Step[] = [
  {
    icon: Plus,
    label: <>Tap <strong>Add to Home Screen</strong></>,
  },
  {
    icon: CheckCircle2,
    label: <>Tap <strong>Add</strong> — Muy will appear as an app icon</>,
  },
]

const firstStepByContext: Record<Exclude<Context, 'standalone' | 'other'>, Step> = {
  'ios-safari': {
    icon: Share,
    label: <>Tap the <strong>Share</strong> button (⬆) in the toolbar</>,
  },
  'ios-chrome': {
    icon: MoreHorizontal,
    label: <>Tap the <strong>⋯</strong> button in the address bar</>,
  },
  'ios-firefox': {
    icon: Menu,
    label: <>Tap the <strong>menu</strong> button (☰) in the toolbar</>,
  },
  'ios-other': {
    icon: Share,
    label: <>Tap your browser's <strong>Share</strong> or menu button</>,
  },
}

const descriptionByContext: Record<Context, string> = {
  'standalone': 'Muy is already installed on your home screen.',
  'ios-safari': 'Follow these steps in Safari to install Muy as an app.',
  'ios-chrome': 'Follow these steps in Chrome to install Muy as an app.',
  'ios-firefox': 'Follow these steps in Firefox to install Muy as an app.',
  'ios-other': 'Follow these steps in your browser to install Muy as an app.',
  'other': 'Open muy.video in Safari, Chrome, or Firefox on your iPad or iPhone, then follow these steps.',
}

export function AddToHomeScreenDialog({ open, onOpenChange }: Props) {
  const context = detectContext()

  const steps: Step[] =
    context === 'standalone' || context === 'other'
      ? [firstStepByContext['ios-safari'], ...sharedSteps]
      : [firstStepByContext[context], ...sharedSteps]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to home screen</DialogTitle>
          <DialogDescription>{descriptionByContext[context]}</DialogDescription>
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
