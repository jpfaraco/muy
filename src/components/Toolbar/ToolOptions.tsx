import { useState, useRef, useEffect } from "react";
import { ColorInput } from "@/components/ColorInput";
import { Scrubber } from "@/components/ui/Scrubber";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoveHorizontal, MoveVertical, RotateCw, Scaling, Blend, Eye } from "lucide-react";
import { useAnimationStore } from "../../store/animationStore";
import { useInteractionStore } from "../../store/interactionStore";
import { useCanvasViewStore } from "../../store/canvasViewStore";
import { PropertyButton } from "../LeftPanel/PropertyButton";
import type { PropertyKey } from "../../types/animation";
import { computeStrokeBounds } from "../../utils/strokeBounds";
import { CURATED_FONTS } from "../../constants/fonts";
import { prefetchAllFonts, loadFont } from "../../utils/loadFonts";

const PROPERTIES: Array<{ key: PropertyKey; label: string; icon: React.ElementType }> = [
  { key: "x", label: "Move X", icon: MoveHorizontal },
  { key: "y", label: "Move Y", icon: MoveVertical },
  { key: "rotation", label: "Rotate", icon: RotateCw },
  { key: "scale", label: "Scale", icon: Scaling },
  { key: "transparency", label: "Alpha", icon: Blend },
  { key: "progress", label: "Reveal", icon: Eye },
];

function useScrubberPreview() {
  const [showPreview, setShowPreview] = useState(false);
  const lingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (lingerTimer.current !== null) clearTimeout(lingerTimer.current);
    },
    [],
  );

  const onChangeStart = () => {
    if (lingerTimer.current !== null) clearTimeout(lingerTimer.current);
    setShowPreview(true);
  };
  const onChangeEnd = () => {
    lingerTimer.current = setTimeout(() => setShowPreview(false), 400);
  };

  return { showPreview, onChangeStart, onChangeEnd };
}

function StrokeWidthPreview({ value, visible, color, variant, zoom }: { value: number; visible: boolean; color?: string; variant: "pencil" | "eraser"; zoom: number }) {
  if (!visible) return null;

  const size = Math.max(8, value * zoom);
  const svgPad = 4;
  const svgSize = size + svgPad * 2;
  const svgCx = svgSize / 2;
  const svgR = size / 2;

  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{
        bottom: "calc(100% + 8px)",
        filter: "drop-shadow(0px 2px 6px rgba(0,0,0,0.45))",
      }}
    >
      {variant === "pencil" ? (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            background: color,
          }}
        />
      ) : (
        <svg width={svgSize} height={svgSize} style={{ display: "block" }}>
          <circle cx={svgCx} cy={svgCx} r={svgR} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth={3} />
          <circle cx={svgCx} cy={svgCx} r={svgR} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
}

