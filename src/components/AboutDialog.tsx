import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs text-center">
        <DialogHeader className="items-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center">
            <div
              className="h-10 w-10 bg-current"
              style={{
                maskImage: 'url(/logo-icon.svg)',
                WebkitMaskImage: 'url(/logo-icon.svg)',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
          </div>
          <DialogTitle className="text-xl">Muy</DialogTitle>
          <p className="text-xs text-muted-foreground">Version {__APP_VERSION__}</p>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Browser-based animation performance tool.</p>
          <p className="text-xs">Inspired by Bret Victor's unreleased iPad demo.</p>

          <div className="border-t border-border pt-3 space-y-1.5 text-xs">
            <p>Built by <span className="text-foreground font-medium">João Faraco</span></p>
            <a
              href="https://github.com/jpfaraco/muy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              github.com/jpfaraco/muy
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
