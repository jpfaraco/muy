import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, Pipette } from "lucide-react";
import { HsvColorPicker, type HsvColor } from "react-colorful";
import palettesJson from "@/assets/color-palettes.json";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnimationStore } from "@/store/animationStore";
import { hexToHsl, hexToHsv, hexToRgb, hslToHex, hsvToHex, isPartialHexInput, normalizeHex, parseChannel, rgbToHex } from "@/lib/color";
import { cancelCanvasColorSample, finishCanvasColorSampleDrag, moveCanvasColorSampleDrag, startCanvasColorSampleDrag } from "@/lib/colorSampler";
import { cn } from "@/lib/utils";

type ColorFormat = "HEX" | "RGB" | "HSL" | "HSV";

interface PaletteColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

interface PalettePreset {
  id: number;
  name: string;
  colors: PaletteColor[];
  saves?: number;
}

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperConstructor {
  new (): {
    open: () => Promise<EyeDropperResult>;
  };
}

interface ColorInputProps {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: "default" | "compact";
  showValue?: boolean;
}

const palettes = palettesJson as PalettePreset[];

function selectedPalette(paletteId: number): PalettePreset {
  return palettes.find((palette) => palette.id === paletteId) ?? palettes[0];
}

function normalizeForDisplay(value: string): string {
  return normalizeHex(value) ?? "#000000";
}

