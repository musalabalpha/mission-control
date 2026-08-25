import { afterEach, describe, expect, it } from 'vitest'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildArtifactIndex } from '../artifacts-index'

const GALLERY = 'https://helix.tail304cfc.ts.net:8446'
const NOW = 1_700_000_000_000

let tempDir = ''

afterEach(() => {
  if (!tempDir) return
  try {
    chmodSync(tempDir, 0o755)
  } catch {
    /* already writable */
  }
  rmSync(tempDir, { recursive: true, force: true })
  tempDir = ''
})

function makeDir(): string {
  tempDir = mkdtempSync(join(tmpdir(), 'mc-artifacts-index-'))
  return tempDir
}

function writeHtml(file: string, title?: string) {
  const html = title
    ? `<!doctype html><html><head><title>${title}</title></head><body>ok</body></html>`
    : `<!doctype html><html><body>sin titulo</body></html>`
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, html)
}

function index(dir: string, now = NOW) {
  return buildArtifactIndex({
    artifactsDir: dir,
    artifactsUrl: GALLERY,
    now,
  })
}

describe('buildArtifactIndex characterization', () => {
  it('assigns HTML at the artifacts root to zone root', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'loose.html'), 'Loose')
    const result = index(dir)
    expect(result.artifacts).toEqual([
      expect.objectContaining({
        name: 'loose.html',
        title: 'Loose',
        zone: 'root',
      }),
    ])
  })

  it('assigns HTML in live/ to zone live', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'live', 'panel.html'), 'Panel vivo')
    const result = index(dir)
    expect(result.artifacts[0]).toMatchObject({
      name: 'live/panel.html',
      title: 'Panel vivo',
      zone: 'live',
    })
  })

  it('includes nested HTML under projects/ recursively', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'projects', 'a', 'b', 'report.html'), 'Report')
    const result = index(dir)
    expect(result.artifacts.map(a => a.name)).toEqual(['projects/a/b/report.html'])
  })

  it('does not recurse into non-project zone directories', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'docs', 'nested', 'deep.html'), 'Deep')
    writeHtml(join(dir, 'docs', 'top.html'), 'Top')
    const result = index(dir)
    expect(result.artifacts.map(a => a.name)).toEqual(['docs/top.html'])
  })

  it('ignores .git, .trash, node_modules and hidden names under projects', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'projects', '.git', 'hook.html'), 'Git')
    writeHtml(join(dir, 'projects', '.trash', 'old.html'), 'Trash')
    writeHtml(join(dir, 'projects', 'node_modules', 'pkg.html'), 'Pkg')
    writeHtml(join(dir, 'projects', '.hidden.html'), 'Hidden')
    writeHtml(join(dir, 'projects', 'ok.html'), 'Ok')
    const result = index(dir)
    expect(result.artifacts.map(a => a.name)).toEqual(['projects/ok.html'])
  })

  it('uses the <title> text as the artifact title', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'docs', 'spec.html'), '  Spec title  ')
    expect(index(dir).artifacts[0].title).toBe('Spec title')
  })

  it('falls back to the filename when <title> is missing', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'docs', 'untitled.html'))
    expect(index(dir).artifacts[0].title).toBe('untitled')
  })

  it('encodes path segments for preview and interactive URLs', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'docs', 'Mi Reporte á.html'), 'Reporte')
    const artifact = index(dir).artifacts[0]
    expect(artifact.previewUrl).toBe(
      `${GALLERY}/a/docs/${encodeURIComponent('Mi Reporte á.html')}`,
    )
    expect(artifact.url).toBe(
      `${GALLERY}/v/docs/${encodeURIComponent('Mi Reporte á.html')}`,
    )
    expect(artifact.previewUrl).toContain('/a/')
    expect(artifact.url).toContain('/v/')
  })

  it('sorts artifacts by mtime descending', () => {
    const dir = makeDir()
    const older = join(dir, 'live', 'old.html')
    const newer = join(dir, 'live', 'new.html')
    writeHtml(older, 'Old')
    writeHtml(newer, 'New')
    utimesSync(older, 1_700_000_000, 1_700_000_000)
    utimesSync(newer, 1_700_000_100, 1_700_000_100)
    expect(index(dir).artifacts.map(a => a.name)).toEqual([
      'live/new.html',
      'live/old.html',
    ])
  })

  it('returns a single entry when the same relative path is discovered once', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'live', 'once.html'), 'Once')
    const names = index(dir).artifacts.map(a => a.name)
    expect(names).toEqual(['live/once.html'])
    expect(new Set(names).size).toBe(names.length)
  })

  it('assigns HTML in log/incidentes to zone log/incidentes', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'log', 'incidentes', 'incidente-20260815T2003.html'), 'Incidente')
    const result = index(dir)
    expect(result.artifacts[0]).toMatchObject({
      name: 'log/incidentes/incidente-20260815T2003.html',
      zone: 'log/incidentes',
    })
  })
})

