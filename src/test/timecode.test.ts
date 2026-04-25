import { describe, it, expect } from 'vitest'
import { framesToTimecode, timecodeToFrames, formatTimecodeInput } from '../lib/timecode'

describe('framesToTimecode', () => {
  it('formats 240 frames at 24 fps as 00:10:00', () => {
    expect(framesToTimecode(240, 24)).toBe('00:10:00')
  })

  it('formats sub-second remainder as ff', () => {
    expect(framesToTimecode(25, 24)).toBe('00:01:01')
  })

  it('formats minutes', () => {
    expect(framesToTimecode(24 * 60, 24)).toBe('01:00:00')
  })

  it('formats zero', () => {
    expect(framesToTimecode(0, 24)).toBe('00:00:00')
  })
})

describe('timecodeToFrames', () => {
  it('parses canonical mm:ss:ff', () => {
    expect(timecodeToFrames('00:10:00', 24)).toBe(240)
    expect(timecodeToFrames('01:00:00', 24)).toBe(1440)
    expect(timecodeToFrames('00:01:01', 24)).toBe(25)
  })

  it('rejects ff >= fps', () => {
    expect(timecodeToFrames('00:00:24', 24)).toBeNull()
  })

  it('rejects ss >= 60', () => {
    expect(timecodeToFrames('00:60:00', 24)).toBeNull()
  })

  it('rejects malformed input', () => {
    expect(timecodeToFrames('abc', 24)).toBeNull()
    expect(timecodeToFrames('00:00', 24)).toBeNull()
  })
})

describe('formatTimecodeInput', () => {
  it('right-aligns digits as user types', () => {
    expect(formatTimecodeInput('1')).toBe('00:00:01')
    expect(formatTimecodeInput('12')).toBe('00:00:12')
    expect(formatTimecodeInput('123456')).toBe('12:34:56')
  })

  it('strips non-digits', () => {
    expect(formatTimecodeInput('00:10:00')).toBe('00:10:00')
    expect(formatTimecodeInput('ab12cd')).toBe('00:00:12')
  })

  it('keeps only the last 6 digits', () => {
    expect(formatTimecodeInput('9876543210')).toBe('54:32:10')
  })
})
