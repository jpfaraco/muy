import { useState } from 'react'
import { ChevronDown, Circle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { CanvasSettingsDialog } from './CanvasSettingsDialog'
import { cn } from '@/lib/utils'

type MenuItem = { label: string; onClick?: () => void } | { separator: true }

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
            <DropdownMenuItem key={item.label} onSelect={item.onClick}>
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
        { label: 'Undo' },
        { label: 'Redo' },
        { separator: true },
        { label: 'Select all' },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom in' },
        { label: 'Zoom out' },
        { label: 'Fit to screen' },
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
            <Circle className="h-5 w-5 text-foreground" strokeWidth={1.5} />
          </div>
          <nav className="flex items-center">
            {menus.map((m) => (
              <MenuButton key={m.label} {...m} />
            ))}
          </nav>
        </div>

        {/* Right: avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
          CN
        </div>
      </header>

      <CanvasSettingsDialog open={canvasSettingsOpen} onOpenChange={setCanvasSettingsOpen} />
    </>
  )
}
