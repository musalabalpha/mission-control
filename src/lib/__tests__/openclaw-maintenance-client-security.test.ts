import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('OpenClaw maintenance client contracts', () => {
  it('sends explicit confirmations from every maintenance action', () => {
    const root = process.cwd()
    const updateBanner = readFileSync(join(root, 'src/components/layout/openclaw-update-banner.tsx'), 'utf8')
    const doctorBanner = readFileSync(join(root, 'src/components/layout/openclaw-doctor-banner.tsx'), 'utf8')
    const runtimeSetup = readFileSync(join(root, 'src/components/onboarding/runtime-setup-modal.tsx'), 'utf8')

    expect(updateBanner).toContain("confirmation: 'update_openclaw'")
    expect(runtimeSetup).toContain("confirmation: 'fix_openclaw'")

    // Fork divergence (docs/FORK.md): the Doctor "Fix" button is deliberately
    // removed from this banner — it must stay inert. Upstream ships a handleFix
    // that POSTs confirmation: 'fix_openclaw'. The invariant this test protects
    // is "no maintenance action fires without an explicit confirmation", so here
    // we assert the stronger property: the banner performs no fix action at all.
    expect(doctorBanner).not.toContain('handleFix')
    expect(doctorBanner).not.toContain("method: 'POST'")
  })
})
