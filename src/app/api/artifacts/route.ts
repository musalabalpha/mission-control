import { NextRequest, NextResponse } from 'next/server'
import os from 'node:os'
import path from 'node:path'
import { requireRole } from '@/lib/auth'
import { buildArtifactIndex } from '@/lib/artifacts-index'

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(os.homedir(), 'artifacts')
const ARTIFACTS_URL = (process.env.MC_ARTIFACTS_URL || 'https://helix.tail304cfc.ts.net:8446').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  return NextResponse.json(
    buildArtifactIndex({
      artifactsDir: ARTIFACTS_DIR,
      artifactsUrl: ARTIFACTS_URL,
      now: Date.now(),
    }),
  )
}
