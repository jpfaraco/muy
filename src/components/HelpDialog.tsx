import { useState, useMemo } from 'react'
import {
  MousePointer2, Pencil, Eraser, Crosshair, Film, Layers,
  Command, Search, MoveHorizontal, RotateCcw, Lightbulb,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Section {
  heading?: string
  body?: string
  items?: { icon?: React.ElementType; label: string; detail?: string }[]
  rows?: { keys: string; action: string }[]
}

interface Article {
  id: string
  title: string
  sections: Section[]
}

const articles: Article[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    sections: [
      {
        body: 'Muy is a performance-based animation tool. Instead of setting keyframes manually, you record your movements in real time while the timeline captures every frame.',
      },
      {
        heading: 'Workflow',
        items: [
          { label: 'Build your scene', detail: 'Import image layers via + in the Layers panel, or draw with the Pencil tool.' },
          { label: 'Select layers', detail: 'Tap a layer to select it; tap again to deselect. Drag the canvas with Select active to move selected layers.' },
          { label: 'Record a performance', detail: 'Pick the Animate tool (filmstrip icon). Choose a property to animate. Hit Play, then drag the widget handle to record movement in real time.' },
          { label: 'Review and refine', detail: 'Hit Stop, scrub the timeline. Press ⌘Z to undo a full take in one step.' },
        ],
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    sections: [
      {
        items: [
          { icon: MousePointer2, label: 'Select', detail: 'Tap layers to select them. Drag the canvas to move all selected layers at the current frame.' },
          { icon: Pencil, label: 'Pencil', detail: 'Draw smooth vector strokes on the canvas. Strokes are stored per-layer.' },
          { icon: Eraser, label: 'Eraser', detail: 'Erase parts of existing strokes. Drag across strokes to remove segments.' },
          { icon: Crosshair, label: 'Pivot', detail: 'Click and drag to set the rotation pivot point for the selected layer.' },
          { icon: Film, label: 'Animate', detail: 'Reveals property buttons (Move X, Move Y, Rotate, Scale, Alpha, Path). Drag a widget handle while playing to record keyframes.' },
        ],
      },
      {
        heading: 'Property widgets',
        items: [
          { icon: MoveHorizontal, label: 'Slider', detail: 'Used for Move X, Move Y, Scale, and Alpha. Drag left/right to change the value.' },
          { icon: RotateCcw, label: 'Rotation wheel', detail: 'Drag around the circular handle to set the rotation angle.' },
          { icon: Layers, label: 'Layer list', detail: "Used for the Path property — lets you sequence through a layer's image poses." },
        ],
      },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard shortcuts',
    sections: [
      {
        heading: 'Editing',
        rows: [
          { keys: '⌘ Z', action: 'Undo' },
          { keys: '⌘ ⇧ Z', action: 'Redo' },
          { keys: '⌘ A', action: 'Select all layers' },
        ],
      },
      {
        heading: 'Playback',
        rows: [
          { keys: 'Space', action: 'Play / pause' },
        ],
      },
      {
        heading: 'File',
        rows: [
          { keys: '⌘ S', action: 'Save' },
          { keys: '⌘ ⇧ S', action: 'Save as…' },
        ],
      },
    ],
  },
  {
    id: 'tips',
    title: 'Tips & tricks',
    sections: [
      {
        heading: 'Recording',
        items: [
          { icon: Lightbulb, label: 'Sensitivity', detail: 'Each layer has a sensitivity % in the Layers panel. Lower values give smoother, subtler motion; higher values give larger, faster movements.' },
          { icon: Lightbulb, label: 'Flick to dismiss', detail: 'Flick a property widget quickly to dismiss it without recording.' },
          { icon: Lightbulb, label: 'Undo a take', detail: '⌘Z after a recording undoes the entire take in one step, not frame by frame.' },
        ],
      },
      {
        heading: 'Layers',
        items: [
          { icon: Lightbulb, label: 'Reorder layers', detail: 'Drag a layer row in the Layers panel to change its stacking order.' },
          { icon: Lightbulb, label: 'Groups', detail: 'Select multiple layers and group them to move or animate them together.' },
          { icon: Lightbulb, label: 'Drag to import', detail: 'Drop image files directly onto the canvas to import them as layers.' },
        ],
      },
    ],
  },
]

function matchesQuery(article: Article, q: string): boolean {
  if (!q) return true
  const lower = q.toLowerCase()
  const text = [
    article.title,
    ...article.sections.flatMap((s) => [
      s.heading ?? '',
      s.body ?? '',
      ...(s.items ?? []).flatMap((it) => [it.label, it.detail ?? '']),
      ...(s.rows ?? []).flatMap((r) => [r.keys, r.action]),
    ]),
  ].join(' ').toLowerCase()
  return text.includes(lower)
}

export function HelpDialog({ open, onOpenChange }: Props) {
  const [activeId, setActiveId] = useState('getting-started')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => articles.filter((a) => matchesQuery(a, query)), [query])

  const displayed = useMemo(() => {
    if (!query) return articles.find((a) => a.id === activeId) ?? articles[0]
    return filtered[0] ?? null
  }, [query, filtered, activeId])

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery('') }}>
      <DialogContent className="flex h-[560px] max-h-[90dvh] gap-0 p-0 sm:max-w-2xl overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-48 shrink-0 flex-col border-r border-border">
          <div className="p-3 border-b border-border">
            <DialogTitle className="sr-only">Help</DialogTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {(query ? filtered : articles).map((a) => (
              <button
                key={a.id}
                onClick={() => { setActiveId(a.id); setQuery('') }}
                className={cn(
                  'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                  (!query && activeId === a.id)
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {a.title}
              </button>
            ))}
            {query && filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
            )}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {displayed ? (
            <>
              <DialogHeader className="mb-4">
                <h2 className="text-base font-semibold">{displayed.title}</h2>
              </DialogHeader>
              <div className="space-y-5">
                {displayed.sections.map((section, si) => (
                  <div key={si}>
                    {section.heading && (
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {section.heading}
                      </p>
                    )}
                    {section.body && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
                    )}
                    {section.items && (
                      <ul className="space-y-3">
                        {section.items.map((item, ii) => {
                          const Icon = item.icon
                          return (
                            <li key={ii} className="flex items-start gap-2.5">
                              {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />}
                              {!Icon && (
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-foreground">
                                  {ii + 1}
                                </span>
                              )}
                              <div>
                                <p className="text-sm font-medium leading-snug">{item.label}</p>
                                {item.detail && (
                                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{item.detail}</p>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    {section.rows && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody>
                            {section.rows.map((row, ri) => (
                              <tr key={ri} className={cn('border-border', ri > 0 && 'border-t')}>
                                <td className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap w-28">
                                  <Command className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                  {row.keys.replace('⌘ ', '')}
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{row.action}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No results for "{query}"</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
