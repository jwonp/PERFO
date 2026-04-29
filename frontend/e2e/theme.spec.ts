import { expect, test, type Page } from '@playwright/test'

async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}

test.describe('테마 선호 설정', () => {
  test('프로필 다크 모드 토글은 html 클래스에 반영되고 새로고침 후에도 유지된다', async ({ page }) => {
    await enableVisualAuth(page)
    await page.goto('/ko/profile', { waitUntil: 'networkidle' })

    const themeToggle = page.getByRole('switch', { name: /다크 모드/i })

    await themeToggle.click()

    await expect.poll(async () =>
      page.evaluate(() => ({
        isDark: document.documentElement.classList.contains('dark'),
        preference: window.localStorage.getItem('perfo-theme'),
      }))
    ).toEqual({ isDark: true, preference: 'dark' })

    await page.reload({ waitUntil: 'networkidle' })

    await expect.poll(async () =>
      page.evaluate(() => ({
        isDark: document.documentElement.classList.contains('dark'),
        preference: window.localStorage.getItem('perfo-theme'),
      }))
    ).toEqual({ isDark: true, preference: 'dark' })
  })

  test('저장된 테마 선호가 없으면 OS 컬러 스킴을 따른다', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()

    await enableVisualAuth(page)
    await page.goto('/ko/profile', { waitUntil: 'domcontentloaded' })

    await page.evaluate(() => {
      window.localStorage.removeItem('perfo-theme')
    })
    await page.reload({ waitUntil: 'networkidle' })

    await expect.poll(async () =>
      page.evaluate(() => ({
        isDark: document.documentElement.classList.contains('dark'),
        preference: window.localStorage.getItem('perfo-theme'),
      }))
    ).toEqual({ isDark: true, preference: null })

    await context.close()
  })
})
