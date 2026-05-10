import { expect, test } from '@playwright/test'

test.describe('인증 진입 플로우', () => {
  test('비로그인 사용자는 랜딩과 로그인 진입 화면을 열 수 있다', async ({ page }) => {
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
  })

  test('비로그인 사용자는 회원가입 화면에 직접 진입할 수 있다', async ({ page }) => {
    await page.goto('/ko/signup?email=new%40example.com', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/ko\/signup\?email=new%40example\.com/)
    await expect(page.getByRole('button', { name: '가입하기' })).toBeVisible()
  })

  test('비로그인 사용자가 보호된 페이지에 접근하면 로그인으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/ko/profile', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible()
  })
})
