'use client'

/**
 * Agent Requests (HLX-461) — read-only view of the dispatch inbox
 * (~/.openclaw/workspace/output/dispatch/requests.jsonl, HLX-460/PR#142).
 *
 * One row per request, scannable at a glance: who it's waiting on, when it's
 * due, what state it's in, and a preview of the answer once there is one.
 * No autonomy buttons here — "view evidence" is the only action, retry is a
 * separate piece of work.
 */

import { useCallback, useMemo, useState } from 'react'
import { useSmartPoll } from '@/lib/use-smart-poll'
import { apiFetch } from '@/lib/api-client'
import { safeEvidenceHref } from '@/lib/agent-request-links'

type AgentRequestStatus =
  | 'queued'
  | 'delivered'
  | 'acknowledged'
  | 'answered'
  | 'no_context'
  | 'blocked'
  | 'expired'

type AgentRequestGroup = 'waiting' | 'answered' | 'blocked' | 'expired'

interface AgentRequestSummary {
  id: string
  from: string | null
  to: string | null
  question: string | null
  deadlineAt: string | null
  status: AgentRequestStatus | null
  group: AgentRequestGroup | null
  overdue: boolean
  hasAnswer: boolean
}

interface AgentRequestDetail extends AgentRequestSummary {
  contextLinks: string[]
  answer: string | null
  evidence: string[]
}

interface ListResponse {
  requests: AgentRequestSummary[]
  error?: string
}

type FilterId = 'waiting' | 'answered' | 'blocked' | 'expired'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'waiting', label: 'Waiting' },
  { id: 'answered', label: 'Answered' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'expired', label: 'Expired' },
]

const STATUS_LABEL: Record<AgentRequestStatus, string> = {
  queued: 'Queued',
  delivered: 'Delivered',
  acknowledged: 'Acknowledged',
  answered: 'Answered',
  no_context: 'No context',
  blocked: 'Blocked',
  expired: 'Expired',
}

function statusTone(request: AgentRequestSummary): string {
  if (request.overdue) return 'text-amber-400 border-amber-400/40 bg-amber-500/10'
  switch (request.group) {
    case 'waiting':
      return 'text-blue-400 border-blue-400/30 bg-blue-500/10'
    case 'answered':
      return 'text-green-400 border-green-400/30 bg-green-500/10'
    case 'blocked':
      return 'text-red-400 border-red-400/30 bg-red-500/10'
    case 'expired':
      return 'text-muted-foreground border-border bg-secondary/40'
    default:
      return 'text-muted-foreground border-border bg-secondary/40'
  }
}

function relativeDeadline(deadlineAt: string | null, overdue: boolean, now: number): string {
  if (!deadlineAt) return 'no deadline'
  const ms = new Date(deadlineAt).getTime() - now
  if (Number.isNaN(ms)) return 'no deadline'
  if (overdue) return 'overdue'
  if (ms <= 0) return 'due now'
  const hours = Math.floor(ms / 3_600_000)
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`
  if (hours >= 1) return `${hours}h left`
  return `${Math.max(1, Math.round(ms / 60_000))}m left`
}

export function AgentRequestsPanel() {
  const [requests, setRequests] = useState<AgentRequestSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterId>('waiting')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<AgentRequestDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<ListResponse>('/api/agent-requests')
      setRequests(res.requests)
      setError(null)
    } catch {
      setError('Could not load agent requests')
    }
    setNow(Date.now())
  }, [])

  useSmartPoll(load, 30_000)

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { waiting: 0, answered: 0, blocked: 0, expired: 0 }
    for (const r of requests ?? []) {
      if (r.group) c[r.group] += 1
    }
    return c
  }, [requests])

  const visible = useMemo(
    () => (requests ?? []).filter((r) => r.group === filter),
    [requests, filter]
  )

  const toggle = async (request: AgentRequestSummary) => {
    if (expanded === request.id) {
      setExpanded(null)
      return
    }
    setExpanded(request.id)
    setDetail(null)
    setDetailError(null)
    try {
      const res = await apiFetch<{ request: AgentRequestDetail }>(
        `/api/agent-requests/${encodeURIComponent(request.id)}`
      )
      setDetail(res.request)
    } catch {
      setDetailError('Could not load request detail')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold">Agent Requests</h2>
        <p className="text-xs text-muted-foreground">
          Questions agents are waiting on Musa to answer.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === f.id
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label} <span className="tabular-nums">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {requests === null && !error && (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}

      {requests !== null && requests.length === 0 && (
        <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No requests yet.
        </div>
      )}

      {requests !== null && requests.length > 0 && visible.length === 0 && (
        <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing in {FILTERS.find((f) => f.id === filter)?.label}.
        </div>
      )}

      {visible.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {visible.map((request) => {
            const isExpanded = expanded === request.id
            return (
              <div key={request.id} className="border-b border-border/50 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggle(request)}
                  aria-expanded={isExpanded}
                  className="grid w-full grid-cols-[90px_100px_1fr_100px] items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40"
                >
                  <span
                    className={`rounded border px-2 py-0.5 text-center text-[10px] uppercase tracking-wide ${statusTone(request)}`}
                  >
                    {request.overdue ? 'overdue' : STATUS_LABEL[request.status ?? 'queued']}
                  </span>

                  <span className="truncate text-xs text-foreground" title={request.to ?? undefined}>
                    {request.to ?? 'unknown'}
                  </span>

                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {request.hasAnswer && <span className="mr-1 text-green-400">✓</span>}
                    {request.question ?? '(no question text)'}
                  </span>

                  <span className="text-right text-xs tabular-nums text-muted-foreground">
                    {relativeDeadline(request.deadlineAt, request.overdue, now)}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-dashed border-border px-4 py-3 pl-[16px]">
                    {detailError && <p className="text-xs text-red-400">{detailError}</p>}
                    {!detail && !detailError && (
                      <p className="text-xs text-muted-foreground">Loading detail…</p>
                    )}
                    {detail && detail.id === request.id && (
                      <div className="space-y-2 text-xs">
                        <p className="text-muted-foreground">
                          from <span className="text-foreground">{detail.from ?? 'unknown'}</span> to{' '}
                          <span className="text-foreground">{detail.to ?? 'unknown'}</span>
                        </p>
                        <p className="whitespace-pre-wrap text-foreground">
                          {detail.question ?? '(no question text)'}
                        </p>
                        {detail.answer && (
                          <p className="whitespace-pre-wrap rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2 text-green-300">
                            {detail.answer}
                          </p>
                        )}
                        {(detail.evidence.length > 0 || detail.contextLinks.length > 0) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {[...detail.evidence, ...detail.contextLinks].map((link) => {
                              const href = safeEvidenceHref(link)
                              return href ? (
                                <a
                                  key={link}
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border border-border px-2 py-0.5 text-[11px] text-blue-400 hover:bg-secondary/40"
                                >
                                  view evidence ↗
                                </a>
                              ) : (
                                <span
                                  key={link}
                                  title="blocked: unsupported link scheme"
                                  className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground line-through"
                                >
                                  {link.slice(0, 40)}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
