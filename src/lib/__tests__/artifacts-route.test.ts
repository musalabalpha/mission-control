import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ArtifactIndexV1 } from '@/lib/artifacts-index'

const requireRoleMock = vi.fn()
const buildArtifactIndexMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  requireRole: requireRoleMock,
}))

vi.mock('@/lib/artifacts-index', () => ({
  buildArtifactIndex: (...args: unknown[]) => buildArtifactIndexMock(...args),
}))

const okIndex: ArtifactIndexV1 = {
  artifacts: [],
  zones: [],
  total: 0,
  generatedAt: 1_700_000_000_000,
  newestArtifactAt: null,
  source: 'artifacts-server',
  status: 'ok',
  notice: null,
  galleryUrl: 'https://helix.tail304cfc.ts.net:8446',
}

describe('GET /api/artifacts', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    buildArtifactIndexMock.mockReturnValue(okIndex)
  })

  it('denies unauthenticated requests without building the index', async () => {
    requireRoleMock.mockReturnValue({ error: 'Authentication required', status: 401 })
    const { GET } = await import('@/app/api/artifacts/route')
    const response = await GET(new NextRequest('http://localhost/api/artifacts'))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Authentication required' })
    expect(buildArtifactIndexMock).not.toHaveBeenCalled()
  })

  it('returns 200 for a viewer', async () => {
    requireRoleMock.mockReturnValue({
      user: { username: 'viewer', role: 'viewer', workspace_id: 1 },
    })
    const { GET } = await import('@/app/api/artifacts/route')
    const response = await GET(new NextRequest('http://localhost/api/artifacts'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(okIndex)
    expect(buildArtifactIndexMock).toHaveBeenCalledTimes(1)
  })

  it('returns 200 degraded when the index is unavailable, not 500', async () => {
    requireRoleMock.mockReturnValue({
      user: { username: 'viewer', role: 'viewer', workspace_id: 1 },
    })
    const degraded: ArtifactIndexV1 = {
      ...okIndex,
      status: 'degraded',
      notice: 'Galería no disponible',
    }
    buildArtifactIndexMock.mockReturnValue(degraded)
    const { GET } = await import('@/app/api/artifacts/route')
    const response = await GET(new NextRequest('http://localhost/api/artifacts'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('degraded')
    expect(JSON.stringify(body)).not.toMatch(/\/Users\/|artifactsDir|homedir/)
  })
})
