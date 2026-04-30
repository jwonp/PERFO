import { expect, type Page, test } from '@playwright/test'

async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}

test.describe('티켓 발급 플로우', () => {
  test('발급 티켓 필터가 중복 허용 여부에 따라 목록을 전환한다', async ({ page }) => {
    await enableVisualAuth(page)

    await page.route('**/api/tickets**', async (route) => {
      const request = route.request()

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              name: '중복 허용 티켓',
              venue: '잠실실내체육관',
              googlePlaceId: 'place-1',
              detailAddress: '1층',
              validDate: '2026-09-01',
              openAt: '2026-09-01T09:00:00Z',
              status: 'VERIFYING',
              issuedCount: 25,
              totalCount: 100,
              allowDuplicate: true,
              maxPerUser: 2,
            },
            {
              id: 2,
              name: '중복 미허용 티켓',
              venue: 'KSPO DOME',
              googlePlaceId: 'place-2',
              detailAddress: '2층',
              validDate: '2026-09-02',
              openAt: '2026-09-02T09:00:00Z',
              status: 'ISSUING',
              issuedCount: 10,
              totalCount: 50,
              allowDuplicate: false,
              maxPerUser: 1,
            },
          ]),
        })
        return
      }

      await route.fallback()
    })

    await page.goto('/ko/my-tickets', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('중복 허용 티켓')).toBeVisible()
    await expect(page.getByText('중복 미허용 티켓')).toBeVisible()

    await page.getByRole('button', { name: '중복 허용' }).click()
    await expect(page.getByText('중복 허용 티켓')).toBeVisible()
    await expect(page.getByText('중복 미허용 티켓')).not.toBeVisible()

    await page.getByRole('button', { name: '중복 미허용' }).click()
    await expect(page.getByText('중복 허용 티켓')).not.toBeVisible()
    await expect(page.getByText('중복 미허용 티켓')).toBeVisible()
  })

  test('발급자는 사용 장소와 세부 주소를 입력해 티켓을 발급할 수 있다', async ({ page }) => {
    await enableVisualAuth(page)
    let createdPayload: Record<string, unknown> | null = null

    await page.route('**/api/tickets**', async (route) => {
      const request = route.request()

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
        return
      }

      if (request.method() === 'POST') {
        createdPayload = request.postDataJSON() as Record<string, unknown>
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 999,
            ...createdPayload,
            status: 'INACTIVE',
            issuedCount: 0,
            ownerUserId: 'user-1',
            imageUrl: null,
          }),
        })
        return
      }

      await route.fallback()
    })

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

    await page.getByRole('button', { name: '발급하기' }).click()

    const ticket = page.locator('article').filter({ hasText: 'PERFO E2E Ticket' })
    await expect(ticket).toContainText('올림픽공원 체조경기장')
    await expect(ticket).toContainText('2층 A게이트 앞')
    expect(createdPayload).toMatchObject({
      name: 'PERFO E2E Ticket',
      venue: '올림픽공원 체조경기장',
      detailAddress: '2층 A게이트 앞',
      validDate: '2026-08-15',
      totalCount: 100,
      allowDuplicate: false,
      maxPerUser: 1,
    })
  })

  test('발급자는 기존 티켓의 상태와 오픈 시각을 수정할 수 있다', async ({ page }) => {
    await enableVisualAuth(page)
    let updatedPayload: Record<string, unknown> | null = null

    await page.route('**/api/tickets**', async (route) => {
      const request = route.request()
      const url = request.url()

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 42,
              name: 'Editable Ticket',
              venue: '잠실실내체육관',
              googlePlaceId: 'ChIJBACKEND',
              detailAddress: '1층 입구',
              validDate: '2026-09-01',
              openAt: '2026-09-01T09:00:00Z',
              imageUrl: '/api/tickets/42/image',
              status: 'ISSUING',
              issuedCount: 25,
              totalCount: 100,
              allowDuplicate: true,
              maxPerUser: 2,
            },
          ]),
        })
        return
      }

      if (request.method() === 'PATCH' && url.endsWith('/api/tickets/42')) {
        updatedPayload = request.postDataJSON() as Record<string, unknown>
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 42,
            ...updatedPayload,
            imageUrl: '/api/tickets/42/image',
            issuedCount: 25,
            ownerUserId: 'user-1',
          }),
        })
        return
      }

      await route.fallback()
    })

    await page.goto('/ko/my-tickets', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '수정' }).click()
    await page.getByLabel('티켓 이름').fill('Edited E2E Ticket')
    await page.getByLabel('운영 상태').selectOption('VERIFYING')
    await page.getByRole('button', { name: '저장' }).click()

    const ticket = page.locator('article').filter({ hasText: 'Edited E2E Ticket' })
    await expect(ticket).toContainText('검표중')
    expect(updatedPayload).toMatchObject({
      name: 'Edited E2E Ticket',
      status: 'VERIFYING',
    })
  })

  test('이미지 업로드 후 저장 실패 시 cleanup API를 호출한다', async ({ page }) => {
    await enableVisualAuth(page)
    let cleanupRequested = false

    await page.route('**/api/tickets**', async (route) => {
      const request = route.request()
      const url = request.url()

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 42,
              name: 'Cleanup Ticket',
              venue: '잠실실내체육관',
              googlePlaceId: 'ChIJBACKEND',
              detailAddress: '1층 입구',
              validDate: '2026-09-01',
              openAt: '2026-09-01T09:00:00Z',
              imageKey: 'owner-1/42/original.png',
              imageUrl: '/api/tickets/42/image',
              status: 'ISSUING',
              issuedCount: 25,
              totalCount: 100,
              allowDuplicate: true,
              maxPerUser: 2,
            },
          ]),
        })
        return
      }

      if (request.method() === 'POST' && url.endsWith('/api/tickets/42/image')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            imageKey: 'owner-1/42/new.png',
            imageUrl: '/api/tickets/42/image',
          }),
        })
        return
      }

      if (request.method() === 'PATCH' && url.endsWith('/api/tickets/42')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'patch failed' }),
        })
        return
      }

      if (request.method() === 'DELETE' && url.includes('/api/tickets/42/image?imageKey=')) {
        cleanupRequested = true
        await route.fulfill({
          status: 204,
          body: '',
        })
        return
      }

      await route.fallback()
    })

    await page.goto('/ko/my-tickets', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '수정' }).click()
    await page.getByLabel('대표 이미지').setInputFiles({
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    })
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByText('patch failed')).toBeVisible()
    expect(cleanupRequested).toBe(true)
  })
})
