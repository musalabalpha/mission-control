import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { getAgentRequestById, groupForStatus, sanitizeQuestion } from '@/lib/agent-requests'

/** GET /api/agent-requests/[requestId] — full detail for one request, including evidence links. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { requestId } = await params
    const found = getAgentRequestById(requestId)
    if (!found) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json({
      request: {
        ...found,
        question: sanitizeQuestion(found.question),
        group: groupForStatus(found.status),
      },
    })
  } catch (err) {
    logger.warn({ err }, 'failed to read agent request detail')
    return NextResponse.json({ error: 'Failed to read request' }, { status: 500 })
  }
}
