'use client'

// Vista Rooms (HLX-433, casa de agentes Fase 1): cuartos derivados de Linear
// vía rooms-gen.sh → /api/rooms. Un issue vive en UN cuarto; el canon del
// cuarto es Linear (estado o label room:*), nunca metadata de MC.

import { useCallback, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useSmartPoll } from '@/lib/use-smart-poll'

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

interface RoomsData {
  generatedAt: string | null
  rooms: Room[]
}

const roomTone: Record<string, string> = {
  ideation: 'border-secondary',
  projects: 'border-info/40',
  construction: 'border-warning/40',
  audit: 'border-primary/40',
  deploy_ops: 'border-success/40',
}

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export function RoomsPanel() {
  const [data, setData] = useState<RoomsData | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const d = await apiFetch<RoomsData & { error?: string }>('/api/rooms')
      setNotice(d.error ?? null)
      setData(d.error ? null : d)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar rooms')
    }
  }, [])

  useSmartPoll(fetchData, 60000)

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>
  if (notice) return <div className="p-6 text-sm text-muted-foreground">{notice}</div>
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>

  const total = data.rooms.reduce((n, r) => n + r.issues.length, 0)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Rooms</h2>
        <p className="text-xs text-muted-foreground">
          {total} issues activos · derivado de Linear
          {data.generatedAt && ` · actualizado ${timeAgo(data.generatedAt)}`}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {data.rooms.map((room) => (
          <div
            key={room.id}
            className={`rounded-lg border bg-card ${roomTone[room.id] ?? 'border-border'}`}
          >
            <div className="border-b border-border px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{room.label}</span>
                <span className="text-xs text-muted-foreground">{room.issues.length}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{room.owner}</p>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-2">
              {room.issues.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">Vacío</p>
              )}
              {room.issues.map((issue) => (
                <a
                  key={issue.identifier}
                  href={issue.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-border bg-background p-2 hover:border-primary/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {issue.identifier}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(issue.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs">{issue.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{issue.state}</span>
                    {issue.assignee && <span>· {issue.assignee}</span>}
                    {issue.project && <span>· {issue.project}</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
