import { describe, expect, it } from 'vitest'
import {
  hexToHsl,
  hexToHsv,
  hexToRgb,
  hslToHex,
  hsvToHex,
  isPartialHexInput,
  normalizeHex,
  rgbToHex,
} from '../lib/color'

describe('color utilities', () => {
  it('normalizes long and short hex values', () => {
    expect(normalizeHex('#3b82f6')).toBe('#3B82F6')
    expect(normalizeHex('abc')).toBe('#AABBCC')
  })

  it('rejects invalid hex values', () => {
    expect(normalizeHex('#12')).toBeNull()
    expect(normalizeHex('#zzzzzz')).toBeNull()
  })

  it('accepts partial hex input while typing', () => {
    expect(isPartialHexInput('#3B8')).toBe(true)
    expect(isPartialHexInput('#3B82FG')).toBe(false)
  })

  it('converts between hex and RGB', () => {
    expect(hexToRgb('#3B82F6')).toEqual({ r: 59, g: 130, b: 246 })
    expect(rgbToHex({ r: 59, g: 130, b: 246 })).toBe('#3B82F6')
  })

  it('converts between hex and HSV', () => {
    const hsv = hexToHsv('#3B82F6')
    expect(hsv).toEqual({ h: 217, s: 76, v: 96 })
    expect(hsvToHex(hsv)).toBe('#3B82F5')
  })

  it('converts between hex and HSL', () => {
    const hsl = hexToHsl('#3B82F6')
    expect(hsl).toEqual({ h: 217, s: 91, l: 60 })
    expect(hslToHex(hsl)).toBe('#3C83F6')
  })
})
