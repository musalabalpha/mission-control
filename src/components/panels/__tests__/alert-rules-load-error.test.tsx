// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }))
vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn().mockRejectedValue(new Error('boom')),
  ApiError: class extends Error {},
}))

import { AlertRulesPanel } from '../alert-rules-panel'

describe('AlertRulesPanel load failure', () => {
  it('muestra error, no «sin reglas», cuando la carga falla', async () => {
    render(<AlertRulesPanel />)
    expect(await screen.findByRole('alert')).toHaveTextContent('networkError')
    expect(screen.queryByText('noRulesConfigured')).toBeNull()
  })
})
