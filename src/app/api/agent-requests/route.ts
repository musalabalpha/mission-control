import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  groupForStatus,
  readAgentRequests,
  sanitizeQuestion,
  type AgentRequest,
  type AgentRequestGroup,
} from '@/lib/agent-requests'

export interface AgentRequestSummary {
  id: string
  from: string | null
  to: string | null
  question: string | null
  deadlineAt: string | null
  status: AgentRequest['status']
  group: AgentRequestGroup | null
  overdue: boolean
  hasAnswer: boolean
}

function toSummary(request: AgentRequest): AgentRequestSummary {
  return {
    id: request.id,
    from: request.from,
    to: request.to,
    question: sanitizeQuestion(request.question),
    deadlineAt: request.deadlineAt,
    status: request.status,
    group: groupForStatus(request.status),
    overdue: request.overdue,
    hasAnswer: Boolean(request.answer),
  }
}

/** GET /api/agent-requests — folded, grouped view of the dispatch inbox (HLX-461). */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const requests = readAgentRequests().map(toSummary)
    return NextResponse.json({ requests })
  } catch (err) {
    logger.warn({ err }, 'failed to read agent requests inbox')
    return NextResponse.json({ requests: [] })
  }
}
