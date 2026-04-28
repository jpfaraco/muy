/**
 * Return the visible portion of `content` based on `progress` (0–1).
 * Progress maps linearly to character index; discrete — no partial characters.
 */
export function visibleText(content: string, progress: number): string {
  const p = Math.max(0, Math.min(1, progress))
  const n = Math.round(content.length * p)
  return content.slice(0, n)
}
