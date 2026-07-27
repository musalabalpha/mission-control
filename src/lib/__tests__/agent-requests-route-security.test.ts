import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const requireRoleMock = vi.fn()

vi.mock('@/lib/auth', () => ({ requireRole: requireRoleMock }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

let tempDir = ''

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  tempDir = mkdtempSync(join(tmpdir(), 'mc-agent-requests-route-test-'))
  process.env.AGENT_REQUEST_INBOX = join(tempDir, 'requests.jsonl')
})

afterEach(() => {
  delete process.env.AGENT_REQUEST_INBOX
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

describe('GET /api/agent-requests — auth', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireRoleMock.mockReturnValue({ error: 'Authentication required', status: 401 })

    const { GET } = await import('@/app/api/agent-requests/route')
    const response = await GET(new NextRequest('http://localhost/api/agent-requests'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Authentication required' })
  })

  it('serves the list once authenticated as viewer', async () => {
    requireRoleMock.mockReturnValue({ user: { username: 'musa', role: 'viewer' } })
    writeFileSync(
      process.env.AGENT_REQUEST_INBOX!,
      JSON.stringify({ id: 'req-1', status: 'queued', to: 'musa', question: 'ping' }),
      'utf8'
    )

    const { GET } = await import('@/app/api/agent-requests/route')
    const response = await GET(new NextRequest('http://localhost/api/agent-requests'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.requests).toHaveLength(1)
    expect(body.requests[0].id).toBe('req-1')
  })
})

describe('GET /api/agent-requests/[requestId] — auth', () => {
  it('rejects an unauthenticated request with 401', async () => {
    requireRoleMock.mockReturnValue({ error: 'Authentication required', status: 401 })

    const { GET } = await import('@/app/api/agent-requests/[requestId]/route')
    const response = await GET(new NextRequest('http://localhost/api/agent-requests/req-1'), {
      params: Promise.resolve({ requestId: 'req-1' }),
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Authentication required' })
  })

  it('returns 404 for an unknown id once authenticated', async () => {
    requireRoleMock.mockReturnValue({ user: { username: 'musa', role: 'viewer' } })

    const { GET } = await import('@/app/api/agent-requests/[requestId]/route')
    const response = await GET(new NextRequest('http://localhost/api/agent-requests/nope'), {
      params: Promise.resolve({ requestId: 'nope' }),
    })

    expect(response.status).toBe(404)
  })
})
