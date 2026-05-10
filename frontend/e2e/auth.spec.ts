import { expect, test } from '@playwright/test'
import { captureNamedScreenshot } from './test-helpers'

test.describe('인증 진입 플로우', () => {
  test('비로그인 사용자는 랜딩과 로그인 진입 화면을 열 수 있다', async ({ page }, testInfo) => {
    await page.goto('/ko', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'PERFO' })).toBeVisible()
    await expect(page.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/ko/login')

    await page.goto('/ko/login', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
    await expect(page.getByRole('button', { name: '다음' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible()
    await expect(page.getByRole('button', { name: '네이버로 계속하기' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'LINE으로 계속하기' })).toBeVisible()

    await captureNamedScreenshot(page, testInfo)
  })

  test('비로그인 사용자는 회원가입 화면에 직접 진입할 수 있다', async ({ page }, testInfo) => {
    await page.goto('/ko/signup?email=new%40example.com', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: '가입하기' })).toBeVisible()
    await expect(page.getByLabel('이름')).toBeVisible()
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible()
    await expect(page.locator('#confirm-password')).toBeVisible()

    await captureNamedScreenshot(page, testInfo)
  })

  test('비로그인 사용자는 비밀번호를 재설정하고 완료 화면으로 이동할 수 있다', async ({ page }, testInfo) => {
    await page.route('**/api/auth/verification-codes/request', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: 'member@example.com',
          purpose: 'PASSWORD_RESET',
          expiresAt: '2026-05-10T12:00:00Z',
          previewCode: '112233',
        }),
      })
    })

    await page.route('**/api/auth/verification-codes/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: 'member@example.com',
          purpose: 'PASSWORD_RESET',
          verificationToken: 'reset-token-123',
        }),
      })
    })

    await page.route('**/api/auth/password-reset', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/ko/verify?email=member%40example.com&mode=reset', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('테스트용 인증 코드: 112233')).toBeVisible()

    await page.getByLabel('verification-code-1').fill('1')
    await page.getByLabel('verification-code-2').fill('1')
    await page.getByLabel('verification-code-3').fill('2')
    await page.getByLabel('verification-code-4').fill('2')
    await page.getByLabel('verification-code-5').fill('3')
    await page.getByLabel('verification-code-6').fill('3')
    await page.getByRole('button', { name: '인증' }).click()

    await expect(page).toHaveURL(/\/ko\/reset-password\?email=member%40example\.com&token=reset-token-123/)
    await page.getByLabel('새 비밀번호').fill('Reset123!')
    await page.getByLabel('비밀번호 확인').fill('Reset123!')
    await page.getByRole('button', { name: '비밀번호 재설정' }).click()

    await expect(page).toHaveURL(/\/ko\/reset-password\/complete\?email=member%40example\.com/)
    await expect(page.getByText('member@example.com의 비밀번호가 변경되었습니다')).toBeVisible()

    await captureNamedScreenshot(page, testInfo)
  })

  test('회원가입 완료 화면을 직접 확인할 수 있다', async ({ page }, testInfo) => {
    await page.goto('/ko/signup/complete?email=new%40example.com', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('new@example.com 계정이 생성되었습니다')).toBeVisible()
    await expect(page.getByRole('link', { name: '로그인 페이지로 이동' })).toBeVisible()

    await captureNamedScreenshot(page, testInfo)
  })

  test('비로그인 사용자가 보호된 페이지에 접근하면 로그인으로 리다이렉트된다', async ({ page }, testInfo) => {
    await page.goto('/ko/profile', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible()

    await captureNamedScreenshot(page, testInfo)
  })
})
