import { useRef, useCallback } from "react";
import { useAnimationStore } from "../../store/animationStore";
import { useInteractionStore } from "../../store/interactionStore";
import { cn } from "@/lib/utils";
import type { FrameData } from "../../types/animation";

const THUMB_W = 10;
const THUMB_H = 32;
const THUMB_GAP = 1;

type FrameState = "no-selection" | "empty" | "keyframe" | "partial";

function getFrameState(frameData: FrameData, selectedLayerIds: string[]): FrameState {
  if (selectedLayerIds.length === 0) return "no-selection";
  const keyframeCount = selectedLayerIds.filter((id) => id in frameData).length;
  if (keyframeCount === 0) return "empty";
  if (keyframeCount === selectedLayerIds.length) return "keyframe";
  return "partial";
}

/**
 * Filmstrip where the playhead is a fixed vertical line at the container's center.
 * The strip translates so the current frame's thumbnail is always under the playhead.
 * Dragging left → advance frames, dragging right → go back.
 *
 * Frame states (Flash-style):
 * - no-selection: nothing selected → all frames muted
 * - empty: layer(s) selected, no keyframe at this frame
 * - keyframe: all selected layers have a keyframe here → filled dot
 * - partial: some selected layers have a keyframe → outline dot
 */
export function ThumbnailStrip() {
  const doc = useAnimationStore((s) => s.doc);
  const currentFrame = useAnimationStore((s) => s.currentFrame);
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame);
  const selectedLayerIds = useInteractionStore((s) => s.selectedLayerIds);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startFrameRef = useRef(0);

  const cellWidth = THUMB_W + THUMB_GAP;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      startFrameRef.current = currentFrame;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [currentFrame],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      // Dragging left (dx < 0) → frameDelta > 0 → advance forward
      const frameDelta = Math.round(-dx / cellWidth);
      const nextFrame = Math.max(0, Math.min(doc.frameCount - 1, startFrameRef.current + frameDelta));
      setCurrentFrame(nextFrame);
    },
    [cellWidth, doc.frameCount, setCurrentFrame],
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Position the strip so that currentFrame's thumbnail is centered under the playhead.
  const stripLeft = `calc(50% - ${(currentFrame + 0.5) * cellWidth}px)`;

  return (
    <div className="relative h-9 w-full cursor-grab overflow-hidden rounded-lg bg-background active:cursor-grabbing" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
      {/* Scrolling filmstrip */}
      <div className="absolute top-0.5 flex" style={{ left: stripLeft, gap: THUMB_GAP }}>
        {Array.from({ length: doc.frameCount }, (_, i) => {
          const state = getFrameState(doc.frames[i], selectedLayerIds);
          return (
            <div key={i} className={cn("relative shrink-0", i === currentFrame ? "bg-muted-foreground/60" : "bg-secondary", state === "no-selection" && "opacity-70")} style={{ width: THUMB_W, height: THUMB_H, borderRadius: 1 }}>
              {state === "keyframe" && <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-foreground" style={{ width: 4, height: 4, top: 4 }} />}
              {state === "partial" && <div className="absolute left-1/2 -translate-x-1/2 rounded-full border border-foreground" style={{ width: 4, height: 4, top: 4 }} />}
            </div>
          );
        })}
      </div>

      {/* Fixed center playhead */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-px bg-red-500" />

      {/* Inset shadow */}
      <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" />
    </div>
  );
}
