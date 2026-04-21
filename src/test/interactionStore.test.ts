import { describe, it, expect, beforeEach } from 'vitest'
import { useInteractionStore, propertyToWidgetType } from '../store/interactionStore'

describe('interactionStore', () => {
  beforeEach(() => {
    useInteractionStore.setState({
      heldLayerIds: [],
      layerListEntries: null,
      floatingWidgets: [],
      canvasDragActive: false,
      liveLayerProps: {},
    })
  })

  describe('layer holding', () => {
    it('holdLayer adds a layer id', () => {
      useInteractionStore.getState().holdLayer('layer-a')
      expect(useInteractionStore.getState().heldLayerIds).toContain('layer-a')
    })

    it('holdLayer does not duplicate', () => {
      useInteractionStore.getState().holdLayer('layer-a')
      useInteractionStore.getState().holdLayer('layer-a')
      expect(useInteractionStore.getState().heldLayerIds).toHaveLength(1)
    })

    it('releaseLayer removes a layer id', () => {
      useInteractionStore.getState().holdLayer('layer-a')
      useInteractionStore.getState().holdLayer('layer-b')
      useInteractionStore.getState().releaseLayer('layer-a')
      expect(useInteractionStore.getState().heldLayerIds).not.toContain('layer-a')
      expect(useInteractionStore.getState().heldLayerIds).toContain('layer-b')
    })

    it('releaseAllLayers clears everything', () => {
      useInteractionStore.getState().holdLayer('layer-a')
      useInteractionStore.getState().holdLayer('layer-b')
      useInteractionStore.getState().releaseAllLayers()
      expect(useInteractionStore.getState().heldLayerIds).toHaveLength(0)
    })
  })

  describe('widgets', () => {
    it('addWidget returns an id and appends a widget', () => {
      const id = useInteractionStore.getState().addWidget({
        type: 'slider-h',
        property: 'x',
        position: { x: 100, y: 200 },
      })
      const widgets = useInteractionStore.getState().floatingWidgets
      expect(widgets).toHaveLength(1)
      expect(widgets[0].id).toBe(id)
      expect(widgets[0].property).toBe('x')
    })

    it('removeWidget removes by id', () => {
      const id = useInteractionStore.getState().addWidget({
        type: 'slider-h',
        property: 'x',
        position: { x: 0, y: 0 },
      })
      useInteractionStore.getState().removeWidget(id)
      expect(useInteractionStore.getState().floatingWidgets).toHaveLength(0)
    })

    it('dismissWidget sets isDismissing', () => {
      const id = useInteractionStore.getState().addWidget({
        type: 'slider-h',
        property: 'x',
        position: { x: 0, y: 0 },
      })
      useInteractionStore.getState().dismissWidget(id)
      const widget = useInteractionStore.getState().floatingWidgets.find((w) => w.id === id)
      expect(widget?.isDismissing).toBe(true)
    })

    it('updateWidgetPosition updates position immutably', () => {
      const id = useInteractionStore.getState().addWidget({
        type: 'slider-h',
        property: 'x',
        position: { x: 0, y: 0 },
      })
      useInteractionStore.getState().updateWidgetPosition(id, { x: 300, y: 400 }, { x: 10, y: 0 })
      const widget = useInteractionStore.getState().floatingWidgets.find((w) => w.id === id)
      expect(widget?.position).toEqual({ x: 300, y: 400 })
    })
  })

  describe('layer list', () => {
    it('setLayerListEntries sets entries', () => {
      useInteractionStore.getState().setLayerListEntries([{ layerId: 'a', sensitivity: 100 }])
      expect(useInteractionStore.getState().layerListEntries).toHaveLength(1)
    })

    it('addLayerToList appends a new layer', () => {
      useInteractionStore.getState().setLayerListEntries([{ layerId: 'a', sensitivity: 100 }])
      useInteractionStore.getState().addLayerToList('b')
      const entries = useInteractionStore.getState().layerListEntries
      expect(entries).toHaveLength(2)
      expect(entries?.[1].layerId).toBe('b')
      expect(entries?.[1].sensitivity).toBe(100)
    })

    it('addLayerToList does not duplicate', () => {
      useInteractionStore.getState().setLayerListEntries([{ layerId: 'a', sensitivity: 100 }])
      useInteractionStore.getState().addLayerToList('a')
      expect(useInteractionStore.getState().layerListEntries).toHaveLength(1)
    })

    it('setLayerSensitivity updates only the matching layer', () => {
      useInteractionStore.getState().setLayerListEntries([
        { layerId: 'a', sensitivity: 100 },
        { layerId: 'b', sensitivity: 100 },
      ])
      useInteractionStore.getState().setLayerSensitivity('a', 50)
      const entries = useInteractionStore.getState().layerListEntries!
      expect(entries.find((e) => e.layerId === 'a')?.sensitivity).toBe(50)
      expect(entries.find((e) => e.layerId === 'b')?.sensitivity).toBe(100)
    })
  })

  describe('getEffectiveHeldLayers', () => {
    it('returns heldLayerIds when no list widget', () => {
      useInteractionStore.getState().holdLayer('a')
      expect(useInteractionStore.getState().getEffectiveHeldLayers()).toEqual(['a'])
    })

    it('returns list entries when list widget is active', () => {
      useInteractionStore.getState().holdLayer('a')
      useInteractionStore.getState().setLayerListEntries([
        { layerId: 'b', sensitivity: 100 },
        { layerId: 'c', sensitivity: 50 },
      ])
      expect(useInteractionStore.getState().getEffectiveHeldLayers()).toEqual(['b', 'c'])
    })
  })

  describe('liveLayerProps', () => {
    it('setLiveLayerProps merges partial overrides immutably', () => {
      useInteractionStore.getState().setLiveLayerProps([
        { layerId: 'a', props: { x: 10 } },
      ])
      const before = useInteractionStore.getState().liveLayerProps

      useInteractionStore.getState().setLiveLayerProps([
        { layerId: 'a', props: { y: 20 } },
      ])

      const after = useInteractionStore.getState().liveLayerProps
      expect(after).not.toBe(before)
      expect(after.a).toEqual({ x: 10, y: 20 })
    })

    it('clearLiveLayerProps removes only the requested properties', () => {
      useInteractionStore.getState().setLiveLayerProps([
        { layerId: 'a', props: { x: 10, y: 20, rotation: 30 } },
      ])

      useInteractionStore.getState().clearLiveLayerProps(['a'], ['x', 'y'])

      expect(useInteractionStore.getState().liveLayerProps.a).toEqual({ rotation: 30 })
    })

    it('clearLiveLayerProps removes the layer entry when no overrides remain', () => {
      useInteractionStore.getState().setLiveLayerProps([
        { layerId: 'a', props: { x: 10 } },
      ])

      useInteractionStore.getState().clearLiveLayerProps(['a'], ['x'])

      expect(useInteractionStore.getState().liveLayerProps.a).toBeUndefined()
    })
  })
})

describe('propertyToWidgetType', () => {
  it('maps y to slider-v', () => {
    expect(propertyToWidgetType('y')).toBe('slider-v')
  })
  it('maps rotation to rotation', () => {
    expect(propertyToWidgetType('rotation')).toBe('rotation')
  })
  it('maps x, scale, transparency to slider-h', () => {
    expect(propertyToWidgetType('x')).toBe('slider-h')
    expect(propertyToWidgetType('scale')).toBe('slider-h')
    expect(propertyToWidgetType('transparency')).toBe('slider-h')
  })
})
