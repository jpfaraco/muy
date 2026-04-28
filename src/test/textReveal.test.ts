import { describe, it, expect } from 'vitest'
import { visibleText } from '../utils/textReveal'

describe('visibleText', () => {
  it('returns empty string for empty content regardless of progress', () => {
    expect(visibleText('', 0)).toBe('')
    expect(visibleText('', 0.5)).toBe('')
    expect(visibleText('', 1)).toBe('')
  })

  it('returns empty string at progress 0', () => {
    expect(visibleText('Hello', 0)).toBe('')
  })

  it('returns full string at progress 1', () => {
    expect(visibleText('Hello', 1)).toBe('Hello')
  })

  it('returns half string at progress 0.5 (rounds correctly)', () => {
    // 'Hello' = 5 chars; round(5 * 0.5) = round(2.5) = 3 (Math.round rounds .5 up)
    expect(visibleText('Hello', 0.5)).toBe('Hel')
  })

  it('rounds to nearest character', () => {
    const str = '1234567890' // 10 chars
    expect(visibleText(str, 0.35)).toBe('1234') // round(10 * 0.35) = round(3.5) = 4
    expect(visibleText(str, 0.3)).toBe('123')   // round(10 * 0.3) = round(3.0) = 3
  })

  it('clamps progress below 0 to 0', () => {
    expect(visibleText('Hello', -0.5)).toBe('')
  })

  it('clamps progress above 1 to 1 (returns full string)', () => {
    expect(visibleText('Hello', 1.5)).toBe('Hello')
  })

  it('preserves newlines in content', () => {
    const content = 'Hello\nWorld'
    expect(visibleText(content, 1)).toBe('Hello\nWorld')
    // 11 chars; round(11 * 0.5) = round(5.5) = 6 → 'Hello\n'
    expect(visibleText(content, 0.5)).toBe('Hello\n')
  })
})
