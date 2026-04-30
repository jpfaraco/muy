import { MousePointer2, Hand, Pencil, Eraser, Type, Crosshair, Film, Undo2, Redo2 } from "lucide-react";
import { useInteractionStore } from "../../store/interactionStore";
import { useAnimationHistory, useAnimationStore } from "../../store/animationStore";
import { CANVAS_ZOOM_STEP, useCanvasViewStore } from "../../store/canvasViewStore";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActiveTool } from "../../store/interactionStore";

export function Toolbox() {
  const activeTool = useInteractionStore((s) => s.activeTool);
  const setActiveTool = useInteractionStore((s) => s.setActiveTool);
  const canUndo = useAnimationHistory((s) => s.pastStates.length > 0);
  const canRedo = useAnimationHistory((s) => s.futureStates.length > 0);
  const zoom = useCanvasViewStore((s) => s.zoom);
  const zoomByFactor = useCanvasViewStore((s) => s.zoomByFactor);
  const setZoomPreset = useCanvasViewStore((s) => s.setZoomPreset);
  const fit = useCanvasViewStore((s) => s.fit);

  const btn = (tool: ActiveTool, Icon: React.ElementType, label: string) => (
    <button key={tool} aria-label={label} onClick={() => setActiveTool(activeTool === tool ? "select" : tool)} className={cn("flex h-10 w-10 items-center justify-center rounded-md transition-colors", activeTool === tool ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
      <Icon className="h-4 w-4" />
    </button>
  );

  const historyBtn = (Icon: React.ElementType, label: string, enabled: boolean, action: () => void) => (
    <button aria-label={label} onClick={action} disabled={!enabled} className={cn("flex h-10 w-10 items-center justify-center rounded-md transition-colors", enabled ? "text-muted-foreground hover:bg-accent/50 hover:text-foreground" : "text-muted-foreground opacity-50")}>
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-lg">
      {btn("select", MousePointer2, "Select")}
      {btn("hand", Hand, "Hand")}
      {historyBtn(Undo2, "Undo", canUndo, () => useAnimationStore.temporal.getState().undo())}
      {historyBtn(Redo2, "Redo", canRedo, () => useAnimationStore.temporal.getState().redo())}
      <div className="h-6 w-px shrink-0 bg-border" />
      {btn("pencil", Pencil, "Pencil")}
      {btn("eraser", Eraser, "Eraser")}
      {btn("text", Type, "Text")}
      {btn("pivot", Crosshair, "Pivot")}
      {btn("animate", Film, "Animate")}
      <div className="h-6 w-px shrink-0 bg-border" />
      <Select
        onValueChange={(value) => {
          if (value === "zoom_in") zoomByFactor(CANVAS_ZOOM_STEP);
          else if (value === "zoom_out") zoomByFactor(1 / CANVAS_ZOOM_STEP);
          else if (value === "zoom_100") setZoomPreset(1);
          else if (value === "zoom_fit") fit();
        }}
      >
        <SelectTrigger aria-label="Zoom" className="w-20">
          <SelectValue>{() => `${Math.round(zoom * 100)}%`}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectItem value="zoom_in">Zoom in</SelectItem>
            <SelectItem value="zoom_out">Zoom out</SelectItem>
            <SelectItem value="zoom_100">100%</SelectItem>
            <SelectItem value="zoom_fit">Fit</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
