import { ChevronDown } from "lucide-react";
import { AnimationCanvas } from "./AnimationCanvas";
import { DrawingLayer } from "./DrawingLayer";
import { WidgetLayer } from "./WidgetLayer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAnimationStore } from "../../store/animationStore";
import { useCanvasTransform } from "../../hooks/useCanvasTransform";

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 4] as const;

export function CanvasArea() {
  const canvasWidth = useAnimationStore((s) => s.doc.canvasWidth);
  const canvasHeight = useAnimationStore((s) => s.doc.canvasHeight);
  const { zoom, panX, panY, containerRef, setZoomPreset, fit } = useCanvasTransform(canvasWidth, canvasHeight);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{
        backgroundColor: "hsl(var(--muted))",
        backgroundImage: "radial-gradient(circle, rgba(128,128,128,0.2) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* Canvas — fixed pixel dimensions, centered, with zoom/pan transform */}
      <div
        className="absolute"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          left: "50%",
          top: "50%",
          marginLeft: -canvasWidth / 2,
          marginTop: -canvasHeight / 2,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <AnimationCanvas />
        <DrawingLayer />
      </div>

      {/* Canvas bounds outline — sibling after canvas so it renders above all layer content */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          left: "50%",
          top: "50%",
          marginLeft: -canvasWidth / 2,
          marginTop: -canvasHeight / 2,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "center center",
          boxShadow: "0 0 0 1px rgba(0,0,0,1), 0 0 0 2px rgba(255,255,255,0.5)",
        }}
      />

      {/* Widget overlay (animate mode floating widgets) */}
      <WidgetLayer />

      {/* Zoom selector — top-right */}
      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 bg-card px-4 text-foreground shadow-md">
              {Math.round(zoom * 100)}%
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ZOOM_PRESETS.map((level) => (
              <DropdownMenuItem key={level} className={zoom === level ? "bg-accent" : ""} onClick={() => setZoomPreset(level)}>
                {Math.round(level * 100)}%
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={fit}>Fit</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
