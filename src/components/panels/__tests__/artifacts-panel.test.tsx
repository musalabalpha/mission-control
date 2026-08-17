import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactsPanel } from '../artifacts-panel'
import type { ArtifactIndexV1 } from '@/lib/artifacts-index'

const pollState = vi.hoisted(() => ({
  run: async () => {},
}))

vi.mock('@/lib/use-smart-poll', () => {
  const { useEffect } = require('react') as typeof import('react')
  return {
    useSmartPoll: (cb: () => void | Promise<void>) => {
      useEffect(() => {
        pollState.run = async () => {
          await cb()
        }
        void cb()
      }, [cb])
    },
  }
})

const gallery = 'https://helix.tail304cfc.ts.net:8446'

function sampleIndex(overrides: Partial<ArtifactIndexV1> = {}): ArtifactIndexV1 {
  return {
    artifacts: [
      {
        name: 'live/panel.html',
        title: 'Panel vivo',
        zone: 'live',
        updatedAt: Math.floor(Date.now() / 1000) - 60,
        url: `${gallery}/v/live/panel.html`,
        previewUrl: `${gallery}/a/live/panel.html`,
      },
      {
        name: 'docs/spec-file.html',
        title: 'Spec title',
        zone: 'docs',
        updatedAt: Math.floor(Date.now() / 1000) - 3600,
        url: `${gallery}/v/docs/spec-file.html`,
        previewUrl: `${gallery}/a/docs/spec-file.html`,
      },
    ],
    zones: [
      { id: 'live', label: 'Vivos', blurb: 'Paneles', count: 1 },
      { id: 'docs', label: 'Docs', blurb: 'Specs', count: 1 },
    ],
    total: 2,
    generatedAt: Date.now(),
    newestArtifactAt: Math.floor(Date.now() / 1000) - 60,
    source: 'artifacts-server',
    status: 'ok',
    notice: null,
    galleryUrl: gallery,
    ...overrides,
  }
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function renderLoaded(payload: ArtifactIndexV1 = sampleIndex()) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)))
  render(<ArtifactsPanel />)
  await waitFor(() => {
    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ArtifactsPanel V1', () => {
  it('shows degraded status and notice instead of a false-green success', async () => {
    await renderLoaded(
      sampleIndex({
        artifacts: [],
        total: 0,
        zones: [],
        status: 'degraded',
        notice: 'Galería no disponible',
        newestArtifactAt: null,
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(/degradado/i)
    expect(screen.getByRole('status')).toHaveTextContent('Galería no disponible')
    expect(screen.queryByText(/2 de 2/)).not.toBeInTheDocument()
  })

  it('shows source and freshness after load', async () => {
    await renderLoaded()
    expect(screen.getByText(/Fuente: Artifacts Server/i)).toBeInTheDocument()
    expect(screen.getByText(/actualizado/i)).toBeInTheDocument()
  })

  it('characterization: loads titles and filtered counts', async () => {
    await renderLoaded()
    expect(screen.getByRole('heading', { name: 'Panel vivo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Spec title/ })).toBeInTheDocument()
    expect(screen.getByText(/2 de 2/)).toBeInTheDocument()
  })

  it('characterization: searches by title and filename', async () => {
    await renderLoaded()
    fireEvent.change(screen.getByLabelText(/buscar artefactos/i), {
      target: { value: 'Spec title' },
    })
    expect(screen.getByRole('button', { name: /Spec title/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Panel vivo/ })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/buscar artefactos/i), {
      target: { value: 'spec-file' },
    })
    expect(screen.getByRole('button', { name: /Spec title/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Panel vivo/ })).not.toBeInTheDocument()
  })

  it('characterization: filters by zone', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: /Vivos 1/ }))
    expect(screen.getByRole('button', { name: /Panel vivo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Spec title/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vivos 1/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('characterization: preview uses /a/ and interactive uses /v/ with restrictive sandbox', async () => {
    await renderLoaded()
    const iframe = screen.getByTitle('Panel vivo')
    expect(iframe).toHaveAttribute('src', `${gallery}/a/live/panel.html`)
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-popups')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-forms')
    expect(screen.getByRole('link', { name: /abrir interactivo/i })).toHaveAttribute(
      'href',
      `${gallery}/v/live/panel.html`,
    )
  })

  it('characterization: keeps selection when the artifact remains after refresh', async () => {
    const first = sampleIndex()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(first))
    vi.stubGlobal('fetch', fetchMock)
    render(<ArtifactsPanel />)
    await screen.findByRole('button', { name: /Spec title/ })
    fireEvent.click(screen.getByRole('button', { name: /Spec title/ }))
    expect(screen.getByTitle('Spec title')).toBeInTheDocument()
    await act(async () => {
      await pollState.run()
    })
    expect(screen.getByTitle('Spec title')).toBeInTheDocument()
  })

  it('marks previous data stale after a network error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(sampleIndex()))
      .mockRejectedValueOnce(new Error('Network request failed'))
    vi.stubGlobal('fetch', fetchMock)
    render(<ArtifactsPanel />)
    await screen.findByRole('button', { name: /Panel vivo/ })
    await act(async () => {
      await pollState.run()
    })
    expect(screen.getByRole('button', { name: /Panel vivo/ })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/degradado|stale|desactualiz/i)
    })
  })
})
