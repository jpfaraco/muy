import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { MuyFileV1 } from './muyFile'

export interface ProjectRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnail: string | null
  data: MuyFileV1
}

interface MetaRecord {
  id: 'meta'
  lastOpenedProjectId: string | null
}

interface MuyDB extends DBSchema {
  projects: {
    key: string
    value: ProjectRecord
    indexes: { updatedAt: number }
  }
  meta: {
    key: string
    value: MetaRecord
  }
}

export type ProjectDbErrorCode = 'QUOTA_EXCEEDED' | 'NOT_FOUND' | 'UNAVAILABLE'

export class ProjectDbError extends Error {
  readonly code: ProjectDbErrorCode
  constructor(code: ProjectDbErrorCode, message: string) {
    super(message)
    this.name = 'ProjectDbError'
    this.code = code
  }
}

/**
 * UUID v4 generator with a `crypto.getRandomValues` fallback for iOS Safari
 * versions that don't expose `crypto.randomUUID` (added in iOS 15.4).
 */
function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

let dbPromise: Promise<IDBPDatabase<MuyDB>> | null = null

/** Only for use in tests — resets the cached DB connection. */
export function _resetDbForTesting() {
  dbPromise = null
}

function getDb(): Promise<IDBPDatabase<MuyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MuyDB>('muy', 1, {
      upgrade(db) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('updatedAt', 'updatedAt')
        db.createObjectStore('meta', { keyPath: 'id' })
      },
    }).catch((err) => {
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

function handleWriteError(err: unknown): never {
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    throw new ProjectDbError(
      'QUOTA_EXCEEDED',
      'Storage is full. Export your projects to free up space.',
    )
  }
  throw err
}

export async function listProjects(): Promise<ProjectRecord[]> {
  try {
    const db = await getDb()
    const all = await db.getAll('projects')
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (err) {
    if (err instanceof ProjectDbError) throw err
    throw new ProjectDbError('UNAVAILABLE', 'Could not access project storage.')
  }
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  try {
    const db = await getDb()
    return (await db.get('projects', id)) ?? null
  } catch (err) {
    if (err instanceof ProjectDbError) throw err
    throw new ProjectDbError('UNAVAILABLE', 'Could not access project storage.')
  }
}

export async function createProject(
  name: string,
  data: MuyFileV1,
  thumbnail: string | null,
): Promise<ProjectRecord> {
  const db = await getDb().catch(() => {
    throw new ProjectDbError('UNAVAILABLE', 'Could not access project storage.')
  })
  try {
    const now = Date.now()
    const record: ProjectRecord = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      thumbnail,
      data,
    }
    await db.put('projects', record)
    return record
  } catch (err) {
    handleWriteError(err)
  }
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<ProjectRecord, 'id' | 'createdAt'>>,
): Promise<ProjectRecord> {
  const db = await getDb().catch(() => {
    throw new ProjectDbError('UNAVAILABLE', 'Could not access project storage.')
  })
  const existing = await db.get('projects', id)
  if (!existing) throw new ProjectDbError('NOT_FOUND', 'Project not found.')
  try {
    const updated: ProjectRecord = { ...existing, ...patch, updatedAt: Date.now() }
    await db.put('projects', updated)
    return updated
  } catch (err) {
    handleWriteError(err)
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete('projects', id)
    const meta = await db.get('meta', 'meta')
    if (meta?.lastOpenedProjectId === id) {
      await db.put('meta', { id: 'meta', lastOpenedProjectId: null })
    }
  } catch (err) {
    if (err instanceof ProjectDbError) throw err
    throw new ProjectDbError('UNAVAILABLE', 'Could not delete project.')
  }
}

export async function duplicateProject(id: string): Promise<ProjectRecord> {
  const db = await getDb().catch(() => {
    throw new ProjectDbError('UNAVAILABLE', 'Could not access project storage.')
  })
  const existing = await db.get('projects', id)
  if (!existing) throw new ProjectDbError('NOT_FOUND', 'Project not found.')
  try {
    const now = Date.now()
    const copy: ProjectRecord = {
      ...existing,
      id: generateId(),
      name: `Copy of ${existing.name}`,
      createdAt: now,
      updatedAt: now,
    }
    await db.put('projects', copy)
    return copy
  } catch (err) {
    handleWriteError(err)
  }
}

export async function getLastOpenedProjectId(): Promise<string | null> {
  try {
    const db = await getDb()
    const meta = await db.get('meta', 'meta')
    return meta?.lastOpenedProjectId ?? null
  } catch {
    return null
  }
}

export async function setLastOpenedProjectId(id: string | null): Promise<void> {
  try {
    const db = await getDb()
    await db.put('meta', { id: 'meta', lastOpenedProjectId: id })
  } catch {
    // Non-critical — don't surface this error to the user
  }
}
