import { useState } from 'react'
import { ChevronDown, MoveHorizontal, MoveVertical, RotateCw, Scaling, Blend } from 'lucide-react'
import { PropertyButton } from './PropertyButton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PropertyKey } from '../../types/animation'

const PROPERTIES: Array<{ key: PropertyKey; label: string; icon: React.ElementType }> = [
  { key: 'x',            label: 'X position',   icon: MoveHorizontal },
  { key: 'y',            label: 'Y position',   icon: MoveVertical },
  { key: 'rotation',     label: 'Rotation',     icon: RotateCw },
  { key: 'scale',        label: 'Scale',        icon: Scaling },
  { key: 'transparency', label: 'Transparency', icon: Blend },
]

export function PropertiesPanel() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div data-properties-panel="true" className="flex flex-col">
      {/* Panel header */}
      <div className="flex h-10 items-center gap-2 pl-3 pr-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 text-muted-foreground"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand properties' : 'Collapse properties'}
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-150', collapsed && '-rotate-90')}
          />
        </Button>
        <span className="flex-1 truncate text-sm font-semibold text-foreground">Properties</span>
      </div>

      {!collapsed && (
        <div className="pb-[max(16px,env(safe-area-inset-bottom))]">
          {PROPERTIES.map((p) => (
            <PropertyButton key={p.key} property={p.key} label={p.label} icon={p.icon} />
          ))}
        </div>
      )}
    </div>
  )
}
