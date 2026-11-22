import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { config } from '@/lib/config'
import { requireRole } from '@/lib/auth'

// Quest board (HLX-206). Fuente: quest-engine en el workspace de OpenClaw. Solo lectura.
const OUTPUT_DIR =
  process.env.HELIX_OUTPUT_DIR || path.join(config.openclawStateDir, 'workspace', 'output')

interface Quest {
  name: string
  why?: string
  ref?: string
  source?: string
  urgency?: 'alta' | 'media' | 'baja' | string
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const questsFile = readJson<{ generatedAt?: string; quests?: Quest[]; closedYesterday?: unknown[] }>(
    path.join(OUTPUT_DIR, 'quests', 'latest.json')
  )

  if (!questsFile) {
    return NextResponse.json(
      { error: `Quest engine sin salida en ${OUTPUT_DIR}`, quests: [] },
      { status: 200 }
    )
  }

  return NextResponse.json({
    generatedAt: questsFile?.generatedAt ?? null,
    quests: questsFile?.quests ?? [],
    closedYesterday: Array.isArray(questsFile?.closedYesterday) ? questsFile!.closedYesterday.length : 0,
  })
}
