import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { config } from '@/lib/config'
import { requireRole } from '@/lib/auth'

// Vista Rooms (HLX-433, casa de agentes Fase 1): cuartos DERIVADOS de Linear
// por rooms-gen.sh (helix-ecosystem). MC es espejo, nunca fuente canónica —
// este route solo lee el JSON horneado, no llama a Linear ni almacena room_id.
const OUTPUT_DIR =
  process.env.HELIX_NEWGAME_DIR || path.join(config.openclawStateDir, 'workspace', 'output')

interface RoomIssue {
  identifier: string
  title: string
  state: string
  assignee?: string
  project?: string
  url: string
  updatedAt?: string
  labels?: string[]
}

interface Room {
  id: string
  label: string
  owner: string
  issues: RoomIssue[]
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let data: { generatedAt?: string; rooms?: Room[] } | null = null
  try {
    data = JSON.parse(
      fs.readFileSync(path.join(OUTPUT_DIR, 'rooms', 'latest.json'), 'utf8')
    )
  } catch {
    data = null
  }

  if (!data || !Array.isArray(data.rooms)) {
    return NextResponse.json(
      { error: `rooms-gen sin salida en ${OUTPUT_DIR}`, rooms: [] },
      { status: 200 }
    )
  }

  return NextResponse.json({ generatedAt: data.generatedAt ?? null, rooms: data.rooms })
}
