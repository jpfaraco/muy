import type { Layer } from '../types/animation'

/** Recursively collect all leaf layer IDs that are descendants of a group. */
export function getDescendantLeafIds(groupId: string, layers: Record<string, Layer>): string[] {
  const group = layers[groupId]
  if (!group || group.type !== 'group') return []

  const result: string[] = []
  for (const childId of group.childIds ?? []) {
    const child = layers[childId]
    if (!child) continue
    if (child.type === 'layer') {
      result.push(childId)
    } else {
      result.push(...getDescendantLeafIds(childId, layers))
    }
  }
  return result
}
