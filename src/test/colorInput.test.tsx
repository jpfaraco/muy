import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ColorInput } from '../components/ColorInput'
import { useAnimationStore } from '../store/animationStore'

describe('ColorInput', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      doc: {
        fps: 24,
        frameCount: 1,
        canvasWidth: 1920,
        canvasHeight: 1080,
        backgroundColor: '#FFFFFF',
        paletteId: 1,
        layerIds: [],
        layers: {},
        imageAssets: {},
        frames: [{}],
      },
      currentFrame: 0,
      isPlaying: false,
      drawStrokes: {},
    })
  })

  it('opens the popover and changes color from RGB input', () => {
    const onChange = vi.fn()
    render(<ColorInput value="#3B82F6" onChange={onChange} ariaLabel="Draw color" />)

    fireEvent.click(screen.getByLabelText('Draw color'))
    fireEvent.change(screen.getByLabelText('Red'), { target: { value: '255' } })

    expect(onChange).toHaveBeenCalledWith('#FF82F6')
  })

  it('switches to hex input and normalizes typed values', () => {
    const onChange = vi.fn()
    render(<ColorInput value="#000000" onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Color'))
    fireEvent.click(screen.getByRole('button', { name: 'HEX' }))
    fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#abc' } })

    expect(onChange).toHaveBeenCalledWith('#AABBCC')
  })

  it('filters palettes by name and updates document palette', () => {
    render(<ColorInput value="#000000" onChange={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Color'))
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'Cheerful Rainbow' } })

    expect(screen.getByText('Cheerful Rainbow Delight')).toBeInTheDocument()
    expect(screen.queryByText('Bright Green')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Cheerful Rainbow Delight'))
    expect(useAnimationStore.getState().doc.paletteId).toBe(3)
  })

  it('selects a swatch from the active palette', () => {
    const onChange = vi.fn()
    useAnimationStore.getState().setPaletteId(3)
    render(<ColorInput value="#000000" onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Color'))
    const popover = screen.getByText('Palette').closest('div')
    expect(popover).not.toBeNull()

    fireEvent.click(within(document.body).getByLabelText('Use #FFADAD'))
    expect(onChange).toHaveBeenCalledWith('#FFADAD')
  })
})
