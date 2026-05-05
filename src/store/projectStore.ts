import { create } from 'zustand'
import { useAnimationStore } from './animationStore'

interface ProjectState {
  currentProjectId: string | null
  currentProjectName: string | null
  isDirty: boolean
  lastSavedAt: number | null
  /** When true, doc/drawStrokes changes don't flip isDirty (used during programmatic loads/saves) */
  suspendDirtyTracking: boolean
}

interface ProjectActions {
  setCurrentProject: (id: string | null, name: string | null) => void
  setIsDirty: (dirty: boolean) => void
  setSuspendDirtyTracking: (suspend: boolean) => void
  setLastSavedAt: (ts: number) => void
  /** Clear all project identity (used by New document) */
  clearProject: () => void
}

type ProjectStore = ProjectState & ProjectActions

export const useProjectStore = create<ProjectStore>()((set) => ({
  currentProjectId: null,
  currentProjectName: null,
  isDirty: false,
  lastSavedAt: null,
  suspendDirtyTracking: false,

  setCurrentProject: (id, name) =>
    set({ currentProjectId: id, currentProjectName: name, isDirty: false }),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  setSuspendDirtyTracking: (suspend) => set({ suspendDirtyTracking: suspend }),

  setLastSavedAt: (ts) => set({ lastSavedAt: ts, isDirty: false }),

  clearProject: () =>
    set({
      currentProjectId: null,
      currentProjectName: null,
      isDirty: false,
      lastSavedAt: null,
    }),
}))

// Subscribe to animationStore and mark the project dirty whenever doc or drawStrokes change.
// This runs as a module-level side effect so it's active for the lifetime of the app.
useAnimationStore.subscribe((state, prevState) => {
  if (state.doc !== prevState.doc || state.drawStrokes !== prevState.drawStrokes) {
    const { suspendDirtyTracking, setIsDirty } = useProjectStore.getState()
    if (!suspendDirtyTracking) {
      setIsDirty(true)
    }
  }
})
