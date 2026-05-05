import { useEffect } from 'react'
import { useAnimationStore } from './store/animationStore'
import { useInteractionStore } from './store/interactionStore'
import { useCanvasViewStore } from './store/canvasViewStore'
import { useProjectStore } from './store/projectStore'
import { useAnimationLoop } from './hooks/useAnimationLoop'
import { useUndoRedo } from './hooks/useUndoRedo'
import { initialDoc } from './assets/sample/initialDoc'
import { getLastOpenedProjectId, getProject } from './lib/projectDb'
import { deserializeProject } from './lib/muyFile'
import { Header } from './components/Header'
import { LeftPanel } from './components/LeftPanel/LeftPanel'
import { CanvasArea } from './components/Canvas/CanvasArea'
import { Timeline } from './components/Timeline/Timeline'

export default function App() {
  useEffect(() => {
    async function restoreLastProject() {
      const { setSuspendDirtyTracking, setCurrentProject, clearProject } = useProjectStore.getState()
      const { setDoc } = useAnimationStore.getState()
      const { setHeldLayers, setLayerListEntries, clearLiveLayerProps } = useInteractionStore.getState()

      try {
        const lastId = await getLastOpenedProjectId()
        if (lastId) {
          const record = await getProject(lastId)
          if (record) {
            const validated = deserializeProject(record.data)
            setSuspendDirtyTracking(true)
            try {
              setDoc(validated.doc)
              useAnimationStore.setState({ drawStrokes: validated.drawStrokes })
              useAnimationStore.getState().setCurrentFrame(0)
              useAnimationStore.getState().setIsPlaying(false)
              useAnimationStore.temporal.getState().clear()
              setHeldLayers([])
              setLayerListEntries(null)
              clearLiveLayerProps(Object.keys(validated.doc.layers))
              // Defer fit until after the canvas has rendered with the new doc dimensions
              requestAnimationFrame(() => useCanvasViewStore.getState().fit())
              setCurrentProject(record.id, record.name)
            } finally {
              setSuspendDirtyTracking(false)
            }
            return
          }
        }
      } catch {
        // IDB unavailable (private mode, corrupt data) — fall back to blank canvas
      }

      // No last project or IDB unavailable — start blank
      setSuspendDirtyTracking(true)
      try {
        setDoc(initialDoc)
        useAnimationStore.temporal.getState().clear()
        clearProject()
      } finally {
        setSuspendDirtyTracking(false)
      }
    }

    restoreLastProject()
  }, [])

  useAnimationLoop()
  useUndoRedo()

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftPanel />
        <CanvasArea />
      </div>
      <Timeline />
    </div>
  )
}
