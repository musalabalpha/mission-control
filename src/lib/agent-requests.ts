/**
 * Agent Requests reader (HLX-461).
 *
 * Source of truth is an append-only JSONL event log written by OpenClaw's
 * dispatch layer (HLX-460 / helix-ecosystem PR#142):
 *
 *   ~/.openclaw/workspace/output/dispatch/requests.jsonl
 *   (override with AGENT_REQUEST_INBOX)
 *
 * Each line is an event, not a snapshot. The current state of a request is
 * obtained by folding all of its events by id — the last event wins per
 * field. This module owns that fold; nothing downstream should read the
 * JSONL directly.
 *
 * Status machine (frozen contract, do not add states here):
 *   queued -> delivered -> acknowledged -> answered | no_context | blocked | expired
 * The first three are non-terminal ("waiting"); the last four are terminal.
 */

import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type AgentRequestStatus =
  | 'queued'
  | 'delivered'
  | 'acknowledged'
  | 'answered'
  | 'no_context'
  | 'blocked'
  | 'expired'

/** UI grouping — coarser than the raw status, matches how Musa scans the panel. */
export type AgentRequestGroup = 'waiting' | 'answered' | 'blocked' | 'expired'

export interface AgentRequest {
  id: string
  from: string | null
  to: string | null
  question: string | null
  deadlineAt: string | null
  contextLinks: string[]
  status: AgentRequestStatus | null
  answer: string | null
  evidence: string[]
  /**
   * Computed, not stored: deadline has passed but no `expired` event has
   * landed yet. Never written back into the fold — the data model has no
   * "overdue" status, only queued/delivered/acknowledged with a late clock.
   */
  overdue: boolean
}

const VALID_STATUSES: ReadonlySet<AgentRequestStatus> = new Set([
  'queued',
  'delivered',
  'acknowledged',
  'answered',
  'no_context',
  'blocked',
  'expired',
])

const WAITING_STATUSES: ReadonlySet<AgentRequestStatus> = new Set([
  'queued',
  'delivered',
  'acknowledged',
])

const ANSWERED_STATUSES: ReadonlySet<AgentRequestStatus> = new Set(['answered', 'no_context'])

export function groupForStatus(status: AgentRequestStatus | null): AgentRequestGroup | null {
  if (status === null) return null
  if (WAITING_STATUSES.has(status)) return 'waiting'
  if (ANSWERED_STATUSES.has(status)) return 'answered'
  if (status === 'blocked') return 'blocked'
  if (status === 'expired') return 'expired'
  return null
}

export function agentRequestInboxPath(): string {
  const override = (process.env.AGENT_REQUEST_INBOX || '').trim()
  if (override) return override
  return path.join(os.homedir(), '.openclaw', 'workspace', 'output', 'dispatch', 'requests.jsonl')
}

function extractId(raw: Record<string, unknown>): string | null {
  const candidate = raw.request_id ?? raw.id
  if (typeof candidate === 'string' && candidate.trim()) return candidate
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate)
  return null
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((v): v is string => typeof v === 'string')
}

function emptyRequest(id: string): AgentRequest {
  return {
    id,
    from: null,
    to: null,
    question: null,
    deadlineAt: null,
    contextLinks: [],
    status: null,
    answer: null,
    evidence: [],
    overdue: false,
  }
}

/**
 * Fold every JSONL line into one state per request id. Corrupt lines (bad
 * JSON, non-object, missing id) are skipped — a single truncated write must
 * never take the whole panel down.
 */
function foldEvents(raw: string): Map<string, AgentRequest> {
  const byId = new Map<string, AgentRequest>()

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (typeof parsed !== 'object' || parsed === null) continue

    const event = parsed as Record<string, unknown>
    const id = extractId(event)
    if (!id) continue

    const prev = byId.get(id) ?? emptyRequest(id)
    const next: AgentRequest = { ...prev }

    if (typeof event.from === 'string') next.from = event.from
    if (typeof event.to === 'string') next.to = event.to
    if (typeof event.question === 'string') next.question = event.question
    if (typeof event.deadline_at === 'string') next.deadlineAt = event.deadline_at
    const contextLinks = toStringArray(event.context_links)
    if (contextLinks) next.contextLinks = contextLinks
    if (typeof event.status === 'string' && VALID_STATUSES.has(event.status as AgentRequestStatus)) {
      next.status = event.status as AgentRequestStatus
    }
    if (typeof event.answer === 'string') next.answer = event.answer
    const evidence = toStringArray(event.evidence)
    if (evidence) next.evidence = evidence

    byId.set(id, next)
  }

  return byId
}

export function isOverdue(request: AgentRequest, now: number): boolean {
  if (groupForStatus(request.status) !== 'waiting') return false
  if (!request.deadlineAt) return false
  const deadline = Date.parse(request.deadlineAt)
  if (Number.isNaN(deadline)) return false
  return deadline < now
}

/** Reads and folds the inbox. Missing file (local mode) -> empty list, not an error. */
export function readAgentRequests(now: number = Date.now()): AgentRequest[] {
  const filePath = agentRequestInboxPath()
  if (!existsSync(filePath)) return []

  let raw: string
  try {
    raw = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  return Array.from(foldEvents(raw).values()).map((request) => ({
    ...request,
    overdue: isOverdue(request, now),
  }))
}

export function getAgentRequestById(id: string, now: number = Date.now()): AgentRequest | null {
  return readAgentRequests(now).find((request) => request.id === id) ?? null
}

/** Groups + sorts for display: waiting is deadline-ascending (most urgent first), everything else newest-first. */
export function groupAgentRequests(
  requests: AgentRequest[]
): Record<AgentRequestGroup, AgentRequest[]> {
  const groups: Record<AgentRequestGroup, AgentRequest[]> = {
    waiting: [],
    answered: [],
    blocked: [],
    expired: [],
  }

  for (const request of requests) {
    const group = groupForStatus(request.status)
    if (group) groups[group].push(request)
  }

  groups.waiting.sort((a, b) => {
    const aTime = a.deadlineAt ? Date.parse(a.deadlineAt) : Infinity
    const bTime = b.deadlineAt ? Date.parse(b.deadlineAt) : Infinity
    return (Number.isNaN(aTime) ? Infinity : aTime) - (Number.isNaN(bTime) ? Infinity : bTime)
  })
  groups.answered.reverse()
  groups.blocked.reverse()
  groups.expired.reverse()

  return groups
}

/** Truncates untrusted free-text before it leaves the server — never ship a raw event dump. */
export function sanitizeQuestion(question: string | null, maxLength = 300): string | null {
  if (!question) return null
  return question.length > maxLength ? `${question.slice(0, maxLength)}…` : question
}
