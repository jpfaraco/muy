import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Scrubber } from '../components/ui/Scrubber'

function pointerDown(el: Element, x: number) {
  fireEvent.pointerDown(el, { clientX: x, pointerId: 1 })
}
function pointerMove(el: Element, x: number) {
  fireEvent.pointerMove(el, { clientX: x, pointerId: 1 })
}
function pointerUp(el: Element, x: number) {
  fireEvent.pointerUp(el, { clientX: x, pointerId: 1 })
}

describe('Scrubber', () => {
  const noop = () => {}

  describe('rendering', () => {
    it('displays value with correct decimals', () => {
      render(<Scrubber value={1.5} onChange={noop} decimals={2} />)
      expect(screen.getByText('1.50')).toBeTruthy()
    })

    it('displays integer value with 0 decimals', () => {
      render(<Scrubber value={42} onChange={noop} decimals={0} />)
      expect(screen.getByText('42')).toBeTruthy()
    })

    it('uses formatValue override when provided', () => {
      render(<Scrubber value={0.75} onChange={noop} formatValue={(v) => `${Math.round(v * 100)}%`} />)
      expect(screen.getByText('75%')).toBeTruthy()
    })
  })

  describe('dragging', () => {
    it('calls onChange with correct value on drag', () => {
      const onChange = vi.fn()
      render(<Scrubber value={10} onChange={onChange} step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 9) // 9px / 3px per step * 1 = 3
      expect(onChange).toHaveBeenLastCalledWith(13)
    })

    it('calls onChange with decimal step', () => {
      const onChange = vi.fn()
      render(<Scrubber value={1} onChange={onChange} step={0.01} decimals={2} pixelsPerStep={3} min={0} max={5} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 6) // 6px / 3px per step * 0.01 = 0.02
      expect(onChange).toHaveBeenLastCalledWith(1.02)
    })

    it('clamps to max', () => {
      const onChange = vi.fn()
      render(<Scrubber value={98} onChange={onChange} step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 999)
      expect(onChange).toHaveBeenLastCalledWith(100)
    })

    it('clamps to min', () => {
      const onChange = vi.fn()
      render(<Scrubber value={2} onChange={onChange} step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, -999)
      expect(onChange).toHaveBeenLastCalledWith(0)
    })

    it('snaps to step grid', () => {
      const onChange = vi.fn()
      render(<Scrubber value={0} onChange={onChange} step={5} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 10) // raw = 10/3*5 ≈ 16.67 → snapped to 15
      expect(onChange).toHaveBeenLastCalledWith(15)
    })

    it('fires onDragStart once per drag', () => {
      const onDragStart = vi.fn()
      render(<Scrubber value={10} onChange={noop} onDragStart={onDragStart} step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 15)
      pointerMove(inner, 30)
      pointerUp(inner, 30)
      expect(onDragStart).toHaveBeenCalledTimes(1)
    })

    it('fires onDragEnd once per drag', () => {
      const onDragEnd = vi.fn()
      render(<Scrubber value={10} onChange={noop} onDragEnd={onDragEnd} step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 15)
      pointerUp(inner, 15)
      expect(onDragEnd).toHaveBeenCalledTimes(1)
    })

    it('does not fire onDragEnd on tap (no move)', () => {
      const onDragEnd = vi.fn()
      render(<Scrubber value={10} onChange={noop} onDragEnd={onDragEnd} step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerUp(inner, 0)
      expect(onDragEnd).not.toHaveBeenCalled()
    })

    it('does not call onChange when movement is below step boundary', () => {
      const onChange = vi.fn()
      render(<Scrubber value={10} onChange={onChange} step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 1) // 1px / 3px per step = 0.33 → rounds to 0, no change
      pointerUp(inner, 1)
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('chevrons', () => {
    it('increments by step on right chevron click', () => {
      const onChange = vi.fn()
      render(<Scrubber value={10} onChange={onChange} step={1} min={0} max={100} />)
      fireEvent.pointerDown(screen.getByLabelText('Increase'))
      expect(onChange).toHaveBeenCalledWith(11)
    })

    it('decrements by step on left chevron click', () => {
      const onChange = vi.fn()
      render(<Scrubber value={10} onChange={onChange} step={1} min={0} max={100} />)
      fireEvent.pointerDown(screen.getByLabelText('Decrease'))
      expect(onChange).toHaveBeenCalledWith(9)
    })

    it('does not go below min on left chevron', () => {
      const onChange = vi.fn()
      render(<Scrubber value={0} onChange={onChange} step={1} min={0} max={100} />)
      fireEvent.pointerDown(screen.getByLabelText('Decrease'))
      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not go above max on right chevron', () => {
      const onChange = vi.fn()
      render(<Scrubber value={100} onChange={onChange} step={1} min={0} max={100} />)
      fireEvent.pointerDown(screen.getByLabelText('Increase'))
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('keyboard', () => {
    it('increments on ArrowRight', () => {
      const onChange = vi.fn()
      render(<Scrubber value={10} onChange={onChange} step={2} min={0} max={100} />)
      fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'ArrowRight' })
      expect(onChange).toHaveBeenCalledWith(12)
    })

    it('decrements on ArrowLeft', () => {
      const onChange = vi.fn()
      render(<Scrubber value={10} onChange={onChange} step={2} min={0} max={100} />)
      fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'ArrowLeft' })
      expect(onChange).toHaveBeenCalledWith(8)
    })
  })

  describe('disabled', () => {
    it('does not call onChange when disabled', () => {
      const onChange = vi.fn()
      render(<Scrubber value={10} onChange={onChange} disabled step={1} pixelsPerStep={3} min={0} max={100} />)
      const inner = screen.getByTestId('scrubber-track')
      pointerDown(inner, 0)
      pointerMove(inner, 30)
      expect(onChange).not.toHaveBeenCalled()
    })
  })
})
