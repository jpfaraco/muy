import { useState, useEffect, useCallback, useRef } from 'react'
import { MoreHorizontal, Plus, Trash2, Copy, Pencil, ImageOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  listProjects,
  createProject,
  deleteProject,
  duplicateProject,
  updateProject,
  setLastOpenedProjectId,
  type ProjectRecord,
  ProjectDbError,
} from '../lib/projectDb'
import { deserializeProject } from '../lib/muyFile'
import { useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'
import { useCanvasViewStore } from '../store/canvasViewStore'
import { useProjectStore } from '../store/projectStore'
import { initialDoc } from '../assets/sample/initialDoc'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatRelativeTime(epochMs: number): string {
  const diffMs = Date.now() - epochMs
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(epochMs).toLocaleDateString()
}

function loadProjectIntoEditor(record: ProjectRecord) {
  const { setSuspendDirtyTracking, setCurrentProject } = useProjectStore.getState()
  const { setDoc, setCurrentFrame, setIsPlaying } = useAnimationStore.getState()
  const { setHeldLayers, setLayerListEntries, clearLiveLayerProps } = useInteractionStore.getState()
  const { fit } = useCanvasViewStore.getState()

  setSuspendDirtyTracking(true)
  try {
    const validated = deserializeProject(record.data)
    setDoc(validated.doc)
    useAnimationStore.setState({ drawStrokes: validated.drawStrokes })
    setCurrentFrame(0)
    setIsPlaying(false)
    useAnimationStore.temporal.getState().clear()
    setHeldLayers([])
    setLayerListEntries(null)
    clearLiveLayerProps(Object.keys(validated.doc.layers))
    fit()
    setCurrentProject(record.id, record.name)
    setLastOpenedProjectId(record.id)
  } finally {
    setSuspendDirtyTracking(false)
  }
}

function ThumbnailImage({ src }: { src: string | null }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <ImageOff className="h-6 w-6" />
      </div>
    )
  }
  return <img src={src} alt="" className="h-full w-full object-contain" />
}

interface ProjectCardProps {
  record: ProjectRecord
  onLoad: (record: ProjectRecord) => void
  onDelete: (record: ProjectRecord) => void
  onDuplicate: (id: string) => void
  onRename: (id: string, newName: string) => void
}

function ProjectCard({ record, onLoad, onDelete, onDuplicate, onRename }: ProjectCardProps) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(record.name)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== record.name) {
      onRename(record.id, trimmed)
    } else {
      setRenameValue(record.name)
    }
    setRenaming(false)
  }

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenameValue(record.name)
    setRenaming(true)
    requestAnimationFrame(() => renameInputRef.current?.select())
  }

  return (
    <div
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary"
      onClick={() => onLoad(record)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <ThumbnailImage src={record.thumbnail} />
        {/* Context menu button */}
        <div
          className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-7 w-7 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm hover:bg-accent focus:outline-none"
              aria-label="Project options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={startRename}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(record.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(record)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Name + timestamp */}
      <div className="flex flex-col gap-0.5 px-2 py-2">
        {renaming ? (
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setRenameValue(record.name); setRenaming(false) }
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 px-1 py-0 text-sm"
            autoFocus
          />
        ) : (
          <p className="truncate text-sm font-medium leading-tight">{record.name}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatRelativeTime(record.updatedAt)}</p>
      </div>
    </div>
  )
}

export function ProjectBrowserDialog({ open, onOpenChange }: Props) {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null)
  const [confirmingDirty, setConfirmingDirty] = useState<ProjectRecord | null>(null)
  const [confirmingBlankCanvas, setConfirmingBlankCanvas] = useState(false)

  const isDirty = useProjectStore((s) => s.isDirty)

  const refreshProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listProjects()
      setProjects(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) refreshProjects()
  }, [open, refreshProjects])

  const handleLoad = (record: ProjectRecord) => {
    if (isDirty) {
      setConfirmingDirty(record)
    } else {
      loadProjectIntoEditor(record)
      onOpenChange(false)
    }
  }

  const handleConfirmLoad = () => {
    if (confirmingDirty) {
      loadProjectIntoEditor(confirmingDirty)
      setConfirmingDirty(null)
      onOpenChange(false)
    }
  }

  const handleNewOrConfirm = () => {
    if (isDirty) {
      setConfirmingBlankCanvas(true)
    } else {
      handleNew()
    }
  }

  const handleNew = async () => {
    const { setSuspendDirtyTracking, clearProject } = useProjectStore.getState()
    const { setDoc, setCurrentFrame, setIsPlaying } = useAnimationStore.getState()
    const { setHeldLayers, setLayerListEntries, clearLiveLayerProps } = useInteractionStore.getState()
    const { fit } = useCanvasViewStore.getState()

    setSuspendDirtyTracking(true)
    try {
      setDoc(initialDoc)
      useAnimationStore.setState({ drawStrokes: {} })
      setCurrentFrame(0)
      setIsPlaying(false)
      useAnimationStore.temporal.getState().clear()
      setHeldLayers([])
      setLayerListEntries(null)
      clearLiveLayerProps(Object.keys(initialDoc.layers))
      fit()
      clearProject()
      setLastOpenedProjectId(null)
    } finally {
      setSuspendDirtyTracking(false)
    }

    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
      refreshProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete project.')
      setDeleteTarget(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateProject(id)
      refreshProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate project.')
    }
  }

  const handleRename = async (id: string, newName: string) => {
    try {
      await updateProject(id, { name: newName })
      // Update name in projectStore if this is the current project
      const { currentProjectId, setCurrentProject } = useProjectStore.getState()
      if (currentProjectId === id) setCurrentProject(id, newName)
      refreshProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename project.')
    }
  }

  const handleNewProject = async () => {
    try {
      const now = Date.now()
      const blankFile = {
        magic: 'muy' as const,
        version: 1 as const,
        savedAt: new Date(now).toISOString(),
        doc: initialDoc,
        drawStrokes: {},
      }
      await createProject('Untitled', blankFile, null)
      refreshProjects()
    } catch (err) {
      if (err instanceof ProjectDbError && err.code === 'QUOTA_EXCEEDED') {
        setError(err.message)
      } else {
        setError('Could not create project.')
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4 pr-12">
            <div>
              <DialogTitle>Open project</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Click a project to open it, or create a new one.
              </DialogDescription>
            </div>
            <Button size="sm" onClick={handleNewProject} className="shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              New project
            </Button>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-6">
              {loading && (
                <p className="text-center text-sm text-muted-foreground">Loading…</p>
              )}

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {!loading && projects.length === 0 && !error && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <p className="text-sm text-muted-foreground">No projects yet.</p>
                  <Button variant="outline" onClick={handleNewOrConfirm}>
                    Start with a blank canvas
                  </Button>
                </div>
              )}

              {projects.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {projects.map((record) => (
                    <ProjectCard
                      key={record.id}
                      record={record}
                      onLoad={handleLoad}
                      onDelete={setDeleteTarget}
                      onDuplicate={handleDuplicate}
                      onRename={handleRename}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirm discard unsaved changes */}
      <AlertDialog open={!!confirmingDirty} onOpenChange={(v) => !v && setConfirmingDirty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Opening another project will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLoad} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard and open
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm blank canvas when unsaved changes exist */}
      <AlertDialog open={confirmingBlankCanvas} onOpenChange={(v) => !v && setConfirmingBlankCanvas(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Save your project first via <strong>File → Save</strong>, or discard and start with a blank canvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmingBlankCanvas(false); handleNew() }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard and start new
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This project will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
