import { expect, test, type Page } from '@playwright/test'

async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}

test.describe('티켓 QR 플로우', () => {
  test('예약 티켓에서 QR을 표시하고 마이티켓에서 검표 스캔 화면으로 이동한다', async ({ page }) => {
    await enableVisualAuth(page)

    await page.route('**/api/reservations/*/qr-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: ['qr', 'token', 'test', '42'].join('-'),
          expiresAt: '2026-04-28T12:00:30Z',
        }),
      })
    })

    await page.goto('/ko/reserved', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'QR 표시' }).first().click()
    await expect(page).toHaveURL(/\/ko\/reserved\/\d+/)
    await expect(page.getByText('qr-token-test-42')).toBeVisible()

    let validationCalled = false
    await page.route('**/api/tickets/*/validations', async (route) => {
      validationCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: 'SUCCESS', ticketNumber: 121, usedAt: '2026-04-28T12:00:10Z' }),
      })
    })

    await page.goto('/ko/my-tickets', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '검표' }).first().click()
    await expect(page).toHaveURL(/\/ko\/my-tickets\/\d+\/scan/)

    await page.getByPlaceholder('QR 토큰 입력').fill(['qr', 'token', 'test', '42'].join('-'))
    await page.getByRole('button', { name: '검표 요청' }).click()

    await expect(page.getByText('SUCCESS')).toBeVisible()
    expect(validationCalled).toBeTruthy()
  })
})
