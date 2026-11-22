'use client'

// Panel Quests (HLX-206): quest board del día. Fuente: /api/quests (quest-engine).

import { useCallback, useState } from 'react'
import { useSmartPoll } from '@/lib/use-smart-poll'

interface Quest {
  name: string
  why?: string
  ref?: string
  source?: string
  urgency?: string
}

interface QuestData {
  generatedAt: string | null
  quests: Quest[]
  closedYesterday: number
}

const LINEAR_BASE = 'https://linear.app/musalab/issue/'

const urgencyTone: Record<string, string> = {
  alta: 'bg-destructive/15 text-destructive border-destructive/30',
  media: 'bg-warning/15 text-warning border-warning/30',
  baja: 'bg-secondary text-muted-foreground border-border',
}

export function QuestsPanel() {
  const [data, setData] = useState<QuestData | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/quests')
      const d = await res.json()
      setNotice(d.error ?? null)
      setData(d.error ? null : d)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar quests')
    }
  }, [])

  useSmartPoll(fetchData, 60000)

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>
  if (notice) return <div className="p-6 text-sm text-muted-foreground">{notice}</div>
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Quests</h2>
        <p className="text-xs text-muted-foreground">
          {data.quests.length} para hoy
          {data.closedYesterday > 0 && ` · ${data.closedYesterday} cerradas ayer`}
        </p>
      </div>

      {/* Quest board */}
      {data.quests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin quests para hoy.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {data.quests.map((q, i) => {
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-sm font-medium">{q.name}</p>
                  {q.why && <p className="truncate font-sans text-xs text-muted-foreground">{q.why}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {q.ref && <span className="font-mono text-2xs text-info">{q.ref}</span>}
                  {q.urgency && (
                    <span className={`rounded-full border px-2 py-0.5 text-2xs ${urgencyTone[q.urgency] ?? urgencyTone.baja}`}>
                      {q.urgency}
                    </span>
                  )}
                </div>
              </>
            )
            const cls =
              'flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40'
            return q.ref?.startsWith('HLX-') ? (
              <a key={i} href={`${LINEAR_BASE}${q.ref}`} target="_blank" rel="noopener noreferrer" className={cls}>
                {inner}
              </a>
            ) : (
              <div key={i} className={cls}>
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
