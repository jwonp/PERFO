import { expect, test, type Page } from '@playwright/test'
const protectedRoutes = [
  { name: 'design-system', path: '/ko/design-system' },
  { name: 'reserved', path: '/ko/reserved' },
  { name: 'my-tickets', path: '/ko/my-tickets' },
  { name: 'profile', path: '/ko/profile' },
]

const authRoutes = [
  { name: 'login', path: '/ko/login' },
]

async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}

test.describe('디자인 시스템 시각 회귀', () => {
  test('인증 플로우 화면을 데스크톱과 모바일에서 캡처한다', async ({ page }, testInfo) => {
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

  test('시드 세션으로 보호된 제품 화면을 데스크톱과 모바일에서 캡처한다', async ({ page }, testInfo) => {
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
