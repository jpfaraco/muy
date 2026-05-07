import { useState, useCallback } from 'react'
import { Check } from 'lucide-react'
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
import { AboutDialog } from './AboutDialog'
import { AddToHomeScreenDialog } from './AddToHomeScreenDialog'
import { NewDocumentDialog } from './NewDocumentDialog'
import { SaveAsDialog } from './SaveAsDialog'
import { ProjectBrowserDialog } from './ProjectBrowserDialog'
import { ExportDialog } from './ExportDialog'
import { ImportDialog } from './ImportDialog'
import { cn } from '@/lib/utils'
import { CANVAS_ZOOM_STEP, useCanvasViewStore } from '../store/canvasViewStore'
import { getFlatRenderIds, useAnimationHistory, useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'
import { useProjectStore } from '../store/projectStore'
import { serializeProject } from '../lib/muyFile'
import { updateProject, createProject, setLastOpenedProjectId } from '../lib/projectDb'
import { generateThumbnail } from '../lib/thumbnail'

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

export function Header() {
  const [newDocOpen, setNewDocOpen] = useState(false)
  const [projectBrowserOpen, setProjectBrowserOpen] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false)
  const [exportVideoOpen, setExportVideoOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [addToHomeOpen, setAddToHomeOpen] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)

  const zoomByFactor = useCanvasViewStore((s) => s.zoomByFactor)
  const setZoomPreset = useCanvasViewStore((s) => s.setZoomPreset)
  const fit = useCanvasViewStore((s) => s.fit)
  const doc = useAnimationStore((s) => s.doc)
  const setLayersHidden = useAnimationStore((s) => s.setLayersHidden)
  const setHeldLayers = useInteractionStore((s) => s.setHeldLayers)
  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds)

  const canUndo = useAnimationHistory((s) => s.pastStates.length > 0)
  const canRedo = useAnimationHistory((s) => s.futureStates.length > 0)

  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const currentProjectName = useProjectStore((s) => s.currentProjectName)
  const isDirty = useProjectStore((s) => s.isDirty)

  const flashSaved = useCallback(() => {
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 2000)
  }, [])

  const handleSave = useCallback(async () => {
    if (!currentProjectId) {
      // Untitled — open Save As dialog
      setSaveAsOpen(true)
      return
    }

    const { doc: currentDoc, drawStrokes } = useAnimationStore.getState()
    const { setSuspendDirtyTracking, setLastSavedAt, currentProjectName: name } = useProjectStore.getState()

    try {
      const file = await serializeProject(currentDoc, drawStrokes)
      const thumbnail = await generateThumbnail(currentDoc, drawStrokes, useAnimationStore.getState().currentFrame)
      setSuspendDirtyTracking(true)
      try {
        await updateProject(currentProjectId, { data: file, thumbnail, name: name ?? 'Untitled' })
        setLastSavedAt(Date.now())
        setLastOpenedProjectId(currentProjectId)
        flashSaved()
      } finally {
        setSuspendDirtyTracking(false)
      }
    } catch (err) {
      // Surface error via console; a future iteration can show a toast
      console.error('Save failed:', err)
    }
  }, [currentProjectId, flashSaved])

  const handleSaveAs = useCallback(async (name: string) => {
    const { doc: currentDoc, drawStrokes, currentFrame } = useAnimationStore.getState()
    const { setSuspendDirtyTracking, setCurrentProject } = useProjectStore.getState()

    const file = await serializeProject(currentDoc, drawStrokes)
    const thumbnail = await generateThumbnail(currentDoc, drawStrokes, currentFrame)
    setSuspendDirtyTracking(true)
    try {
      const record = await createProject(name, file, thumbnail)
      setCurrentProject(record.id, record.name)
      setLastOpenedProjectId(record.id)
      flashSaved()
    } finally {
      setSuspendDirtyTracking(false)
    }
  }, [flashSaved])

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
                <MenubarItem className="whitespace-nowrap" onClick={() => setProjectBrowserOpen(true)}>Open…</MenubarItem>
                <MenubarItem
                  className="whitespace-nowrap"
                  onClick={handleSave}
                >
                  Save{isDirty && !savedIndicator ? '' : ''}
                  {savedIndicator && <Check className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
                </MenubarItem>
                <MenubarItem className="whitespace-nowrap" onClick={() => setSaveAsOpen(true)}>Save as…</MenubarItem>
                <MenubarSeparator />
                <MenubarItem className="whitespace-nowrap" onClick={() => setImportOpen(true)}>Import…</MenubarItem>
                <MenubarItem className="whitespace-nowrap" onClick={() => setExportOpen(true)}>Export…</MenubarItem>
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

            <MenubarMenu>
              <MenubarTrigger className="gap-1 px-3 text-foreground aria-expanded:bg-accent">Help</MenubarTrigger>
              <MenubarContent>
                <MenubarItem className="whitespace-nowrap" onClick={() => setHelpOpen(true)}>How Muy works</MenubarItem>
                {isTouchDevice && <MenubarItem className="whitespace-nowrap" onClick={() => setAddToHomeOpen(true)}>Add to home screen…</MenubarItem>}
                <MenubarItem className="whitespace-nowrap" onClick={() => setAboutOpen(true)}>About Muy</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          {/* Project name indicator */}
          {currentProjectName && (
            <span className="text-sm text-muted-foreground">
              {currentProjectName}{isDirty ? ' ·' : ''}
            </span>
          )}
        </div>

      </header>

      <NewDocumentDialog open={newDocOpen} onOpenChange={setNewDocOpen} />
      <ProjectBrowserDialog open={projectBrowserOpen} onOpenChange={setProjectBrowserOpen} />
      <SaveAsDialog
        open={saveAsOpen}
        onOpenChange={setSaveAsOpen}
        defaultName={currentProjectName ?? 'Untitled'}
        onConfirm={handleSaveAs}
      />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <CanvasSettingsDialog open={canvasSettingsOpen} onOpenChange={setCanvasSettingsOpen} />
      <ExportVideoDialog open={exportVideoOpen} onOpenChange={setExportVideoOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <AddToHomeScreenDialog open={addToHomeOpen} onOpenChange={setAddToHomeOpen} />
    </>
  )
}
