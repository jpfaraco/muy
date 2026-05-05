import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  getLastOpenedProjectId,
  setLastOpenedProjectId,
  ProjectDbError,
  _resetDbForTesting,
} from '../lib/projectDb'
import { MUY_FILE_VERSION, type MuyFileV1 } from '../lib/muyFile'
import type { AnimationDoc } from '../types/animation'

// Reset the IDB module between tests so each test gets a fresh database.
beforeEach(async () => {
  const { IDBFactory } = await import('fake-indexeddb')
  globalThis.indexedDB = new IDBFactory()
  // Discard the cached DB connection so the next call opens against the new IDBFactory.
  _resetDbForTesting()
})

function makeMinimalDoc(): AnimationDoc {
  return {
    fps: 24,
    frameCount: 10,
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#ffffff',
    paletteId: 1,
    layerIds: ['layer-a'],
    layers: {
      'layer-a': { id: 'layer-a', name: 'A', type: 'layer', parentId: null },
    },
    imageAssets: {},
    frames: Array.from({ length: 10 }, () => ({})),
  }
}

function makeFile(): MuyFileV1 {
  return {
    magic: 'muy',
    version: MUY_FILE_VERSION,
    savedAt: new Date().toISOString(),
    doc: makeMinimalDoc(),
    drawStrokes: {},
  }
}

describe('createProject', () => {
  it('creates a record with the given name and returns it', async () => {
    const record = await createProject('My project', makeFile(), null)
    expect(record.name).toBe('My project')
    expect(typeof record.id).toBe('string')
    expect(record.thumbnail).toBeNull()
    expect(record.createdAt).toBeGreaterThan(0)
    expect(record.updatedAt).toBe(record.createdAt)
  })

  it('persists the record so it appears in listProjects', async () => {
    await createProject('Alpha', makeFile(), null)
    const list = await listProjects()
    expect(list.some((r) => r.name === 'Alpha')).toBe(true)
  })
})

describe('listProjects', () => {
  it('returns an empty array when there are no projects', async () => {
    const list = await listProjects()
    expect(list).toEqual([])
  })

  it('returns projects sorted by updatedAt descending', async () => {
    await createProject('Older', makeFile(), null)
    await new Promise((r) => setTimeout(r, 5)) // ensure different timestamps
    await createProject('Newer', makeFile(), null)
    const list = await listProjects()
    expect(list[0].name).toBe('Newer')
    expect(list[1].name).toBe('Older')
  })
})

describe('getProject', () => {
  it('returns null for a non-existent id', async () => {
    const result = await getProject('does-not-exist')
    expect(result).toBeNull()
  })

  it('returns the record for a known id', async () => {
    const created = await createProject('Test', makeFile(), null)
    const fetched = await getProject(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe('Test')
  })
})

describe('updateProject', () => {
  it('updates the name and bumps updatedAt', async () => {
    const record = await createProject('Old name', makeFile(), null)
    await new Promise((r) => setTimeout(r, 5))
    const updated = await updateProject(record.id, { name: 'New name' })
    expect(updated.name).toBe('New name')
    expect(updated.updatedAt).toBeGreaterThan(record.updatedAt)
    expect(updated.createdAt).toBe(record.createdAt)
  })

  it('throws NOT_FOUND for a non-existent id', async () => {
    await expect(updateProject('ghost', { name: 'x' })).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    )
  })
})

describe('deleteProject', () => {
  it('removes the project from the list', async () => {
    const record = await createProject('To delete', makeFile(), null)
    await deleteProject(record.id)
    const list = await listProjects()
    expect(list.find((r) => r.id === record.id)).toBeUndefined()
  })

  it('clears lastOpenedProjectId when that project is deleted', async () => {
    const record = await createProject('Last opened', makeFile(), null)
    await setLastOpenedProjectId(record.id)
    expect(await getLastOpenedProjectId()).toBe(record.id)
    await deleteProject(record.id)
    expect(await getLastOpenedProjectId()).toBeNull()
  })
})

describe('duplicateProject', () => {
  it('creates a copy with "Copy of <name>"', async () => {
    const original = await createProject('Original', makeFile(), null)
    const copy = await duplicateProject(original.id)
    expect(copy.name).toBe('Copy of Original')
    expect(copy.id).not.toBe(original.id)
  })

  it('throws NOT_FOUND for a non-existent id', async () => {
    await expect(duplicateProject('ghost')).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    )
  })

  it('copy appears in listProjects alongside the original', async () => {
    const original = await createProject('Base', makeFile(), null)
    await duplicateProject(original.id)
    const list = await listProjects()
    expect(list.length).toBe(2)
  })
})

describe('getLastOpenedProjectId / setLastOpenedProjectId', () => {
  it('returns null when nothing has been set', async () => {
    expect(await getLastOpenedProjectId()).toBeNull()
  })

  it('persists and retrieves the id', async () => {
    await setLastOpenedProjectId('proj-123')
    expect(await getLastOpenedProjectId()).toBe('proj-123')
  })

  it('can be reset to null', async () => {
    await setLastOpenedProjectId('some-id')
    await setLastOpenedProjectId(null)
    expect(await getLastOpenedProjectId()).toBeNull()
  })
})

describe('ProjectDbError', () => {
  it('has the correct name and code', () => {
    const err = new ProjectDbError('NOT_FOUND', 'test')
    expect(err.name).toBe('ProjectDbError')
    expect(err.code).toBe('NOT_FOUND')
    expect(err instanceof Error).toBe(true)
  })
})
