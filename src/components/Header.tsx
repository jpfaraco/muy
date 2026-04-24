import { useState } from 'react'
import { ChevronDown, CircleHelp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { CanvasSettingsDialog } from './CanvasSettingsDialog'
import { HelpDialog } from './HelpDialog'
import { cn } from '@/lib/utils'
import { CANVAS_ZOOM_STEP, useCanvasViewStore } from '../store/canvasViewStore'
import { getFlatRenderIds, useAnimationHistory, useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'

type MenuItem = { label: string; onClick?: () => void; disabled?: boolean } | { separator: true }

interface MenuDef {
  label: string
  items: MenuItem[]
}

function MenuButton({ label, items }: MenuDef) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-3 text-foreground data-[state=open]:bg-accent"
        >
          {label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item, i) =>
          'separator' in item ? (
            <DropdownMenuSeparator key={i} />
          ) : (
            <DropdownMenuItem key={item.label} onSelect={item.onClick} disabled={item.disabled}>
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const zoomByFactor = useCanvasViewStore((s) => s.zoomByFactor)
  const fit = useCanvasViewStore((s) => s.fit)
  const doc = useAnimationStore((s) => s.doc)
  const setHeldLayers = useInteractionStore((s) => s.setHeldLayers)

  const canUndo = useAnimationHistory((s) => s.pastStates.length > 0)
  const canRedo = useAnimationHistory((s) => s.futureStates.length > 0)

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New' },
        { label: 'Open…' },
        { separator: true },
        { label: 'Canvas settings…', onClick: () => setCanvasSettingsOpen(true) },
        { separator: true },
        { label: 'Export…' },
      ],
    },
    {
      label: 'Edit',
      items: [
        {
          label: 'Undo',
          disabled: !canUndo,
          onClick: () => useAnimationStore.temporal.getState().undo(),
        },
        {
          label: 'Redo',
          disabled: !canRedo,
          onClick: () => useAnimationStore.temporal.getState().redo(),
        },
        { separator: true },
        { label: 'Select all', onClick: () => setHeldLayers(getFlatRenderIds(doc)) },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom in', onClick: () => zoomByFactor(CANVAS_ZOOM_STEP) },
        { label: 'Zoom out', onClick: () => zoomByFactor(1 / CANVAS_ZOOM_STEP) },
        { label: 'Fit to screen', onClick: fit },
      ],
    },
  ]

  return (
    <>
      <header className={cn(
        'flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar pl-3 pr-2',
      )}>
        {/* Left: logo + nav */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <div
              className="h-5 w-5 bg-current"
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
          <nav className="flex items-center">
            {menus.map((m) => (
              <MenuButton key={m.label} {...m} />
            ))}
          </nav>
        </div>

        {/* Right: help */}
        <button
          aria-label="Help"
          onClick={() => setHelpOpen(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </header>

      <CanvasSettingsDialog open={canvasSettingsOpen} onOpenChange={setCanvasSettingsOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
