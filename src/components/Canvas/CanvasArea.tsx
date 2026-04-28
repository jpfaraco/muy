import { AnimationCanvas } from "./AnimationCanvas";
import { DrawingLayer } from "./DrawingLayer";
import { TextEditOverlay } from "./TextEditOverlay";
import { WidgetLayer } from "./WidgetLayer";
import { Toolbox } from "../Toolbar/Toolbox";
import { ToolOptions } from "../Toolbar/ToolOptions";
import { useAnimationStore } from "../../store/animationStore";
import { useCanvasTransform } from "../../hooks/useCanvasTransform";
import { useInteractionStore } from "../../store/interactionStore";

export function CanvasArea() {
  const canvasWidth = useAnimationStore((s) => s.doc.canvasWidth);
  const canvasHeight = useAnimationStore((s) => s.doc.canvasHeight);
  const activeTool = useInteractionStore((s) => s.activeTool);
  const { zoom, panX, panY, containerRef } = useCanvasTransform(canvasWidth, canvasHeight);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{
        cursor: activeTool === 'hand' ? 'grab' : undefined,
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
        <TextEditOverlay />
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

      {/* Floating toolbar — bottom-center */}
      <div data-canvas-gesture-ignore className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <ToolOptions />
        <div className="pointer-events-auto">
          <Toolbox />
        </div>
      </div>

    </div>
  );
}