describe('buildArtifactIndex decision exclusion', () => {
  it('excludes log/decisiones entirely: no zone, no artifacts, not indexed even if present on disk', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'log', 'decisiones', 'decisiones-2026-08-24.html'), 'Decisiones')
    writeHtml(join(dir, 'live', 'panel.html'), 'Panel')
    const result = index(dir)
    expect(result.artifacts.map(a => a.name)).toEqual(['live/panel.html'])
    expect(result.zones.some(z => z.id === 'log/decisiones')).toBe(false)
  })

  it('excludes daily decision consoles at root (decisiones-YYYY-MM-DD.html)', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'decisiones-2026-08-24.html'), 'Decisiones del día')
    writeHtml(join(dir, 'decisiones-musa-2026-07-14.html'), 'Decisiones musa')
    writeHtml(join(dir, 'panel-vivo.html'), 'Panel vivo')
    const result = index(dir)
    expect(result.artifacts.map(a => a.name)).toEqual(['panel-vivo.html'])
  })

  it('does not exclude unrelated root HTML that merely contains "decisiones" mid-name', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'resumen-decisiones-semana.html'), 'Resumen')
    const result = index(dir)
    expect(result.artifacts.map(a => a.name)).toEqual(['resumen-decisiones-semana.html'])
  })

  it('keeps log/incidentes indexed and separate from the decisiones exclusion', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'log', 'decisiones', 'decisiones-2026-08-24.html'), 'Decisiones')
    writeHtml(join(dir, 'log', 'incidentes', 'incidente-20260815T2003.html'), 'Incidente')
    const result = index(dir)
    expect(result.artifacts.map(a => a.name)).toEqual([
      'log/incidentes/incidente-20260815T2003.html',
    ])
  })
})

describe('buildArtifactIndex V1 contract', () => {
  it('returns degraded status, empty collection and a non-null notice when the directory is missing', () => {
    const missing = join(tmpdir(), `mc-artifacts-missing-${Date.now()}-nope`)
    const result = buildArtifactIndex({
      artifactsDir: missing,
      artifactsUrl: GALLERY,
      now: NOW,
    })
    expect(result.status).toBe('degraded')
    expect(result.artifacts).toEqual([])
    expect(result.total).toBe(0)
    expect(result.notice).toEqual(expect.any(String))
    expect(result.notice).not.toBeNull()
    expect(JSON.stringify(result)).not.toContain(missing)
    expect(result.source).toBe('artifacts-server')
    expect(result.generatedAt).toBe(NOW)
    expect(result.newestArtifactAt).toBeNull()
    expect(result.galleryUrl).toBe(GALLERY)
  })

  it('sets generatedAt from now and newestArtifactAt from the newest mtime', () => {
    const dir = makeDir()
    const older = join(dir, 'live', 'old.html')
    const newer = join(dir, 'docs', 'new.html')
    writeHtml(older, 'Old')
    writeHtml(newer, 'New')
    utimesSync(older, 1_700_000_000, 1_700_000_000)
    utimesSync(newer, 1_700_000_100, 1_700_000_100)
    const result = index(dir, NOW)
    expect(result.status).toBe('ok')
    expect(result.notice).toBeNull()
    expect(result.generatedAt).toBe(NOW)
    expect(result.newestArtifactAt).toBe(1_700_000_100)
    expect(result.source).toBe('artifacts-server')
  })

  it('ignores hidden HTML in non-recursive zones', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'live', '.secret.html'), 'Secret')
    writeHtml(join(dir, 'live', 'visible.html'), 'Visible')
    expect(index(dir).artifacts.map(a => a.name)).toEqual(['live/visible.html'])
  })

  it('returns degraded status when the artifacts directory exists but is unreadable', () => {
    const dir = makeDir()
    writeHtml(join(dir, 'live', 'panel.html'), 'Panel')
    chmodSync(dir, 0o000)
    const result = index(dir)
    expect(result.status).toBe('degraded')
    expect(result.artifacts).toEqual([])
    expect(result.notice).not.toBeNull()
    expect(JSON.stringify(result)).not.toContain(dir)
  })
})
