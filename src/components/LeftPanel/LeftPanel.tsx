import { LayersPanel } from './LayersPanel'

export function LeftPanel() {
  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar">
      <LayersPanel />
    </aside>
  )
}
