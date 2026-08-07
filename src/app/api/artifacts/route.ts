import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { requireRole } from '@/lib/auth'

// Índice de ~/artifacts para el panel MC. El render vive en artifacts-server
// (:8446). Tras la limpieza 2026-08-01 los HTML viven en zonas (live/docs/log…).

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(os.homedir(), 'artifacts')
const ARTIFACTS_URL = (process.env.MC_ARTIFACTS_URL || 'https://helix.tail304cfc.ts.net:8446').replace(/\/$/, '')

const ZONES = [
  { id: 'live', label: 'Vivos', blurb: 'Paneles que abres seguido' },
  { id: 'log/decisiones', label: 'Decisiones', blurb: 'Diario' },
  { id: 'log/incidentes', label: 'Incidentes', blurb: 'Postmortems' },
  { id: 'docs', label: 'Docs', blurb: 'Specs y propuestas' },
  { id: 'radares', label: 'Radares', blurb: 'Sectoriales / SOFOM' },
  { id: 'drafts', label: 'Drafts', blurb: 'Previews' },
  { id: 'projects', label: 'Proyectos', blurb: 'Paquetes' },
  { id: 'archive', label: 'Archivo', blurb: 'Histórico' },
] as const

const SKIP = new Set(['.git', '.claude', '.impeccable', '.trash', 'assets', 'state', 'node_modules'])

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

function listArtifacts(): string[] {
  const found: string[] = []

  for (const z of ZONES) {
    const zoneDir = path.join(ARTIFACTS_DIR, z.id)
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
          if (ent.name.startsWith('.') || SKIP.has(ent.name)) continue
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
      for (const name of fs.readdirSync(zoneDir)) {
        if (!name.endsWith('.html')) continue
        const full = path.join(zoneDir, name)
        if (fs.statSync(full).isFile()) found.push(`${z.id}/${name}`)
      }
    } catch {
      /* zona ilegible */
    }
  }

  try {
    for (const name of fs.readdirSync(ARTIFACTS_DIR)) {
      if (!name.endsWith('.html')) continue
      const full = path.join(ARTIFACTS_DIR, name)
      if (fs.statSync(full).isFile()) found.push(name)
    }
  } catch {
    /* dir ilegible */
  }

  return [...new Set(found)]
}

function zoneOf(rel: string): string {
  for (const z of ZONES) {
    if (rel === z.id || rel.startsWith(`${z.id}/`)) return z.id
  }
  return 'root'
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    return NextResponse.json(
      { error: `Galería no disponible en ${ARTIFACTS_DIR}`, artifacts: [], zones: ZONES, total: 0 },
      { status: 200 },
    )
  }

  const rels = listArtifacts()
  const artifacts = rels
    .map(rel => {
      const full = path.join(ARTIFACTS_DIR, rel)
      let updatedAt = 0
      try {
        updatedAt = Math.floor(fs.statSync(full).mtimeMs / 1000)
      } catch {
        return null
      }
      const encoded = encodeRel(rel)
      const zone = zoneOf(rel)
      return {
        name: rel,
        title: titleOf(full),
        zone,
        updatedAt,
        url: `${ARTIFACTS_URL}/v/${encoded}`,
        previewUrl: `${ARTIFACTS_URL}/a/${encoded}`,
      }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const zoneCounts: Record<string, number> = {}
  for (const a of artifacts) zoneCounts[a.zone] = (zoneCounts[a.zone] ?? 0) + 1

  return NextResponse.json({
    artifacts,
    zones: ZONES.map(z => ({ ...z, count: zoneCounts[z.id] ?? 0 })),
    galleryUrl: ARTIFACTS_URL,
    total: artifacts.length,
  })
}
