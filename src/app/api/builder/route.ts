import { readdir, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

const QUEUE_ROOT = path.join(os.homedir(), '.openclaw', 'workspace', 'builder-queue')
const STATES = ['pending', 'running', 'done', 'failed'] as const
const MAX_ITEMS = 40

interface BuilderTask {
  id: string
  title?: string
  model?: string
  repo?: string
  created?: string
  status: (typeof STATES)[number]
  branch?: string
  worktree?: string
  diffstat?: string
}

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = JSON.parse(await readFile(file, 'utf8'))
    return value && typeof value === 'object' ? value as Record<string, unknown> : null
  } catch {
    return null
  }
}

async function filesForState(state: (typeof STATES)[number]): Promise<string[]> {
  try {
    return (await readdir(path.join(QUEUE_ROOT, state)))
      .filter(name => name.endsWith('.json') && !name.endsWith('.result.json'))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const tasks: BuilderTask[] = []
  for (const state of STATES) {
    const files = await filesForState(state)
    for (const file of files) {
      const task = await readJson(path.join(QUEUE_ROOT, state, file))
      if (!task || typeof task.id !== 'string') continue
      const result = state === 'done' || state === 'failed'
        ? await readJson(path.join(QUEUE_ROOT, state, `${task.id}.result.json`))
        : null
      tasks.push({
        id: task.id,
        title: typeof task.title === 'string' ? task.title : undefined,
        model: typeof task.model === 'string' ? task.model : undefined,
        repo: typeof task.repo === 'string' ? task.repo : undefined,
        created: typeof task.created === 'string' ? task.created : undefined,
        status: state,
        branch: typeof result?.branch === 'string' ? result.branch : undefined,
        worktree: typeof result?.worktree === 'string' ? result.worktree : undefined,
        diffstat: typeof result?.diffstat === 'string' ? result.diffstat : undefined,
      })
    }
  }

  tasks.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))
  return NextResponse.json({
    tasks: tasks.slice(0, MAX_ITEMS),
    total: tasks.length,
    source: QUEUE_ROOT,
    counts: Object.fromEntries(STATES.map(state => [state, tasks.filter(task => task.status === state).length])),
  })
}