function PencilOptions() {
  const drawColor = useInteractionStore((s) => s.drawColor);
  const pencilWidth = useInteractionStore((s) => s.pencilWidth);
  const pencilSmoothing = useInteractionStore((s) => s.pencilSmoothing);
  const setDrawColor = useInteractionStore((s) => s.setDrawColor);
  const setPencilWidth = useInteractionStore((s) => s.setPencilWidth);
  const setPencilSmoothing = useInteractionStore((s) => s.setPencilSmoothing);
  const zoom = useCanvasViewStore((s) => s.zoom);

  const widthPreview = useScrubberPreview();
  const smoothingPreview = useScrubberPreview();

  return (
    <div className="flex items-center gap-4">
      {/* Color picker */}
      <div className="flex items-center gap-2">
        <ColorInput value={drawColor} onChange={setDrawColor} ariaLabel="Draw color" />
      </div>

      <div className="h-6 w-px shrink-0 bg-border" />

      {/* Width scrubber */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Size</span>
        <div className="relative">
          <StrokeWidthPreview value={pencilWidth} visible={widthPreview.showPreview} color={drawColor} variant="pencil" zoom={zoom} />
          <Scrubber value={pencilWidth} onChange={setPencilWidth} min={1} max={128} step={1} decimals={0} size="md" width={56} ariaLabel="Stroke width" onChangeStart={widthPreview.onChangeStart} onChangeEnd={widthPreview.onChangeEnd} />
        </div>
      </div>

      <div className="h-6 w-px shrink-0 bg-border" />

      {/* Smoothness scrubber */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Smooth</span>
        <Scrubber value={pencilSmoothing} onChange={setPencilSmoothing} min={0} max={100} step={1} decimals={0} size="md" width={56} ariaLabel="Stroke smoothing" onChangeStart={smoothingPreview.onChangeStart} onChangeEnd={smoothingPreview.onChangeEnd} />
      </div>
    </div>
  );
}

function EraserOptions() {
  const eraserWidth = useInteractionStore((s) => s.eraserWidth);
  const setEraserWidth = useInteractionStore((s) => s.setEraserWidth);
  const zoom = useCanvasViewStore((s) => s.zoom);

  const widthPreview = useScrubberPreview();

  return (
    <div className="flex items-center gap-4">
      {/* Width scrubber */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Size</span>
        <div className="relative">
          <StrokeWidthPreview value={eraserWidth} visible={widthPreview.showPreview} variant="eraser" zoom={zoom} />
          <Scrubber value={eraserWidth} onChange={setEraserWidth} min={1} max={256} step={1} decimals={0} size="md" width={56} ariaLabel="Eraser size" onChangeStart={widthPreview.onChangeStart} onChangeEnd={widthPreview.onChangeEnd} />
        </div>
      </div>
    </div>
  );
}

function PivotOptions() {
  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds);
  const layers = useAnimationStore((s) => s.doc.layers);
  const drawStrokes = useAnimationStore((s) => s.drawStrokes);
  const setLayerPivot = useAnimationStore((s) => s.setLayerPivot);

  const targetLayerId = heldLayerIds[0] ?? null;
  const targetLayer = targetLayerId ? layers[targetLayerId] : null;
  const isVectorHeld = targetLayer?.layerType === "vector";

  function handleAutoCenter() {
    if (!targetLayerId) return;
    const strokes = drawStrokes[targetLayerId] ?? [];
    const bounds = computeStrokeBounds(strokes);
    if (!bounds) return;
    setLayerPivot(targetLayerId, (bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
  }

  return (
    <button onClick={handleAutoCenter} disabled={!isVectorHeld} className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
      Auto center
    </button>
  );
}

function TextOptions() {
  const textColor = useInteractionStore((s) => s.textColor);
  const textSize = useInteractionStore((s) => s.textSize);
  const textFontFamily = useInteractionStore((s) => s.textFontFamily);
  const setTextColor = useInteractionStore((s) => s.setTextColor);
  const setTextSize = useInteractionStore((s) => s.setTextSize);
  const setTextFontFamily = useInteractionStore((s) => s.setTextFontFamily);

  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds);
  const layers = useAnimationStore((s) => s.doc.layers);
  const updateTextStyle = useAnimationStore((s) => s.updateTextStyle);

  // If a text layer is held, sync UI and write-through on change
  const heldTextLayerId = heldLayerIds.find((id) => layers[id]?.layerType === "text") ?? null;
  const heldText = heldTextLayerId ? layers[heldTextLayerId]?.text : null;

  const displayColor = heldText?.color ?? textColor;
  const displaySize = heldText?.fontSize ?? textSize;
  const displayFamily = heldText?.fontFamily ?? textFontFamily;

  function handleColorChange(color: string) {
    setTextColor(color);
    if (heldTextLayerId) updateTextStyle(heldTextLayerId, { color });
  }

  function handleSizeChange(size: number) {
    setTextSize(size);
    if (heldTextLayerId) updateTextStyle(heldTextLayerId, { fontSize: size });
  }

  function handleFontChange(family: string | null) {
    if (!family) return;
    loadFont(family);
    setTextFontFamily(family);
    if (heldTextLayerId) updateTextStyle(heldTextLayerId, { fontFamily: family });
  }

  return (
    <div className="flex items-center gap-4">
      {/* Color */}
      <div className="flex items-center gap-2">
        <ColorInput value={displayColor} onChange={handleColorChange} ariaLabel="Text color" />
      </div>

      <div className="h-6 w-px shrink-0 bg-border" />

      {/* Size */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Size</span>
        <Scrubber value={displaySize} onChange={handleSizeChange} min={8} max={300} step={1} decimals={0} size="md" width={50} ariaLabel="Font size" />
      </div>

      <div className="h-6 w-px shrink-0 bg-border" />

      {/* Font family */}
      <Select
        value={displayFamily}
        onValueChange={handleFontChange}
        onOpenChange={(open) => {
          if (open) prefetchAllFonts();
        }}
      >
        <SelectTrigger aria-label="Font family" className="w-50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {CURATED_FONTS.map(({ family }) => (
              <SelectItem key={family} value={family}>
                <span style={{ fontFamily: family }}>{family}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function AnimateOptions() {
  return (
    <div data-properties-panel="true" className="flex items-center gap-4">
      {PROPERTIES.map((p) => (
        <PropertyButton key={p.key} property={p.key} label={p.label} icon={p.icon} />
      ))}
    </div>
  );
}

export function ToolOptions() {
  const activeTool = useInteractionStore((s) => s.activeTool);

  if (activeTool === "select" || activeTool === "hand") return null;

  if (activeTool === "animate") {
    return (
      <div className="pointer-events-auto rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <AnimateOptions />
      </div>
    );
  }

  const inner = activeTool === "pencil" ? <PencilOptions /> : activeTool === "eraser" ? <EraserOptions /> : activeTool === "text" ? <TextOptions /> : <PivotOptions />;

  if (!inner) return null;

  return <div className="pointer-events-auto rounded-xl border border-border bg-card p-3 shadow-lg">{inner}</div>;
}
