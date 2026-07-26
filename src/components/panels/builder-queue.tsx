'use client'

import { useCallback, useState } from 'react'
import { useSmartPoll } from '@/lib/use-smart-poll'
import { apiFetch } from '@/lib/api-client'

type BuilderStatus = 'pending' | 'running' | 'done' | 'failed'
interface BuilderTask {
  id: string
  title?: string
  model?: string
  repo?: string
  created?: string
  status: BuilderStatus
  branch?: string
  diffstat?: string
}

const STATUS_LABEL: Record<BuilderStatus, string> = {
  pending: 'pendiente',
  running: 'corriendo',
  done: 'terminado',
  failed: 'falló',
}

const STATUS_CLASS: Record<BuilderStatus, string> = {
  pending: 'text-warning',
  running: 'text-primary',
  done: 'text-success',
  failed: 'text-destructive',
}

export function BuilderQueue() {
  const [tasks, setTasks] = useState<BuilderTask[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const data = await apiFetch<{ tasks?: BuilderTask[] }>('/api/builder')
      setTasks(data.tasks ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la cola')
    }
  }, [])

  useSmartPoll(fetchQueue, 30000)

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="builder-queue-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="builder-queue-title" className="text-sm font-semibold uppercase tracking-wider">Brazo local · builder</h2>
        <span className="font-mono text-2xs text-muted-foreground">{tasks ? `${tasks.length} recientes` : '…'}</span>
      </div>
      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
      {!tasks && !error && <p className="text-xs text-muted-foreground">Leyendo cola…</p>}
      {tasks?.length === 0 && <p className="text-xs text-muted-foreground">Sin tareas en la cola.</p>}
      {tasks && tasks.length > 0 && (
        <ul className="divide-y divide-border/60">
          {tasks.map(task => (
            <li key={task.id} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 text-sm">
                <span className={`shrink-0 font-mono text-2xs uppercase ${STATUS_CLASS[task.status]}`}>
                  {STATUS_LABEL[task.status]}
                </span>
                <span className="min-w-0 flex-1 truncate">{task.title || task.id}</span>
                <span className="shrink-0 font-mono text-2xs text-muted-foreground">{task.model || 'modelo no registrado'}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-2xs text-muted-foreground">
                <span>{task.id}</span>
                {task.branch && <span>{task.branch}</span>}
                {task.diffstat && <span className="truncate">{task.diffstat}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
