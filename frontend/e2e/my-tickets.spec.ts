import { expect, type Page, test } from '@playwright/test'

async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}

test.describe('ticket issue flow', () => {
  test('issuer selects a Google Maps venue, enters a detail address, and creates a ticket', async ({ page }) => {
    await enableVisualAuth(page)
    await page.goto('/ko/my-tickets', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '티켓 발급' }).click()

    await expect(page.getByRole('heading', { name: '티켓 발급' })).toBeVisible()
    await expect(page.getByLabel('세부 주소')).toBeVisible()

    await page.getByLabel('티켓 이름').fill('PERFO E2E Ticket')
    await page.getByLabel('사용 장소').fill('올림픽공원 체조경기장')
    await page.getByLabel('세부 주소').fill('2층 A게이트 앞')
    await page.getByLabel('유효 날짜').fill('2026-08-15')
    await page.getByLabel('총 티켓 수').fill('100')

    await expect(page.getByRole('link', { name: 'Google Maps로 장소 선택' })).toHaveAttribute(
      'href',
      /https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/
    )

    await page.getByRole('button', { name: '발급하기' }).click()

    const ticket = page.locator('article').filter({ hasText: 'PERFO E2E Ticket' })
    await expect(ticket).toContainText('올림픽공원 체조경기장')
    await expect(ticket).toContainText('2층 A게이트 앞')
  })
})
