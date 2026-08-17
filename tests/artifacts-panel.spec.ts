import { expect, test, type Page } from '@playwright/test'

/**
 * Smoke E2E — Artefactos V1 (HLX-539)
 * Indexes a synthetic fixture via ARTIFACTS_DIR. Does not read ~/artifacts.
 * Does not wait for the remote iframe document to finish loading.
 */

const TEST_USER = process.env.AUTH_USER || 'testadmin'
const TEST_PASS = process.env.AUTH_PASS || 'testpass1234!'

async function dismissOnboardingAndLogin(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('mc-onboarding-dismissed', '1')
    } catch {
      /* private mode */
    }
  })
  const res = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER, password: TEST_PASS },
    headers: { 'x-forwarded-for': '10.88.88.11' },
  })
  if (!res.ok()) {
    throw new Error(`login failed: ${res.status()} ${await res.text()}`)
  }
}

async function openArtifacts(page: Page) {
  await dismissOnboardingAndLogin(page)
  await page.goto('/artifacts')
  const heading = page.getByRole('heading', { name: 'Artefactos' })
  const switchToFull = page.getByRole('button', { name: /Switch to Full/i })
  await expect(heading.or(switchToFull)).toBeVisible({ timeout: 45_000 })
  if (await switchToFull.isVisible()) {
    await switchToFull.click()
  }
  await expect(heading).toBeVisible()
}

test.describe('Artifacts panel', () => {
  test('desktop: list, source, search, zone filter, preview contract', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openArtifacts(page)

    await expect(page.getByText(/Fuente: Artifacts Server/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Panel vivo/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Spec title/ })).toBeVisible()

    const search = page.getByLabel('Buscar artefactos')
    await search.fill('Panel')
    await expect(page.getByRole('button', { name: /Panel vivo/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Spec title/ })).toHaveCount(0)

    await search.fill('')
    await page.getByRole('button', { name: /^Vivos/ }).click()
    await expect(page.getByRole('button', { name: /^Vivos/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /Panel vivo/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Spec title/ })).toHaveCount(0)

    await page.getByRole('button', { name: /Panel vivo/ }).click()

    const iframe = page.locator('iframe[title="Panel vivo"]')
    await expect(iframe).toHaveAttribute('src', /\/a\//)
    await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
    await expect(iframe).not.toHaveAttribute('sandbox', /allow-same-origin/)
    await expect(iframe).not.toHaveAttribute('sandbox', /allow-popups/)
    await expect(iframe).not.toHaveAttribute('sandbox', /allow-top-navigation/)
    await expect(iframe).not.toHaveAttribute('sandbox', /allow-forms/)

    await expect(page.getByRole('link', { name: /Abrir interactivo/ })).toHaveAttribute('href', /\/v\//)
  })

  test('mobile 390px: list, search, and preview stay usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openArtifacts(page)

    const search = page.getByLabel('Buscar artefactos')
    await expect(search).toBeVisible()
    await search.fill('Spec')
    await expect(page.getByRole('button', { name: /Spec title/ })).toBeVisible()

    await page.getByRole('button', { name: /Spec title/ }).click()
    await expect(page.locator('iframe[title="Spec title"]')).toHaveAttribute('src', /\/a\//)
    await expect(page.getByRole('link', { name: /Abrir interactivo/ })).toHaveAttribute('href', /\/v\//)

    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
    })
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 8)
  })
})
