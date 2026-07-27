/**
 * Client-safe evidence-link sanitizer for the agent requests panel (HLX-461).
 *
 * Kept separate from agent-requests.ts because that module imports node:fs
 * (server-only) and this one is consumed by a 'use client' component.
 */

const LINEAR_LINK_RE = /^linear:\/\/(HLX-\d+)$/

/**
 * Evidence links come from the bus JSONL, which is untrusted input: a
 * javascript:/data: URL rendered into an href is stored XSS. Only http(s)
 * survives as a clickable href; linear://HLX-n is rewritten to the web UI.
 * Anything else returns null and must be rendered as inert text.
 */
export function safeEvidenceHref(link: string): string | null {
  const linear = LINEAR_LINK_RE.exec(link.trim())
  if (linear) return `https://linear.app/musalab/issue/${linear[1]}`
  let parsed: URL
  try {
    parsed = new URL(link)
  } catch {
    return null
  }
  return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? link : null
}
