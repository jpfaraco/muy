import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAnimationStore } from "../store/animationStore";
import { cn } from "@/lib/utils";
import { framesToTimecode, timecodeToFrames, formatTimecodeInput } from "@/lib/timecode";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESETS = [
  { label: "1920 × 1080 (16:9)", description: "Widescreen HD", width: 1920, height: 1080 },
  { label: "3840 × 2160 (16:9)", description: "4K Ultra HD", width: 3840, height: 2160 },
  { label: "1080 × 1920 (9:16)", description: "TikTok, Instagram Reels, YouTube Shorts, Snapchat", width: 1080, height: 1920 },
  { label: "1080 × 1350 (4:5)", description: "Taller Instagram Feed posts", width: 1080, height: 1350 },
  { label: "1080 × 1080 (1:1)", description: "Square Instagram Feed posts, Facebook, LinkedIn", width: 1080, height: 1080 },
  { label: "1200 × 1500 (4:5)", description: "Facebook Feed ads", width: 1200, height: 1500 },
] as const;

type Preset = (typeof PRESETS)[number];

function findPreset(w: string, h: string): Preset | null {
  const wn = parseInt(w, 10);
  const hn = parseInt(h, 10);
  return PRESETS.find((p) => p.width === wn && p.height === hn) ?? null;
}

export function CanvasSettingsDialog({ open, onOpenChange }: Props) {
  const canvasWidth = useAnimationStore((s) => s.doc.canvasWidth);
  const canvasHeight = useAnimationStore((s) => s.doc.canvasHeight);
  const backgroundColor = useAnimationStore((s) => s.doc.backgroundColor);
  const frameCount = useAnimationStore((s) => s.doc.frameCount);
  const fps = useAnimationStore((s) => s.doc.fps);
  const setCanvasSettings = useAnimationStore((s) => s.setCanvasSettings);
  const setTimelineLength = useAnimationStore((s) => s.setTimelineLength);

  const [width, setWidth] = useState(String(canvasWidth));
  const [height, setHeight] = useState(String(canvasHeight));
  const [color, setColor] = useState(backgroundColor);
  const [timeline, setTimeline] = useState(framesToTimecode(frameCount, fps));
  const [presetOpen, setPresetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>();

  useEffect(() => {
    if (open) {
      setWidth(String(canvasWidth));
      setHeight(String(canvasHeight));
      setColor(backgroundColor);
      setTimeline(framesToTimecode(frameCount, fps));
    }
  }, [open, canvasWidth, canvasHeight, backgroundColor, frameCount, fps]);

  const activePreset = findPreset(width, height);

  const handlePresetOpenChange = (open: boolean) => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
    setPresetOpen(open);
  };

  const handleSelectPreset = (preset: Preset) => {
    setWidth(String(preset.width));
    setHeight(String(preset.height));
    setPresetOpen(false);
  };

  const handleApply = () => {
    const w = Math.max(1, Math.min(4096, parseInt(width, 10) || canvasWidth));
    const h = Math.max(1, Math.min(4096, parseInt(height, 10) || canvasHeight));
    setCanvasSettings(w, h, color);
    const parsedFrames = timecodeToFrames(timeline, fps);
    if (parsedFrames !== null && parsedFrames >= 1) {
      setTimelineLength(parsedFrames);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Canvas settings</DialogTitle>
          <DialogDescription>Set the canvas dimensions and background color.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <Label>Preset</Label>
            <Popover open={presetOpen} onOpenChange={handlePresetOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  ref={triggerRef}
                  variant="outline"
                  role="combobox"
                  aria-expanded={presetOpen}
                  className="w-full justify-between font-normal"
                >
                  <span>{activePreset?.label ?? "Custom"}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-1" style={{ width: triggerWidth }} align="start">
                {PRESETS.map((preset) => {
                  const isSelected = activePreset?.label === preset.label;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded px-2 py-2 text-sm hover:bg-accent",
                        isSelected && "bg-accent",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="text-left">
                        <div className="font-medium leading-snug">{preset.label}</div>
                        <div className="text-xs text-muted-foreground leading-snug">{preset.description}</div>
                      </div>
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="canvas-width">Width</Label>
              <Input
                id="canvas-width"
                type="number"
                min={1}
                max={4096}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="canvas-height">Height</Label>
              <Input
                id="canvas-height"
                type="number"
                min={1}
                max={4096}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <Label htmlFor="timeline-length">Timeline length</Label>
            <Input
              id="timeline-length"
              inputMode="numeric"
              placeholder="00:10:00"
              className="font-mono"
              value={timeline}
              onChange={(e) => setTimeline(formatTimecodeInput(e.target.value))}
            />
            <span className="text-xs text-muted-foreground">mm:ss:ff at {fps} fps</span>
          </Field>

          <Field>
            <Label htmlFor="canvas-bg-text">Background color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="canvas-bg-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 shrink-0 cursor-pointer px-1 py-0.5"
              />
              <Input
                id="canvas-bg-text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono"
                maxLength={7}
                placeholder="#000000"
              />
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
