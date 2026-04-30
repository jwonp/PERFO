import { expect, test, type Page } from '@playwright/test'

async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}

test.describe('티켓 QR 플로우', () => {
  test('예약 티켓 필터가 전체와 사용 완료 목록을 올바르게 전환한다', async ({ page }) => {
    await enableVisualAuth(page)

    await page.route('**/api/reservations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: '대기중 티켓',
            ticketNumber: 12,
            totalCount: 100,
            venue: '잠실실내체육관',
            validDate: '2026-09-01',
            ticketingStatus: 'SUCCESS',
            usageStatus: 'MY_TURN',
          },
          {
            id: 2,
            name: '사용 완료 티켓',
            ticketNumber: 13,
            totalCount: 100,
            venue: 'KSPO DOME',
            validDate: '2026-09-01',
            ticketingStatus: 'SUCCESS',
            usageStatus: 'USED',
          },
        ]),
      })
    })

    await page.goto('/ko/reserved', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('대기중 티켓')).toBeVisible()
    await expect(page.getByText('사용 완료 티켓')).toBeVisible()

    await page.getByRole('button', { name: '사용 완료' }).click()
    await expect(page.getByText('사용 완료 티켓')).toBeVisible()
    await expect(page.getByText('대기중 티켓')).not.toBeVisible()

    await page.getByRole('button', { name: '전체' }).click()
    await expect(page.getByText('대기중 티켓')).toBeVisible()
    await expect(page.getByText('사용 완료 티켓')).toBeVisible()
  })

  test('사용 완료 필터 결과가 없으면 전용 빈 상태를 표시한다', async ({ page }) => {
    await enableVisualAuth(page)

    await page.route('**/api/reservations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: '대기중 티켓',
            ticketNumber: 12,
            totalCount: 100,
            venue: '잠실실내체육관',
            validDate: '2026-09-01',
            ticketingStatus: 'SUCCESS',
            usageStatus: 'MY_TURN',
          },
        ]),
      })
    })

    await page.goto('/ko/reserved', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '사용 완료' }).click()
    await expect(page.getByText('아직 사용 완료된 티켓이 없습니다')).toBeVisible()
    await expect(page.getByText('대기중 티켓')).not.toBeVisible()
  })

  test('예약 티켓에서 QR을 표시하고 마이티켓에서 검표 스캔 화면으로 이동한다', async ({ page }) => {
    await enableVisualAuth(page)

    await page.route('**/api/reservations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 42,
            name: 'QR 테스트 티켓',
            ticketNumber: 42,
            totalCount: 100,
            venue: '잠실실내체육관',
            validDate: '2026-09-01',
            ticketingStatus: 'SUCCESS',
            usageStatus: 'MY_TURN',
          },
        ]),
      })
    })

    await page.route('**/api/tickets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 42,
            name: '검표용 티켓',
            venue: '잠실실내체육관',
            googlePlaceId: 'place-42',
            detailAddress: '1층 입구',
            validDate: '2026-09-01',
            openAt: '2026-09-01T09:00:00Z',
            status: 'VERIFYING',
            issuedCount: 25,
            totalCount: 100,
            allowDuplicate: true,
            maxPerUser: 2,
          },
        ]),
      })
    })

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

    await page.getByRole('link', { name: '검표' }).first().click()
    await expect(page).toHaveURL(/\/ko\/my-tickets\/\d+\/scan/)

    await page.getByPlaceholder('QR 토큰 입력').fill(['qr', 'token', 'test', '42'].join('-'))
    await page.getByRole('button', { name: '검표 요청' }).click()

    await expect(page.getByText('SUCCESS')).toBeVisible()
    expect(validationCalled).toBeTruthy()
  })
})
