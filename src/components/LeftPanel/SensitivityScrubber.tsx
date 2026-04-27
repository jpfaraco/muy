import { captureHistoryEntry, useAnimationStore } from '../../store/animationStore'
import { Scrubber } from '@/components/ui/Scrubber'

interface Props {
  layerId: string
  value: number
}

export function SensitivityScrubber({ layerId, value }: Props) {
  const setLayerSensitivity = useAnimationStore((s) => s.setLayerSensitivity)

  return (
    <Scrubber
      value={value}
      onChange={(v) => setLayerSensitivity(layerId, v)}
      step={0.01}
      decimals={2}
      pixelsPerStep={3}
      size="sm"
      ariaLabel="Layer sensitivity"
      onDragStart={() => {
        captureHistoryEntry()
        useAnimationStore.temporal.getState().pause()
      }}
      onDragEnd={() => useAnimationStore.temporal.getState().resume()}
    />
  )
}
