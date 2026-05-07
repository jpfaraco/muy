import { useState, useMemo } from 'react'
import {
  MousePointer2, Pencil, Eraser, Crosshair, Film,
  Command, Search, Settings2, Gauge, Lightbulb,
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
  desktopOnly?: boolean
  sections: Section[]
}

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

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
          {
            label: 'Build your scene',
            detail: 'Import image layers via the + button in the Layers panel, or draw with the Pencil or Text tool. On desktop you can also drag image files directly onto the canvas.',
          },
          {
            label: 'Select layers',
            detail: 'Tap a layer in the Layers panel to select it; tap again to deselect. Multiple layers can be selected at once.',
          },
          {
            label: 'Record a performance',
            detail: 'Pick the Animate tool (filmstrip icon). Choose a property. Tap Play, then drag the widget to record movement in real time.',
          },
          {
            label: 'Review and refine',
            detail: 'Tap Stop and scrub the timeline. Undo discards the entire take in one step.',
          },
        ],
      },
    ],
  },
  {
    id: 'layers',
    title: 'Layers',
    sections: [
      {
        heading: 'Selecting',
        items: [
          {
            label: 'Toggle selection',
            detail: 'Tap a layer to select it; tap again to deselect. In Select mode, dragging the canvas moves all selected layers at the current frame.',
          },
        ],
      },
      {
        heading: 'Reordering',
        items: [
          {
            label: 'Hold and drag',
            detail: 'Hold down one or more layers in the Layers panel to enter reorder mode, then drag them to a new position in the stack.',
          },
        ],
      },
      {
        heading: 'Grouping',
        items: [
          {
            label: 'Create a group',
            detail: "Tap the ⋯ menu on any layer and choose 'Add to group'. Then hold and drag other layers onto the group to add them.",
          },
          {
            label: 'Ungroup',
            detail: "Tap the ⋯ menu on a group or a layer inside it and choose 'Ungroup'.",
          },
        ],
      },
      {
        heading: 'Visibility and deletion',
        items: [
          {
            label: 'Hide / show',
            detail: 'Tap the visibility icon next to a layer to hide or show it. Hidden layers are excluded from playback.',
          },
          {
            label: 'Delete',
            detail: "Tap the ⋯ menu on a layer and choose 'Delete'.",
          },
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
          { icon: Pencil, label: 'Pencil', detail: 'Draw smooth vector strokes on the canvas. Strokes are stored per layer.' },
          { icon: Eraser, label: 'Eraser', detail: 'Erase parts of existing strokes. Drag across strokes to remove segments.' },
          { icon: Crosshair, label: 'Pivot', detail: 'Drag to set the rotation and scale pivot point for the selected layer.' },
          { icon: Film, label: 'Animate', detail: 'Reveals the property buttons. Drag a widget while playing to record keyframes in real time.' },
        ],
      },
      {
        heading: 'Properties',
        items: [
          { label: 'Move X / Move Y', detail: 'Shifts the layer horizontally or vertically.' },
          { label: 'Rotate', detail: 'Rotates the layer. The center of rotation is the pivot point.' },
          { label: 'Scale', detail: 'Resizes the layer. Scaling is relative to the pivot point.' },
          { label: 'Alpha', detail: 'Controls the opacity of the layer, from fully transparent to fully opaque.' },
          { label: 'Reveal', detail: 'Progressively reveals or hides vector strokes and text. Not available for image layers.' },
        ],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    sections: [
      {
        heading: 'Save and open',
        items: [
          {
            label: 'Save / Open',
            detail: "Projects are saved in your browser's local storage on this device. Use File → Save and File → Open to manage them.",
          },
          {
            label: 'Save as',
            detail: 'Creates a new named project in local storage.',
          },
        ],
      },
      {
        heading: 'Export and import',
        items: [
          {
            label: 'Export',
            detail: 'Downloads your project as a .muy file. Use this to back up your work or transfer it to another device.',
          },
          {
            label: 'Import',
            detail: 'Opens a .muy file from your device. Useful for loading a project exported from another device or shared by someone else.',
          },
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
          {
            icon: Settings2,
            label: 'Sensitivity',
            detail: 'Each layer has a sensitivity %. Tap the ⚙ icon in the Layers panel header to reveal the sensitivity scrubbers. Lower values give subtler, smoother motion; higher values give larger, faster movements.',
          },
          {
            icon: Gauge,
            label: 'Playback speed',
            detail: 'Use the speed selector in the timeline to slow down playback while recording. Performing in slow motion gives you more precise control. This does not affect the FPS or speed of the final animation.',
          },
          {
            icon: Lightbulb,
            label: 'Flick to dismiss',
            detail: 'Flick a property widget quickly to dismiss it without recording.',
          },
          {
            icon: Lightbulb,
            label: 'Undo a take',
            detail: 'Undoing after a recording discards the entire take in one step, not frame by frame.',
          },
        ],
      },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard shortcuts',
    desktopOnly: true,
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

  const visibleArticles = useMemo(
    () => articles.filter((a) => !a.desktopOnly || !isTouchDevice),
    [],
  )

  const filtered = useMemo(
    () => visibleArticles.filter((a) => matchesQuery(a, query)),
    [query, visibleArticles],
  )

  const displayed = useMemo(() => {
    if (!query) return visibleArticles.find((a) => a.id === activeId) ?? visibleArticles[0]
    return filtered[0] ?? null
  }, [query, filtered, activeId, visibleArticles])

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
            {(query ? filtered : visibleArticles).map((a) => (
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
