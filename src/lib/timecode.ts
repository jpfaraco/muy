export function framesToTimecode(totalFrames: number, fps: number): string {
  const total = Math.max(0, Math.floor(totalFrames))
  const f = Math.max(1, Math.floor(fps))
  const mm = Math.floor(total / (60 * f))
  const ss = Math.floor((total % (60 * f)) / f)
  const ff = total % f
  return `${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`
}

export function timecodeToFrames(tc: string, fps: number): number | null {
  const f = Math.max(1, Math.floor(fps))
  const match = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(tc.trim())
  if (!match) return null
  const mm = parseInt(match[1], 10)
  const ss = parseInt(match[2], 10)
  const ff = parseInt(match[3], 10)
  if (ss >= 60) return null
  if (ff >= f) return null
  return mm * 60 * f + ss * f + ff
}

export function formatTimecodeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-6).padStart(6, '0')
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}
