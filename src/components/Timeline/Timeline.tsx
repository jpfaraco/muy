import { SkipBack, Play, Pause, SkipForward } from "lucide-react";
import { useAnimationStore } from "../../store/animationStore";
import { useInteractionStore } from "../../store/interactionStore";
import { ThumbnailStrip } from "./ThumbnailStrip";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const PLAYBACK_SPEEDS = [1, 0.5, 0.25, 0.05] as const;

function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = frame % fps;
  return [String(minutes).padStart(2, "0"), String(seconds).padStart(2, "0"), String(frames).padStart(2, "0")].join(":");
}

export function Timeline() {
  const { isPlaying, setIsPlaying, currentFrame } = useAnimationStore();
  const fps = useAnimationStore((s) => s.doc.fps);
  const frameCount = useAnimationStore((s) => s.doc.frameCount);
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame);
  const playbackSpeed = useInteractionStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useInteractionStore((s) => s.setPlaybackSpeed);

  return (
    <div className="flex shrink-0 items-center gap-4 border-t border-border bg-sidebar px-4 pb-6 pt-4">
      <div className="flex shrink-0 items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Skip to start"
            onPointerDown={(e) => {
              e.stopPropagation();
              setCurrentFrame(0);
            }}
          >
            <SkipBack />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={isPlaying ? "Pause" : "Play"}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            aria-label="Skip to end"
            onPointerDown={(e) => {
              e.stopPropagation();
              setCurrentFrame(frameCount - 1);
            }}
          >
            <SkipForward />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 w-14 items-center justify-center rounded-lg border border-border px-2.5 text-[0.8rem] font-medium tabular-nums transition-all bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50">{playbackSpeed === 1 ? "1x" : `${playbackSpeed}x`}</DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuRadioGroup value={String(playbackSpeed)} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <DropdownMenuRadioItem key={speed} value={String(speed)}>
                  {speed === 1 ? "1x" : `${speed}x`}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex h-8 items-center rounded-lg bg-background px-2 text-xs font-semibold leading-3.5 text-foreground tabular-nums whitespace-nowrap" style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}>
          {formatTimestamp(currentFrame, fps)}
        </div>
      </div>
      <ThumbnailStrip />
    </div>
  );
}
