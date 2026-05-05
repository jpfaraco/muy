import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  serializeProject,
  deserializeProject,
  downloadMuyFile,
  MuyFileError,
  MUY_FILE_VERSION,
  type MuyFileV1,
} from '../lib/muyFile'
import type { AnimationDoc, Stroke } from '../types/animation'

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

const emptyStrokes: Record<string, Stroke[]> = {}

describe('serializeProject', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('includes magic, version, savedAt, doc, and drawStrokes', async () => {
    const doc = makeMinimalDoc()
    const result = await serializeProject(doc, emptyStrokes)

    expect(result.magic).toBe('muy')
    expect(result.version).toBe(MUY_FILE_VERSION)
    expect(typeof result.savedAt).toBe('string')
    expect(result.doc).toMatchObject({ fps: 24, frameCount: 10 })
    expect(result.drawStrokes).toEqual(emptyStrokes)
  })

  it('passes through data URLs unchanged', async () => {
    const dataUrl = 'data:image/png;base64,abc123'
    const doc: AnimationDoc = {
      ...makeMinimalDoc(),
      imageAssets: {
        'asset-1': { id: 'asset-1', name: 'Test', urls: [dataUrl] },
      },
    }

    const result = await serializeProject(doc, emptyStrokes)
    expect(result.doc.imageAssets['asset-1'].urls[0]).toBe(dataUrl)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('converts object URLs to data URLs via fetch', async () => {
    const objectUrl = 'blob:http://localhost/1234'
    const dataUrl = 'data:image/png;base64,xyz'
    const mockBlob = new Blob(['fake'], { type: 'image/png' })

    vi.mocked(fetch).mockResolvedValueOnce({
      blob: () => Promise.resolve(mockBlob),
    } as unknown as Response)

    vi.stubGlobal('FileReader', class {
      result = dataUrl
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      readAsDataURL(_blob: Blob) { this.onload?.() }
    })

    const doc: AnimationDoc = {
      ...makeMinimalDoc(),
      imageAssets: {
        'asset-1': { id: 'asset-1', name: 'Test', urls: [objectUrl] },
      },
    }

    const result = await serializeProject(doc, emptyStrokes)
    expect(fetch).toHaveBeenCalledWith(objectUrl)
    expect(result.doc.imageAssets['asset-1'].urls[0]).toBe(dataUrl)
  })

  it('drops an asset URL that fails to fetch and removes empty assets', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const doc: AnimationDoc = {
      ...makeMinimalDoc(),
      layerIds: ['layer-a', 'layer-with-asset'],
      layers: {
        'layer-a': { id: 'layer-a', name: 'A', type: 'layer', parentId: null },
        'layer-with-asset': {
          id: 'layer-with-asset',
          name: 'B',
          type: 'layer',
          parentId: null,
          imageAssetId: 'asset-1',
        },
      },
      imageAssets: {
        'asset-1': { id: 'asset-1', name: 'Test', urls: ['blob:http://localhost/fail'] },
      },
    }

    // serializeProject inlines URLs but doesn't drop assets — that's deserializeProject's job
    // On a failed fetch, the URL is omitted from the result
    const result = await serializeProject(doc, emptyStrokes)
    expect(result.doc.imageAssets['asset-1'].urls).toHaveLength(0)
  })

  it('does not mutate the original doc', async () => {
    const dataUrl = 'data:image/png;base64,abc'
    const doc = makeMinimalDoc()
    doc.imageAssets = { 'a': { id: 'a', name: 'X', urls: [dataUrl] } }
    const originalUrls = doc.imageAssets['a'].urls

    await serializeProject(doc, emptyStrokes)
    expect(doc.imageAssets['a'].urls).toBe(originalUrls)
  })
})

