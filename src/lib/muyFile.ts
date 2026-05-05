import type { AnimationDoc, ImageAsset, Stroke } from '../types/animation'

export const MUY_FILE_VERSION = 1
export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB

export interface MuyFileV1 {
  magic: 'muy'
  version: 1
  savedAt: string
  doc: AnimationDoc
  drawStrokes: Record<string, Stroke[]>
}

export type MuyFileErrorCode =
  | 'FILE_TOO_LARGE'
  | 'NOT_JSON'
  | 'WRONG_MAGIC'
  | 'UNKNOWN_VERSION'
  | 'INVALID_DOC'
  | 'READ_ERROR'

export class MuyFileError extends Error {
  readonly code: MuyFileErrorCode
  constructor(code: MuyFileErrorCode, message: string) {
    super(message)
    this.name = 'MuyFileError'
    this.code = code
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

async function urlToDataURL(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return await blobToDataURL(blob)
  } catch {
    return null
  }
}

async function inlineImageAsset(asset: ImageAsset): Promise<ImageAsset> {
  const resolvedUrls = await Promise.all(asset.urls.map(urlToDataURL))
  const validUrls = resolvedUrls.filter((u): u is string => u !== null)
  return { ...asset, urls: validUrls }
}

export async function serializeProject(
  doc: AnimationDoc,
  drawStrokes: Record<string, Stroke[]>,
): Promise<MuyFileV1> {
  const inlinedAssets = await Promise.all(
    Object.entries(doc.imageAssets).map(async ([id, asset]) => {
      const inlined = await inlineImageAsset(asset)
      return [id, inlined] as const
    }),
  )

  const imageAssets: Record<string, ImageAsset> = {}
  for (const [id, asset] of inlinedAssets) {
    imageAssets[id] = asset
  }

  const inlinedDoc: AnimationDoc = { ...doc, imageAssets }

  return {
    magic: 'muy',
    version: MUY_FILE_VERSION,
    savedAt: new Date().toISOString(),
    doc: inlinedDoc,
    drawStrokes,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateDoc(doc: unknown): asserts doc is AnimationDoc {
  if (!isRecord(doc)) throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')

  const required: Array<[string, string]> = [
    ['fps', 'number'],
    ['frameCount', 'number'],
    ['canvasWidth', 'number'],
    ['canvasHeight', 'number'],
    ['backgroundColor', 'string'],
    ['paletteId', 'number'],
  ]

  for (const [key, type] of required) {
    if (typeof doc[key] !== type) {
      throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')
    }
  }

  if (!Array.isArray(doc.layerIds)) {
    throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')
  }
  if (!isRecord(doc.layers)) {
    throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')
  }
  if (!isRecord(doc.imageAssets)) {
    throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')
  }
  if (!Array.isArray(doc.frames)) {
    throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')
  }

  // Validate all layerIds reference existing layers
  const layerIds = doc.layerIds as unknown[]
  for (const id of layerIds) {
    if (typeof id !== 'string') {
      throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')
    }
    if (!isRecord(doc.layers) || !(id in (doc.layers as Record<string, unknown>))) {
      throw new MuyFileError('INVALID_DOC', 'This Muy file is corrupted or incomplete.')
    }
  }
}

function sanitizeDrawStrokes(
  raw: unknown,
): Record<string, Stroke[]> {
  if (!isRecord(raw)) return {}
  const result: Record<string, Stroke[]> = {}
  for (const [layerId, strokes] of Object.entries(raw)) {
    if (Array.isArray(strokes)) {
      result[layerId] = strokes as Stroke[]
    }
  }
  return result
}

function sanitizeImageAssets(doc: AnimationDoc): AnimationDoc {
  const sanitized: Record<string, ImageAsset> = {}
  const removedIds = new Set<string>()

  for (const [id, asset] of Object.entries(doc.imageAssets)) {
    if (!isRecord(asset) || !Array.isArray(asset.urls)) {
      removedIds.add(id)
      continue
    }

    const validUrls = (asset.urls as unknown[]).filter(
      (u): u is string => typeof u === 'string' && u.startsWith('data:image/'),
    )

    if (validUrls.length === 0) {
      removedIds.add(id)
    } else {
      sanitized[id] = { ...(asset as ImageAsset), urls: validUrls }
    }
  }

  if (removedIds.size === 0) return { ...doc, imageAssets: sanitized }

  // Remove layers that reference dropped assets
  const cleanedLayers: typeof doc.layers = {}
  const removedLayerIds = new Set<string>()

  for (const [layerId, layer] of Object.entries(doc.layers)) {
    if (layer.imageAssetId && removedIds.has(layer.imageAssetId)) {
      removedLayerIds.add(layerId)
    } else {
      cleanedLayers[layerId] = layer
    }
  }

  const cleanedLayerIds = doc.layerIds.filter((id) => !removedLayerIds.has(id))

  return {
    ...doc,
    imageAssets: sanitized,
    layers: cleanedLayers,
    layerIds: cleanedLayerIds,
  }
}

export function deserializeProject(json: unknown): MuyFileV1 {
  if (!isRecord(json)) {
    throw new MuyFileError('NOT_JSON', "This doesn't look like a Muy project file.")
  }

  if (json.magic !== 'muy') {
    throw new MuyFileError('WRONG_MAGIC', "This doesn't look like a Muy project file.")
  }

  if (json.version !== MUY_FILE_VERSION) {
    if (typeof json.version === 'number' && json.version > MUY_FILE_VERSION) {
      throw new MuyFileError(
        'UNKNOWN_VERSION',
        'This file was saved by a newer version of Muy. Please update the app.',
      )
    }
    throw new MuyFileError('UNKNOWN_VERSION', "This Muy file's version is not supported.")
  }

  validateDoc(json.doc)
  const sanitizedDoc = sanitizeImageAssets(json.doc as AnimationDoc)
  const drawStrokes = sanitizeDrawStrokes(json.drawStrokes)

  return {
    magic: 'muy',
    version: 1,
    savedAt: typeof json.savedAt === 'string' ? json.savedAt : new Date().toISOString(),
    doc: sanitizedDoc,
    drawStrokes,
  }
}

export async function readMuyFile(file: File): Promise<MuyFileV1> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new MuyFileError('FILE_TOO_LARGE', 'This file is too large to open.')
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    throw new MuyFileError('READ_ERROR', "Couldn't open this file.")
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new MuyFileError('NOT_JSON', "This file isn't a valid Muy project (couldn't read the file contents).")
  }

  return deserializeProject(json)
}

export async function downloadMuyFile(file: MuyFileV1, filename: string): Promise<void> {
  const normalizedFilename = filename.endsWith('.muy') ? filename : `${filename}.muy`
  const json = JSON.stringify(file)
  // octet-stream prevents Safari from appending .json based on MIME type inference
  const blob = new Blob([json], { type: 'application/octet-stream' })

  // On iOS/iPadOS, navigator.share with files avoids the PWA-reload problem caused
  // by blob URL navigation. The native share sheet stays in-process.
  if (typeof navigator.canShare === 'function') {
    const shareFile = new File([blob], normalizedFilename, { type: 'application/octet-stream' })
    if (navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: normalizedFilename })
      } catch (err) {
        // AbortError means the user dismissed the share sheet — not an error
        if (!(err instanceof Error && err.name === 'AbortError')) throw err
      }
      return
    }
  }

  // Desktop fallback: programmatic anchor click
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = normalizedFilename
  anchor.click()
  URL.revokeObjectURL(url)
}
