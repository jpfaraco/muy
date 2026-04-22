import { useState, useCallback, useRef } from "react";
import { ChevronRight, Image, Spline, Type, MoreVertical } from "lucide-react";
import { useAnimationStore } from "../../store/animationStore";
import { useInteractionStore } from "../../store/interactionStore";
import { getDescendantLeafIds } from "../../utils/layerUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Layer } from "../../types/animation";

interface Props {
  layerId: string;
  depth: number;
}

function layerIcon(layer: Layer) {
  switch (layer.layerType) {
    case "vector":
      return <Spline className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case "text":
      return <Type className="h-4 w-4 shrink-0 text-muted-foreground" />;
    default:
      return <Image className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

const LONG_PRESS_DELAY = 1000;
const CANCEL_DIST_SQ = 100; // 10px radius squared

export function LayerTreeItem({ layerId, depth }: Props) {
  const layer = useAnimationStore((s) => s.doc.layers[layerId]);
  const layers = useAnimationStore((s) => s.doc.layers);
  const { deleteLayer, renameLayer } = useAnimationStore();
  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds);
  const reorderDrag = useInteractionStore((s) => s.reorderDrag);
  const { holdLayer, releaseLayer, releaseAllLayers, addLayerToList, layerListEntries, startReorder } = useInteractionStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const wasHeldRef = useRef(false);

  const isHeld = layer?.type === "group" ? getDescendantLeafIds(layerId, layers).some((id) => heldLayerIds.includes(id)) : heldLayerIds.includes(layerId);
  const isInList = layer?.type === "layer" && (layerListEntries?.some((e) => e.layerId === layerId) ?? false);
  const isDragging = reorderDrag?.draggingLayerIds.includes(layerId) ?? false;

  const handleChevronPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setIsExpanded((v) => !v);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // During an active reorder, ignore new presses
      if (reorderDrag) {
        e.stopPropagation();
        return;
      }

      e.stopPropagation();

      if (layerListEntries !== null && layer.type === "layer") {
        addLayerToList(layerId);
        return;
      }

      const { heldLayerIds: freshHeld, mode: currentMode, drawTool: currentTool } = useInteractionStore.getState();
      pressStartRef.current = { x: e.clientX, y: e.clientY };

      if (layer.type === "group") {
        const leafIds = getDescendantLeafIds(layerId, useAnimationStore.getState().doc.layers);
        const allAlreadyHeld = leafIds.length > 0 && leafIds.every((id) => freshHeld.includes(id));
        wasHeldRef.current = allAlreadyHeld;
        for (const leafId of leafIds) {
          holdLayer(leafId);
        }
      } else {
        const wasHeld = freshHeld.includes(layerId);
        wasHeldRef.current = wasHeld;
        if (!wasHeld) {
          if (currentMode === "draw" && currentTool !== "move") {
            releaseAllLayers();
            holdLayer(layerId);
          } else {
            holdLayer(layerId);
          }
        }
      }

      // Start long-press timer for reorder
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        const { heldLayerIds: latestHeld } = useInteractionStore.getState();
        if (latestHeld.length > 0) {
          startReorder(latestHeld);
        }
      }, LONG_PRESS_DELAY);
    },
    [holdLayer, releaseAllLayers, layerId, layer?.type, layerListEntries, addLayerToList, startReorder, reorderDrag],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressTimerRef.current || !pressStartRef.current) return;
    const dx = e.clientX - pressStartRef.current.x;
    const dy = e.clientY - pressStartRef.current.y;
    if (dx * dx + dy * dy > CANCEL_DIST_SQ) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      void e;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        if (wasHeldRef.current) {
          if (layer?.type === "group") {
            const leafIds = getDescendantLeafIds(layerId, useAnimationStore.getState().doc.layers);
            for (const leafId of leafIds) {
              releaseLayer(leafId);
            }
          } else {
            releaseLayer(layerId);
          }
        }
      }
    },
    [releaseLayer, layerId, layer?.type],
  );

  const handleRenameCommit = useCallback(
    (value: string) => {
      renameLayer(layerId, value.trim() || layer.name);
      setIsRenaming(false);
    },
    [renameLayer, layerId, layer?.name],
  );

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleRenameCommit(e.currentTarget.value);
      } else if (e.key === "Escape") {
        setIsRenaming(false);
      }
    },
    [handleRenameCommit],
  );

  if (!layer) return null;

  const paddingLeft = 12 + depth * 24;

  return (
    <>
      <div
        data-layer-item=""
        data-layer-id={layerId}
        data-parent-id={layer.parentId ?? ""}
        data-depth={depth}
        className={cn("group flex h-10 items-center gap-2 pr-2 text-sm transition-colors", isHeld ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/40", isInList ? "bg-emerald-950/60 text-emerald-300" : "", isDragging ? "opacity-40" : "")}
        style={{ paddingLeft }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {layer.type === "group" ? (
          <button className="flex items-center p-0.5 -ml-0.5" onPointerDown={handleChevronPointerDown}>
            <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", isExpanded && "rotate-90")} />
          </button>
        ) : (
          layerIcon(layer)
        )}

        {isRenaming ? <input autoFocus defaultValue={layer.name} className="flex-1 truncate bg-transparent outline-none ring-1 ring-blue-400 rounded px-1" onBlur={(e) => handleRenameCommit(e.currentTarget.value)} onKeyDown={handleRenameKeyDown} onPointerDown={(e) => e.stopPropagation()} /> : <span className="flex-1 truncate">{layer.name}</span>}

        {/* Kebab menu */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-xs" className={cn("text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100", menuOpen && "opacity-100")} onPointerDown={(e) => e.stopPropagation()} aria-label="Layer options">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-1" sideOffset={2}>
            <button
              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent focus:outline-none"
              onClick={() => {
                setIsRenaming(true);
                setMenuOpen(false);
              }}
            >
              Rename
            </button>
            <button
              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 focus:outline-none"
              onClick={() => {
                deleteLayer(layerId);
                releaseLayer(layerId);
                setMenuOpen(false);
              }}
            >
              Delete
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {layer.type === "group" && isExpanded && [...(layer.childIds ?? [])].reverse().map((childId) => <LayerTreeItem key={childId} layerId={childId} depth={depth + 1} />)}
    </>
  );
}
