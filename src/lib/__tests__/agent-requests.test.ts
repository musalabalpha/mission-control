import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  getAgentRequestById,
  groupAgentRequests,
  groupForStatus,
  isOverdue,
  readAgentRequests,
  sanitizeQuestion,
  type AgentRequest,
} from '@/lib/agent-requests'

let tempDir = ''
let inboxPath = ''

function writeLines(lines: string[]): void {
  writeFileSync(inboxPath, lines.join('\n'), 'utf8')
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mc-agent-requests-test-'))
  inboxPath = join(tempDir, 'requests.jsonl')
  process.env.AGENT_REQUEST_INBOX = inboxPath
})

afterEach(() => {
  delete process.env.AGENT_REQUEST_INBOX
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

describe('readAgentRequests — local mode', () => {
  it('returns an empty list when the JSONL file does not exist, without crashing', () => {
    expect(readAgentRequests()).toEqual([])
  })
})

describe('readAgentRequests — folding', () => {
  it('folds multiple events for the same id, last event wins per field', () => {
    writeLines([
      JSON.stringify({
        id: 'req-1',
        from: 'aegis',
        to: 'musa',
        question: 'Ship the release?',
        deadline_at: '2026-08-01T00:00:00.000Z',
        status: 'queued',
      }),
      JSON.stringify({ id: 'req-1', status: 'delivered' }),
      JSON.stringify({ id: 'req-1', status: 'acknowledged' }),
      JSON.stringify({
        id: 'req-1',
        status: 'answered',
        answer: 'Yes, go ahead.',
        evidence: ['linear://HLX-461'],
      }),
    ])

    const [request] = readAgentRequests()
    expect(request.id).toBe('req-1')
    expect(request.status).toBe('answered')
    // Fields not present on later events must survive from earlier ones.
    expect(request.from).toBe('aegis')
    expect(request.to).toBe('musa')
    expect(request.question).toBe('Ship the release?')
    expect(request.answer).toBe('Yes, go ahead.')
    expect(request.evidence).toEqual(['linear://HLX-461'])
  })

  it('accepts request_id as an alias for id', () => {
    writeLines([JSON.stringify({ request_id: 'req-2', status: 'queued', to: 'musa' })])
    const [request] = readAgentRequests()
    expect(request.id).toBe('req-2')
  })

  it('skips corrupt lines without crashing and keeps the valid ones', () => {
    writeLines([
      JSON.stringify({ id: 'req-1', status: 'queued', to: 'musa' }),
      '{not valid json',
      '',
      '   ',
      JSON.stringify({ id: 'req-2', status: 'blocked', to: 'aegis' }),
      '"just a string"',
      '42',
    ])

    const requests = readAgentRequests()
    expect(requests.map((r) => r.id).sort()).toEqual(['req-1', 'req-2'])
  })

  it('ignores events with no id', () => {
    writeLines([JSON.stringify({ status: 'queued', to: 'musa' })])
    expect(readAgentRequests()).toEqual([])
  })

  it('ignores an unknown status value rather than inventing a state', () => {
    writeLines([
      JSON.stringify({ id: 'req-1', status: 'queued' }),
      JSON.stringify({ id: 'req-1', status: 'not-a-real-status' }),
    ])
    const [request] = readAgentRequests()
    expect(request.status).toBe('queued')
  })
})

describe('groupForStatus', () => {
  it('maps every status to its UI group', () => {
    expect(groupForStatus('queued')).toBe('waiting')
    expect(groupForStatus('delivered')).toBe('waiting')
    expect(groupForStatus('acknowledged')).toBe('waiting')
    expect(groupForStatus('answered')).toBe('answered')
    expect(groupForStatus('no_context')).toBe('answered')
    expect(groupForStatus('blocked')).toBe('blocked')
    expect(groupForStatus('expired')).toBe('expired')
    expect(groupForStatus(null)).toBe(null)
  })
})

describe('isOverdue', () => {
  const base: AgentRequest = {
    id: 'req-1',
    from: 'aegis',
    to: 'musa',
    question: 'q',
    deadlineAt: '2026-01-01T00:00:00.000Z',
    contextLinks: [],
    status: 'delivered',
    answer: null,
    evidence: [],
    overdue: false,
  }
  const past = new Date('2026-01-02T00:00:00.000Z').getTime()
  const future = new Date('2025-12-31T00:00:00.000Z').getTime()

  it('is true when the deadline passed and no terminal event exists yet', () => {
    expect(isOverdue(base, past)).toBe(true)
  })

  it('is false before the deadline', () => {
    expect(isOverdue(base, future)).toBe(false)
  })

  it('never marks a terminal request as overdue, even past its deadline', () => {
    expect(isOverdue({ ...base, status: 'answered' }, past)).toBe(false)
    expect(isOverdue({ ...base, status: 'blocked' }, past)).toBe(false)
    expect(isOverdue({ ...base, status: 'expired' }, past)).toBe(false)
  })

  it('is false when there is no deadline', () => {
    expect(isOverdue({ ...base, deadlineAt: null }, past)).toBe(false)
  })

  it('readAgentRequests computes overdue without inventing a new status', () => {
    writeLines([
      JSON.stringify({
        id: 'req-1',
        status: 'delivered',
        deadline_at: '2020-01-01T00:00:00.000Z',
      }),
    ])
    const [request] = readAgentRequests(Date.now())
    expect(request.overdue).toBe(true)
    expect(request.status).toBe('delivered') // status itself is untouched
  })
})

describe('groupAgentRequests', () => {
  it('buckets by group and sorts waiting by soonest deadline first', () => {
    const requests: AgentRequest[] = [
      { id: 'a', from: null, to: null, question: null, deadlineAt: '2026-01-10T00:00:00Z', contextLinks: [], status: 'queued', answer: null, evidence: [], overdue: false },
      { id: 'b', from: null, to: null, question: null, deadlineAt: '2026-01-05T00:00:00Z', contextLinks: [], status: 'delivered', answer: null, evidence: [], overdue: false },
      { id: 'c', from: null, to: null, question: null, deadlineAt: null, contextLinks: [], status: 'answered', answer: 'ok', evidence: [], overdue: false },
      { id: 'd', from: null, to: null, question: null, deadlineAt: null, contextLinks: [], status: 'blocked', answer: null, evidence: [], overdue: false },
      { id: 'e', from: null, to: null, question: null, deadlineAt: null, contextLinks: [], status: 'expired', answer: null, evidence: [], overdue: false },
    ]

    const grouped = groupAgentRequests(requests)
    expect(grouped.waiting.map((r) => r.id)).toEqual(['b', 'a']) // soonest deadline first
    expect(grouped.answered.map((r) => r.id)).toEqual(['c'])
    expect(grouped.blocked.map((r) => r.id)).toEqual(['d'])
    expect(grouped.expired.map((r) => r.id)).toEqual(['e'])
  })
})

describe('sanitizeQuestion', () => {
  it('passes short questions through unchanged', () => {
    expect(sanitizeQuestion('short question')).toBe('short question')
  })

  it('truncates to 300 chars', () => {
    const long = 'x'.repeat(500)
    const result = sanitizeQuestion(long)
    expect(result?.length).toBe(301) // 300 chars + ellipsis
    expect(result?.startsWith('x'.repeat(300))).toBe(true)
  })

  it('passes through null', () => {
    expect(sanitizeQuestion(null)).toBe(null)
  })
})

describe('getAgentRequestById', () => {
  it('returns the folded request by id', () => {
    writeLines([JSON.stringify({ id: 'req-9', status: 'blocked', to: 'musa' })])
    expect(getAgentRequestById('req-9')?.status).toBe('blocked')
  })

  it('returns null for an unknown id', () => {
    writeLines([JSON.stringify({ id: 'req-9', status: 'blocked' })])
    expect(getAgentRequestById('nope')).toBe(null)
  })
})
