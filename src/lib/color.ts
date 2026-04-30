export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HsvColor {
  h: number
  s: number
  v: number
}

export interface HslColor {
  h: number
  s: number
  l: number
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value)
}

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim()
  const match = HEX_RE.exec(trimmed)
  if (!match) return null

  const raw = match[1]
  const expanded =
    raw.length === 3
      ? raw
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : raw

  return `#${expanded.toUpperCase()}`
}

export function isPartialHexInput(input: string): boolean {
  return /^#?[0-9a-f]{0,6}$/i.test(input.trim())
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b]
    .map((channel) => clamp(round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex) ?? '#000000'
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const rn = clamp(r, 0, 255) / 255
  const gn = clamp(g, 0, 255) / 255
  const bn = clamp(b, 0, 255) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return {
    h: round(h),
    s: max === 0 ? 0 : round((delta / max) * 100),
    v: round(max * 100),
  }
}

export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 100) / 100
  const val = clamp(v, 0, 100) / 100
  const c = val * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = val - c

  let rn = 0
  let gn = 0
  let bn = 0
  if (hue < 60) [rn, gn, bn] = [c, x, 0]
  else if (hue < 120) [rn, gn, bn] = [x, c, 0]
  else if (hue < 180) [rn, gn, bn] = [0, c, x]
  else if (hue < 240) [rn, gn, bn] = [0, x, c]
  else if (hue < 300) [rn, gn, bn] = [x, 0, c]
  else [rn, gn, bn] = [c, 0, x]

  return {
    r: round((rn + m) * 255),
    g: round((gn + m) * 255),
    b: round((bn + m) * 255),
  }
}

export function hexToHsv(hex: string): HsvColor {
  return rgbToHsv(hexToRgb(hex))
}

export function hsvToHex(hsv: HsvColor): string {
  return rgbToHex(hsvToRgb(hsv))
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = clamp(r, 0, 255) / 255
  const gn = clamp(g, 0, 255) / 255
  const bn = clamp(b, 0, 255) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return { h: round(h), s: round(s * 100), l: round(l * 100) }
}

export function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 100) / 100
  const light = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2

  let rn = 0
  let gn = 0
  let bn = 0
  if (hue < 60) [rn, gn, bn] = [c, x, 0]
  else if (hue < 120) [rn, gn, bn] = [x, c, 0]
  else if (hue < 180) [rn, gn, bn] = [0, c, x]
  else if (hue < 240) [rn, gn, bn] = [0, x, c]
  else if (hue < 300) [rn, gn, bn] = [x, 0, c]
  else [rn, gn, bn] = [c, 0, x]

  return {
    r: round((rn + m) * 255),
    g: round((gn + m) * 255),
    b: round((bn + m) * 255),
  }
}

export function hexToHsl(hex: string): HslColor {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(hsl: HslColor): string {
  return rgbToHex(hslToRgb(hsl))
}

export function parseChannel(value: string, min: number, max: number): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null
  return clamp(parseInt(value, 10), min, max)
}
