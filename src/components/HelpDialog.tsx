import type React from "react";
import { MousePointer2, Pencil, Eraser, Crosshair, Film } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    n: "1",
    title: "Build your scene",
    body: "Import image layers via + in the Layers panel, or draw with the Pencil tool.",
  },
  {
    n: "2",
    title: "Select layers",
    body: "Tap a layer to select it; tap again to deselect. Drag the canvas with Select active to move selected layers.",
  },
  {
    n: "3",
    title: "Record a performance",
    body: "Pick the Animate tool (filmstrip). Choose a property to animate. Hit Play, then drag the widget handle to record movement in real time.",
  },
  {
    n: "4",
    title: "Review and refine",
    body: "Hit Stop, scrub the timeline. Press ⌘Z to undo a full take in one step.",
  },
];

const tools: { Icon: React.ElementType; desc: string }[] = [
  { Icon: MousePointer2, desc: "Move layers on the canvas" },
  { Icon: Pencil, desc: "Draw vector strokes" },
  { Icon: Eraser, desc: "Erase strokes" },
  { Icon: Crosshair, desc: "Set rotation pivot point" },
  { Icon: Film, desc: "Control widgets to manipulate layer properties" },
];

export function HelpDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How Muy works</DialogTitle>
          <DialogDescription className="text-xs">You manipulate layers and their properties while the timeline records your performance. Or go old school and animate frame-by-frame.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground">{s.n}</span>
              <div>
                <p className="text-sm font-medium leading-snug">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-2.5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tools</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {tools.map(({ Icon, desc }) => (
              <div key={desc} className="flex items-start gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-foreground mt-px" />
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
