import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { CanvasSettingsDialog } from './CanvasSettingsDialog'
import { ExportVideoDialog } from './ExportVideoDialog'
import { HelpDialog } from './HelpDialog'
import { NewDocumentDialog } from './NewDocumentDialog'
import { cn } from '@/lib/utils'
import { CANVAS_ZOOM_STEP, useCanvasViewStore } from '../store/canvasViewStore'
import { getFlatRenderIds, useAnimationHistory, useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'

const SoonBadge = () => (
  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
    Soon
  </span>
)

export function Header() {
  const [newDocOpen, setNewDocOpen] = useState(false)
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false)
  const [exportVideoOpen, setExportVideoOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const zoomByFactor = useCanvasViewStore((s) => s.zoomByFactor)
  const setZoomPreset = useCanvasViewStore((s) => s.setZoomPreset)
  const fit = useCanvasViewStore((s) => s.fit)
  const doc = useAnimationStore((s) => s.doc)
  const setLayersHidden = useAnimationStore((s) => s.setLayersHidden)
  const setHeldLayers = useInteractionStore((s) => s.setHeldLayers)
  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds)

  const canUndo = useAnimationHistory((s) => s.pastStates.length > 0)
  const canRedo = useAnimationHistory((s) => s.futureStates.length > 0)

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

          <Menubar className="h-auto gap-0 border-none bg-transparent p-0">
            <MenubarMenu>
              <MenubarTrigger className="gap-1 px-3 text-foreground aria-expanded:bg-accent">File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => setNewDocOpen(true)}>New</MenubarItem>
                <MenubarItem disabled className="whitespace-nowrap">Open… <SoonBadge /></MenubarItem>
                <MenubarItem disabled className="whitespace-nowrap">Save… <SoonBadge /></MenubarItem>
                <MenubarSeparator />
                <MenubarItem className="whitespace-nowrap" onClick={() => setCanvasSettingsOpen(true)}>Canvas settings…</MenubarItem>
                <MenubarItem className="whitespace-nowrap" onClick={() => setExportVideoOpen(true)}>Export video…</MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="gap-1 px-3 text-foreground aria-expanded:bg-accent">Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem disabled={!canUndo} onClick={() => useAnimationStore.temporal.getState().undo()}>Undo</MenubarItem>
                <MenubarItem disabled={!canRedo} onClick={() => useAnimationStore.temporal.getState().redo()}>Redo</MenubarItem>
                <MenubarSeparator />
                <MenubarItem className="whitespace-nowrap" onClick={() => setHeldLayers(getFlatRenderIds(doc))}>Select all</MenubarItem>
                <MenubarSeparator />
                <MenubarItem
                  className="whitespace-nowrap"
                  disabled={heldLayerIds.length === 0}
                  onClick={() => setLayersHidden(heldLayerIds, true)}
                >
                  Hide selected layers
                </MenubarItem>
                <MenubarItem
                  className="whitespace-nowrap"
                  disabled={!Object.values(doc.layers).some((l) => l.type === 'layer' && l.hidden)}
                  onClick={() => setLayersHidden(
                    Object.values(doc.layers).filter((l) => l.type === 'layer' && l.hidden).map((l) => l.id),
                    false,
                  )}
                >
                  Show all hidden layers
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="gap-1 px-3 text-foreground aria-expanded:bg-accent">View</MenubarTrigger>
              <MenubarContent>
                <MenubarItem className="whitespace-nowrap" onClick={() => zoomByFactor(CANVAS_ZOOM_STEP)}>Zoom in</MenubarItem>
                <MenubarItem className="whitespace-nowrap" onClick={() => zoomByFactor(1 / CANVAS_ZOOM_STEP)}>Zoom out</MenubarItem>
                <MenubarItem className="whitespace-nowrap" onClick={() => setZoomPreset(1)}>Zoom to 100%</MenubarItem>
                <MenubarItem className="whitespace-nowrap" onClick={fit}>Zoom to fit</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
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

      <NewDocumentDialog open={newDocOpen} onOpenChange={setNewDocOpen} />
      <CanvasSettingsDialog open={canvasSettingsOpen} onOpenChange={setCanvasSettingsOpen} />
      <ExportVideoDialog open={exportVideoOpen} onOpenChange={setExportVideoOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
