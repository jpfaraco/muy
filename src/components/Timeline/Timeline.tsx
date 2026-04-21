import { SkipBack, Play, Pause, SkipForward, Paintbrush, Video, MoveHorizontal, MoveVertical, RotateCw, Scaling, Blend } from "lucide-react";
import { useAnimationStore } from "../../store/animationStore";
import { useInteractionStore } from "../../store/interactionStore";
import { ThumbnailStrip } from "./ThumbnailStrip";
import { DrawToolbox } from "../DrawToolbox";
import { PropertyButton } from "../LeftPanel/PropertyButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PropertyKey } from "../../types/animation";

const PROPERTIES: Array<{ key: PropertyKey; label: string; icon: React.ElementType }> = [
  { key: "x", label: "Move X", icon: MoveHorizontal },
  { key: "y", label: "Move Y", icon: MoveVertical },
  { key: "rotation", label: "Rotate", icon: RotateCw },
  { key: "scale", label: "Scale", icon: Scaling },
  { key: "transparency", label: "Alpha", icon: Blend },
];

function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = frame % fps;
  return [String(minutes).padStart(2, "0"), String(seconds).padStart(2, "0"), String(frames).padStart(2, "0")].join(" : ");
}

export function Timeline() {
  const { isPlaying, setIsPlaying, currentFrame } = useAnimationStore();
  const fps = useAnimationStore((s) => s.doc.fps);
  const frameCount = useAnimationStore((s) => s.doc.frameCount);
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame);

  const mode = useInteractionStore((s) => s.mode);
  const setMode = useInteractionStore((s) => s.setMode);

  function handleSkipBack() {
    setCurrentFrame(0);
  }

  function handleSkipForward() {
    setCurrentFrame(frameCount - 1);
  }

  return (
    <footer className="flex shrink-0 flex-col gap-4 border-t border-sidebar-border bg-sidebar px-4 py-4 select-none" style={{ minHeight: 193 }}>
      {/* Mode tabs — always at top */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "animate" | "draw")}>
        <TabsList>
          <TabsTrigger value="draw" className="gap-1.5 px-2 py-1 text-sm">
            <Paintbrush className="h-4 w-4" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="animate" className="gap-1.5 px-2 py-1 text-sm">
            <Video className="h-4 w-4" />
            Animate
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "animate" ? (
        <>
          {/* Controls row: playback left, properties right */}
          <div className="flex items-center justify-between">
            {/* Playback controls + timestamp */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border p-1.75 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
                  aria-label="Skip to start"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleSkipBack();
                  }}
                >
                  <SkipBack className="h-full w-full" />
                </button>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border p-2.5 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setIsPlaying(!isPlaying);
                  }}
                >
                  {isPlaying ? <Pause className="h-full w-full" /> : <Play className="h-full w-full" />}
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border p-1.75 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
                  aria-label="Skip to end"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleSkipForward();
                  }}
                >
                  <SkipForward className="h-full w-full" />
                </button>
              </div>

              {/* mm : ss : ff timestamp */}
              <div className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground tabular-nums" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}>
                {formatTimestamp(currentFrame, fps)}
              </div>
            </div>

            {/* Property icon buttons */}
            <div data-properties-panel="true" className="flex items-center gap-4">
              {PROPERTIES.map((p) => (
                <PropertyButton key={p.key} property={p.key} label={p.label} icon={p.icon} />
              ))}
            </div>
          </div>

          {/* Filmstrip with fixed-center playhead */}
          <ThumbnailStrip />
        </>
      ) : (
        <DrawToolbox />
      )}
    </footer>
  );
}
