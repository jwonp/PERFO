import { expect, test, type Page } from '@playwright/test'
const protectedRoutes = [
  { name: 'design-system', path: '/ko/design-system' },
  { name: 'reserved', path: '/ko/reserved' },
  { name: 'my-tickets', path: '/ko/my-tickets' },
  { name: 'profile', path: '/ko/profile' },
]

const authRoutes = [
  { name: 'login', path: '/ko/login' },
  { name: 'password-login', path: '/ko/login/password' },
  { name: 'signup', path: '/ko/signup' },
  { name: 'verify', path: '/ko/verify' },
  { name: 'reset-password', path: '/ko/reset-password' },
  { name: 'signup-complete', path: '/ko/signup/complete' },
  { name: 'reset-complete', path: '/ko/reset-password/complete' },
]

async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}

test.describe('design system visual QA', () => {
  test('captures auth flow screens on desktop and mobile', async ({ page }, testInfo) => {
    for (const route of authRoutes) {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto(route.path, { waitUntil: 'networkidle' })
      await expect(page.locator('body')).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`${route.name}-desktop.png`), fullPage: true })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(route.path, { waitUntil: 'networkidle' })
      await expect(page.locator('body')).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`${route.name}-mobile.png`) })
    }
  })

  test('captures protected product screens with a seeded session', async ({ page }, testInfo) => {
    await enableVisualAuth(page)

    for (const route of protectedRoutes) {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto(route.path, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(new RegExp(route.path))
      await expect(page.locator('body')).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`${route.name}-desktop.png`), fullPage: true })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(route.path, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(new RegExp(route.path))
      await expect(page.locator('body')).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`${route.name}-mobile.png`) })
    }
  })
})