function getEyeDropper(): EyeDropperConstructor | undefined {
  const candidate = (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
  return candidate;
}

function NumericInput({ value, min, max, label, onCommit }: { value: number; min: number; max: number; label: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <Input
      aria-label={label}
      inputMode="numeric"
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const parsed = parseChannel(next, min, max);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={() => setDraft(String(value))}
      className="min-w-0 text-center"
    />
  );
}

function PaletteStrip({ colors, className }: { colors: PaletteColor[]; className?: string }) {
  return (
    <div className={cn("flex overflow-hidden rounded-sm", className)}>
      {colors.map((color) => (
        <div key={color.hex} className="h-full min-w-px flex-1" style={{ background: color.hex }} />
      ))}
    </div>
  );
}

function PaletteCombobox({ paletteId, onPaletteChange }: { paletteId: number; onPaletteChange: (paletteId: number) => void }) {
  const palette = selectedPalette(paletteId);

  return (
    <Combobox
      value={palette}
      onValueChange={(p) => {
        if (p) onPaletteChange(p.id);
      }}
      items={palettes}
      itemToStringValue={(p: PalettePreset) => p.name}
    >
      <ComboboxTrigger
        render={
          <Button type="button" variant="outline" className="h-8 w-full justify-between px-2.5 font-normal">
            <span className="truncate">{palette.name}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        }
      />
      <ComboboxContent className="min-w-(--anchor-width)" initialFocus={false}>
        <ComboboxInput showTrigger={false} placeholder="Search" />
        <ComboboxEmpty>No palettes found.</ComboboxEmpty>
        <ComboboxList onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
          {(option) => (
            <ComboboxItem key={option.id} value={option} className="flex-col items-start gap-1.5 py-2 pr-1.5">
              <span className="truncate text-xs font-medium text-muted-foreground">{option.name}</span>
              <PaletteStrip colors={option.colors} className="h-5 w-full" />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function ColorInput({ value, onChange, ariaLabel = "Color", className, size = "default", showValue = true }: ColorInputProps) {
  const paletteId = useAnimationStore((state) => state.doc.paletteId);
  const setPaletteId = useAnimationStore((state) => state.setPaletteId);
  const [format, setFormat] = useState<ColorFormat>("HSV");
  const [open, setOpen] = useState(false);
  const [showSamplerHint, setShowSamplerHint] = useState(false);
  const samplerDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const samplerHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const samplerDocCleanupRef = useRef<(() => void) | null>(null);
  const hex = normalizeForDisplay(value);
  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsv = useMemo(() => hexToHsv(hex), [hex]);
  const hsl = useMemo(() => hexToHsl(hex), [hex]);
  const [hexDraft, setHexDraft] = useState(hex);
  const [canUseEyeDropper, setCanUseEyeDropper] = useState(false);
  const palette = selectedPalette(paletteId);

  useEffect(() => {
    setHexDraft(hex);
  }, [hex]);

  useEffect(() => {
    setCanUseEyeDropper(typeof window !== "undefined" && getEyeDropper() !== undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (samplerHintTimerRef.current !== null) {
        clearTimeout(samplerHintTimerRef.current);
      }
      samplerDocCleanupRef.current?.();
    };
  }, []);

  const commitHex = (next: string) => {
    const normalized = normalizeHex(next);
    if (normalized) onChange(normalized);
  };

  const handlePickerChange = (next: HsvColor) => {
    onChange(hsvToHex(next));
  };

  const handleEyeDropper = async () => {
    const EyeDropper = getEyeDropper();
    if (!EyeDropper) return;
    setOpen(false);
    try {
      const result = await new EyeDropper().open();
      commitHex(result.sRGBHex);
    } catch {
      // User canceled the browser picker.
    }
  };

  const handleSamplerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (canUseEyeDropper) return;
    event.preventDefault();
    event.stopPropagation();
    setShowSamplerHint(false);
    if (samplerHintTimerRef.current !== null) {
      clearTimeout(samplerHintTimerRef.current);
      samplerHintTimerRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    samplerDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
  };

  const handleSamplerPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (canUseEyeDropper) return;
    const drag = samplerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    if (!drag.dragging) {
      const rect = event.currentTarget.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) {
        drag.dragging = true;

        // Switch to document-level listeners before closing the popover so the
        // drag lifecycle survives the button unmounting (pointer capture is lost
        // when its element leaves the DOM).
        const dragPointerId = drag.pointerId;
        const onDocMove = (e: PointerEvent) => {
          if (e.pointerId !== dragPointerId) return;
          moveCanvasColorSampleDrag(e.clientX, e.clientY);
        };
        const onDocUp = (e: PointerEvent) => {
          if (e.pointerId !== dragPointerId) return;
          finishCanvasColorSampleDrag(e.clientX, e.clientY);
          cleanup();
        };
        const onDocCancel = (e: PointerEvent) => {
          if (e.pointerId !== dragPointerId) return;
          cancelCanvasColorSample();
          cleanup();
        };
        const cleanup = () => {
          document.removeEventListener("pointermove", onDocMove);
          document.removeEventListener("pointerup", onDocUp);
          document.removeEventListener("pointercancel", onDocCancel);
          samplerDragRef.current = null;
          samplerDocCleanupRef.current = null;
        };
        samplerDocCleanupRef.current = cleanup;
        document.addEventListener("pointermove", onDocMove);
        document.addEventListener("pointerup", onDocUp);
        document.addEventListener("pointercancel", onDocCancel);

        startCanvasColorSampleDrag((sampledHex) => onChange(sampledHex));
        setOpen(false);
      }
    }
    // Document-level handlers take over once dragging — no move dispatch here.
  };

  const handleSamplerPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (canUseEyeDropper) return;
    const drag = samplerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    samplerDragRef.current = null;

    if (drag.dragging) {
      // Document-level handlers own the drag completion — nothing to do here.
      return;
    }

    cancelCanvasColorSample();
    setShowSamplerHint(true);
    samplerHintTimerRef.current = setTimeout(() => {
      setShowSamplerHint(false);
      samplerHintTimerRef.current = null;
    }, 2000);
  };

  const handleSamplerPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (canUseEyeDropper) return;
    const drag = samplerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.dragging) {
      // Document-level handlers own the drag cancellation.
      return;
    }
    samplerDragRef.current = null;
    cancelCanvasColorSample();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" aria-label={ariaLabel} className={cn("justify-start gap-2 px-2 font-mono text-xs", size === "compact" ? "h-8 w-8 rounded-lg p-1" : "h-8", className)} />}>
        <span className="h-4 w-4 rounded-full border-border border" style={{ background: hex }} />
        {showValue && size !== "compact" ? <span>{hex}</span> : null}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start" sideOffset={8}>
        <div className="muy-color-picker relative flex flex-col gap-4">
          <HsvColorPicker color={hsv} onChange={handlePickerChange} />

          <div className="flex items-center gap-4">
            <Button type="button" variant="outline" size="default" aria-label={canUseEyeDropper ? "Sample screen color" : "Sample canvas color"} title={canUseEyeDropper ? "Sample screen color" : "Drag to sample color"} onClick={handleEyeDropper} onPointerDown={handleSamplerPointerDown} onPointerMove={handleSamplerPointerMove} onPointerUp={handleSamplerPointerUp} onPointerCancel={handleSamplerPointerCancel}>
              <TooltipProvider>
                <Tooltip open={showSamplerHint && !canUseEyeDropper}>
                  <TooltipTrigger render={<span className="flex h-full w-full items-center justify-center" />}>
                    <Pipette className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" sideOffset={8}>
                    Drag to sample color
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Button>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Select value={format} onValueChange={(v) => setFormat(v as ColorFormat)}>
                <SelectTrigger className="w-18 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="HEX">HEX</SelectItem>
                    <SelectItem value="RGB">RGB</SelectItem>
                    <SelectItem value="HSL">HSL</SelectItem>
                    <SelectItem value="HSV">HSV</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="flex min-w-0 flex-1 gap-1">
                {format === "HEX" ? (
                  <Input
                    aria-label="Hex color"
                    value={hexDraft}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (!isPartialHexInput(next)) return;
                      setHexDraft(next);
                      commitHex(next);
                    }}
                    onBlur={() => setHexDraft(hex)}
                    className="min-w-0 text-center font-mono"
                    maxLength={7}
                    placeholder="#000000"
                  />
                ) : null}

                {format === "RGB" ? (
                  <>
                    <NumericInput label="Red" value={rgb.r} min={0} max={255} onCommit={(r) => onChange(rgbToHex({ ...rgb, r }))} />
                    <NumericInput label="Green" value={rgb.g} min={0} max={255} onCommit={(g) => onChange(rgbToHex({ ...rgb, g }))} />
                    <NumericInput label="Blue" value={rgb.b} min={0} max={255} onCommit={(b) => onChange(rgbToHex({ ...rgb, b }))} />
                  </>
                ) : null}

                {format === "HSL" ? (
                  <>
                    <NumericInput label="Hue" value={hsl.h} min={0} max={360} onCommit={(h) => onChange(hslToHex({ ...hsl, h }))} />
                    <NumericInput label="Saturation" value={hsl.s} min={0} max={100} onCommit={(s) => onChange(hslToHex({ ...hsl, s }))} />
                    <NumericInput label="Lightness" value={hsl.l} min={0} max={100} onCommit={(l) => onChange(hslToHex({ ...hsl, l }))} />
                  </>
                ) : null}

                {format === "HSV" ? (
                  <>
                    <NumericInput label="Hue" value={hsv.h} min={0} max={360} onCommit={(h) => onChange(hsvToHex({ ...hsv, h }))} />
                    <NumericInput label="Saturation" value={hsv.s} min={0} max={100} onCommit={(s) => onChange(hsvToHex({ ...hsv, s }))} />
                    <NumericInput label="Value" value={hsv.v} min={0} max={100} onCommit={(v) => onChange(hsvToHex({ ...hsv, v }))} />
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Palette</Label>
            <PaletteCombobox paletteId={palette.id} onPaletteChange={setPaletteId} />
          </div>

          <div className="flex items-center justify-between gap-2">
            {palette.colors.map((color) => {
              const swatchHex = normalizeForDisplay(color.hex);
              return (
                <button
                  key={swatchHex}
                  type="button"
                  aria-label={`Use ${swatchHex}`}
                  onClick={() => {
                    onChange(swatchHex);
                    setOpen(false);
                  }}
                  className={cn("h-6 w-6 rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", swatchHex === hex ? "border-foreground" : "border-transparent")}
                  style={{ background: swatchHex }}
                />
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
