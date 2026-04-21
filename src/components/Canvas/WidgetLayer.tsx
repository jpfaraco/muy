import { useInteractionStore } from '../../store/interactionStore'
import { SliderWidget } from '../widgets/SliderWidget'
import { RotationWidget } from '../widgets/RotationWidget'
import { LayerListWidget } from '../widgets/LayerListWidget'

export function WidgetLayer() {
  const floatingWidgets = useInteractionStore((s) => s.floatingWidgets)
  const layerListEntries = useInteractionStore((s) => s.layerListEntries)
  const setLayerListEntries = useInteractionStore((s) => s.setLayerListEntries)

  return (
    <div data-widget-layer-root="true" className="absolute inset-0 pointer-events-none">
      {layerListEntries !== null && (
        <LayerListWidget
          entries={layerListEntries}
          onDismiss={() => setLayerListEntries(null)}
        />
      )}

      {floatingWidgets.map((widget) => {
        if (widget.type === 'rotation') {
          return <RotationWidget key={widget.id} widget={widget} />
        }
        return <SliderWidget key={widget.id} widget={widget} />
      })}
    </div>
  )
}
