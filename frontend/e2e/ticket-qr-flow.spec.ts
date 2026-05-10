import { expect, test } from '@playwright/test'
import { captureNamedScreenshot, enableVisualAuth } from './test-helpers'

test.describe('티켓 QR 플로우', () => {
  test('예약 티켓 필터가 전체와 사용 완료 목록을 올바르게 전환한다', async ({ page }, testInfo) => {
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

    await captureNamedScreenshot(page, testInfo)
  })

  test('사용 완료 필터 결과가 없으면 전용 빈 상태를 표시한다', async ({ page }, testInfo) => {
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

    await captureNamedScreenshot(page, testInfo)
  })

  test('예약 티켓에서 QR을 표시하고 마이티켓에서 검표 스캔 화면으로 이동한다', async ({ page }, testInfo) => {
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

    await captureNamedScreenshot(page, testInfo)
  })

  test('검표 실패 결과를 스캔 화면에 표시한다', async ({ page }, testInfo) => {
    await enableVisualAuth(page)

    await page.route('**/api/tickets**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 55,
            name: '실패 검표 티켓',
            venue: 'KSPO DOME',
            googlePlaceId: 'place-55',
            detailAddress: '게이트 3',
            validDate: '2026-09-02',
            openAt: '2026-09-02T09:00:00Z',
            status: 'VERIFYING',
            issuedCount: 10,
            totalCount: 50,
            allowDuplicate: false,
            maxPerUser: 1,
          },
        ]),
      })
    })

    await page.route('**/api/tickets/*/validations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: 'INVALID',
          message: '이미 사용 처리된 QR입니다.',
        }),
      })
    })

    await page.goto('/ko/my-tickets/55/scan', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('QR 토큰 입력').fill('used-token-55')
    await page.getByRole('button', { name: '검표 요청' }).click()

    await expect(page.getByText('INVALID')).toBeVisible()
    await expect(page.getByText('이미 사용 처리된 QR입니다.')).toBeVisible()

    await captureNamedScreenshot(page, testInfo)
  })
})