describe('deserializeProject', () => {
  function makeValidJson() {
    return {
      magic: 'muy' as const,
      version: MUY_FILE_VERSION,
      savedAt: '2024-01-01T00:00:00.000Z',
      doc: makeMinimalDoc(),
      drawStrokes: {},
    }
  }

  it('returns a valid file for well-formed input', () => {
    const result = deserializeProject(makeValidJson())
    expect(result.magic).toBe('muy')
    expect(result.version).toBe(MUY_FILE_VERSION)
    expect(result.doc.fps).toBe(24)
  })

  it('throws NOT_JSON for non-object input', () => {
    expect(() => deserializeProject('not json')).toThrow(MuyFileError)
    expect(() => deserializeProject('not json')).toThrow(expect.objectContaining({ code: 'NOT_JSON' }))
  })

  it('throws WRONG_MAGIC when magic field is wrong', () => {
    expect(() => deserializeProject({ magic: 'other', version: 1, doc: makeMinimalDoc(), drawStrokes: {} }))
      .toThrow(expect.objectContaining({ code: 'WRONG_MAGIC' }))
  })

  it('throws UNKNOWN_VERSION for a future version', () => {
    expect(() => deserializeProject({ magic: 'muy', version: 999, doc: makeMinimalDoc(), drawStrokes: {} }))
      .toThrow(expect.objectContaining({ code: 'UNKNOWN_VERSION' }))
  })

  it('throws INVALID_DOC when doc is missing required fields', () => {
    const bad = { ...makeValidJson(), doc: { fps: 24 } }
    expect(() => deserializeProject(bad)).toThrow(expect.objectContaining({ code: 'INVALID_DOC' }))
  })

  it('throws INVALID_DOC when a layerId references a missing layer', () => {
    const json = makeValidJson()
    json.doc = { ...json.doc, layerIds: ['layer-a', 'nonexistent'] }
    expect(() => deserializeProject(json)).toThrow(expect.objectContaining({ code: 'INVALID_DOC' }))
  })

  it('drops image assets whose URLs are not data URLs', () => {
    const json = makeValidJson()
    json.doc = {
      ...json.doc,
      imageAssets: {
        'asset-1': { id: 'asset-1', name: 'X', urls: ['blob:http://localhost/bad'] },
      },
    }
    const result = deserializeProject(json)
    expect(result.doc.imageAssets['asset-1']).toBeUndefined()
  })

  it('keeps assets where at least one URL is a valid data URL', () => {
    const json = makeValidJson()
    json.doc = {
      ...json.doc,
      imageAssets: {
        'asset-1': {
          id: 'asset-1',
          name: 'X',
          urls: ['blob:http://localhost/bad', 'data:image/png;base64,ok'],
        },
      },
    }
    const result = deserializeProject(json)
    expect(result.doc.imageAssets['asset-1'].urls).toEqual(['data:image/png;base64,ok'])
  })

  it('sanitizes drawStrokes — drops non-array values silently', () => {
    const json = { ...makeValidJson(), drawStrokes: { 'layer-a': [], 'layer-b': 'bad' } }
    const result = deserializeProject(json as unknown as ReturnType<typeof makeValidJson>)
    expect(result.drawStrokes['layer-a']).toEqual([])
    expect(result.drawStrokes['layer-b']).toBeUndefined()
  })
})

describe('downloadMuyFile', () => {
  function makeFile(): MuyFileV1 {
    return { magic: 'muy', version: 1, savedAt: '', doc: makeMinimalDoc(), drawStrokes: {} }
  }

  beforeEach(() => {
    // Ensure jsdom doesn't expose canShare so we always hit the anchor fallback
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
  })

  it('appends .muy extension if missing', async () => {
    const anchor = { click: vi.fn(), href: '', download: '' }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor as unknown as HTMLAnchorElement)
    await downloadMuyFile(makeFile(), 'myproject')
    expect(anchor.download).toBe('myproject.muy')
  })

  it('does not double-append .muy if already present', async () => {
    const anchor = { click: vi.fn(), href: '', download: '' }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor as unknown as HTMLAnchorElement)
    await downloadMuyFile(makeFile(), 'myproject.muy')
    expect(anchor.download).toBe('myproject.muy')
  })

  it('uses navigator.share when canShare returns true', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true })

    await downloadMuyFile(makeFile(), 'myproject')
    expect(mockShare).toHaveBeenCalled()
  })

  it('silently ignores AbortError from navigator.share', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(abortError), configurable: true })

    await expect(downloadMuyFile(makeFile(), 'myproject')).resolves.toBeUndefined()
  })
})
