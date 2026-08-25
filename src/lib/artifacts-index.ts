import fs from 'node:fs'
import path from 'node:path'

export type ArtifactZone =
  | 'live'
  | 'log/incidentes'
  | 'docs'
  | 'radares'
  | 'drafts'
  | 'projects'
  | 'archive'
  | 'root'

export interface ArtifactSummaryV1 {
  name: string
  title: string
  zone: ArtifactZone
  updatedAt: number
  url: string
  previewUrl: string
}

export interface ArtifactIndexV1 {
  artifacts: ArtifactSummaryV1[]
  zones: Array<{ id: string; label: string; blurb: string; count: number }>
  total: number
  generatedAt: number
  newestArtifactAt: number | null
  source: 'artifacts-server'
  status: 'ok' | 'degraded'
  notice: string | null
  galleryUrl: string
}

export interface BuildArtifactIndexInput {
  artifactsDir: string
  artifactsUrl: string
  now: number
}

const SCAN_ZONES = [
  { id: 'live', label: 'Vivos', blurb: 'Paneles que abres seguido' },
  { id: 'log/incidentes', label: 'Incidentes', blurb: 'Postmortems' },
  { id: 'docs', label: 'Docs', blurb: 'Specs y propuestas' },
  { id: 'radares', label: 'Radares', blurb: 'Sectoriales / SOFOM' },
  { id: 'drafts', label: 'Drafts', blurb: 'Previews' },
  { id: 'projects', label: 'Proyectos', blurb: 'Paquetes' },
  { id: 'archive', label: 'Archivo', blurb: 'Histórico' },
] as const

const ROOT_ZONE = { id: 'root', label: 'Raíz', blurb: 'HTML suelto en el directorio' } as const

const ZONE_DEFS = [...SCAN_ZONES, ROOT_ZONE]

const SKIP = new Set(['.git', '.claude', '.impeccable', '.trash', 'assets', 'state', 'node_modules'])

const DEGRADED_NOTICE = 'Galería no disponible'

function titleOf(file: string): string {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 2000)
    const m = head.match(/<title>([\s\S]*?)<\/title>/i)
    if (m) return m[1].trim().slice(0, 120)
  } catch {
    /* sin título */
  }
  return path.basename(file, '.html')
}

function encodeRel(rel: string): string {
  return rel.split('/').map(encodeURIComponent).join('/')
}

function shouldSkipName(name: string): boolean {
  return name.startsWith('.') || SKIP.has(name)
}

const DAILY_DECISION_CONSOLE = /^decisiones-.*\.html$/i

function isRootDecisionConsole(name: string): boolean {
  return DAILY_DECISION_CONSOLE.test(name)
}

function zoneOf(rel: string): ArtifactZone {
  for (const z of SCAN_ZONES) {
    if (rel === z.id || rel.startsWith(`${z.id}/`)) return z.id
  }
  return 'root'
}

function listArtifactRels(artifactsDir: string): string[] | null {
  const found: string[] = []

  let rootEntries: fs.Dirent[]
  try {
    rootEntries = fs.readdirSync(artifactsDir, { withFileTypes: true })
  } catch {
    return null
  }

  for (const z of SCAN_ZONES) {
    const zoneDir = path.join(artifactsDir, z.id)
    if (!fs.existsSync(zoneDir)) continue

    if (z.id === 'projects') {
      const walk = (dir: string, baseRel: string) => {
        let entries: fs.Dirent[]
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true })
        } catch {
          return
        }
        for (const ent of entries) {
          if (shouldSkipName(ent.name)) continue
          const full = path.join(dir, ent.name)
          const rel = `${baseRel}/${ent.name}`
          if (ent.isDirectory()) walk(full, rel)
          else if (ent.isFile() && ent.name.endsWith('.html')) found.push(rel)
        }
      }
      walk(zoneDir, 'projects')
      continue
    }

    try {
      for (const ent of fs.readdirSync(zoneDir, { withFileTypes: true })) {
        if (shouldSkipName(ent.name) || !ent.name.endsWith('.html')) continue
        if (ent.isFile()) found.push(`${z.id}/${ent.name}`)
      }
    } catch {
      /* zona ilegible */
    }
  }

  for (const ent of rootEntries) {
    if (shouldSkipName(ent.name) || !ent.name.endsWith('.html')) continue
    if (isRootDecisionConsole(ent.name)) continue
    if (ent.isFile()) found.push(ent.name)
  }

  return [...new Set(found)]
}

function emptyIndex(
  input: BuildArtifactIndexInput,
  status: 'ok' | 'degraded',
  notice: string | null,
): ArtifactIndexV1 {
  const galleryUrl = input.artifactsUrl.replace(/\/$/, '')
  return {
    artifacts: [],
    zones: ZONE_DEFS.map(z => ({ ...z, count: 0 })),
    total: 0,
    generatedAt: input.now,
    newestArtifactAt: null,
    source: 'artifacts-server',
    status,
    notice,
    galleryUrl,
  }
}

export function buildArtifactIndex(input: BuildArtifactIndexInput): ArtifactIndexV1 {
  const artifactsDir = input.artifactsDir
  const galleryUrl = input.artifactsUrl.replace(/\/$/, '')

  if (!fs.existsSync(artifactsDir)) {
    return emptyIndex(input, 'degraded', DEGRADED_NOTICE)
  }

  const rels = listArtifactRels(artifactsDir)
  if (rels === null) {
    return emptyIndex(input, 'degraded', DEGRADED_NOTICE)
  }

  const artifacts = rels
    .map((rel): ArtifactSummaryV1 | null => {
      const full = path.join(artifactsDir, rel)
      let updatedAt = 0
      try {
        updatedAt = Math.floor(fs.statSync(full).mtimeMs / 1000)
      } catch {
        return null
      }
      const encoded = encodeRel(rel)
      return {
        name: rel,
        title: titleOf(full),
        zone: zoneOf(rel),
        updatedAt,
        url: `${galleryUrl}/v/${encoded}`,
        previewUrl: `${galleryUrl}/a/${encoded}`,
      }
    })
    .filter((a): a is ArtifactSummaryV1 => a !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const zoneCounts: Record<string, number> = {}
  for (const a of artifacts) zoneCounts[a.zone] = (zoneCounts[a.zone] ?? 0) + 1

  return {
    artifacts,
    zones: ZONE_DEFS.map(z => ({ ...z, count: zoneCounts[z.id] ?? 0 })),
    total: artifacts.length,
    generatedAt: input.now,
    newestArtifactAt: artifacts[0]?.updatedAt ?? null,
    source: 'artifacts-server',
    status: 'ok',
    notice: null,
    galleryUrl,
  }
}
