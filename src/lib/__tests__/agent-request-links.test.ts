import { describe, expect, it } from 'vitest'
import { safeEvidenceHref } from '../agent-request-links'

describe('safeEvidenceHref', () => {
  it('passes https URLs through unchanged', () => {
    expect(safeEvidenceHref('https://github.com/x/pull/1')).toBe('https://github.com/x/pull/1')
  })

  it('passes http URLs through unchanged', () => {
    expect(safeEvidenceHref('http://localhost:3000/docs')).toBe('http://localhost:3000/docs')
  })

  it('rewrites linear:// links to the Linear web UI', () => {
    expect(safeEvidenceHref('linear://HLX-458')).toBe('https://linear.app/musalab/issue/HLX-458')
  })

  it('blocks javascript: URLs', () => {
    expect(safeEvidenceHref('javascript:alert(1)')).toBeNull()
  })

  it('blocks data: URLs', () => {
    expect(safeEvidenceHref('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('blocks file: and other schemes', () => {
    expect(safeEvidenceHref('file:///etc/passwd')).toBeNull()
    expect(safeEvidenceHref('vbscript:x')).toBeNull()
  })

  it('blocks malformed linear ids instead of rewriting them', () => {
    expect(safeEvidenceHref('linear://javascript:alert(1)')).toBeNull()
    expect(safeEvidenceHref('linear://HLX-458/../../evil')).toBeNull()
  })

  it('blocks non-URL garbage', () => {
    expect(safeEvidenceHref('not a url')).toBeNull()
  })

  it('blocks scheme-confusion via leading whitespace', () => {
    expect(safeEvidenceHref('  javascript:alert(1)')).toBeNull()
  })
})
