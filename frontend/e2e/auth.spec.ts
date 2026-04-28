import { expect, test } from '@playwright/test'

test.describe('auth entry points', () => {
  test('guest can open the landing and login entry routes', async ({ page }) => {
    await page.goto('/ko', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'PERFO' })).toBeVisible()
    await expect(page.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/ko/login')

    await page.goto('/ko/login', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
    await expect(page.getByRole('button', { name: '다음' })).toBeVisible()
  })

  test('guest can continue from email entry to password entry', async ({ page }) => {
    await page.goto('/ko/login', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await page.getByRole('textbox', { name: '이메일 주소' }).fill('user@example.com')
    await page.getByRole('button', { name: '다음' }).click()

    await expect(page).toHaveURL(/\/ko\/login\/password\?email=user%40example\.com/)
    await expect(page.getByText('user@example.com')).toBeVisible()
    await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: '비밀번호 표시' }).click()
    await expect(page.getByLabel('비밀번호', { exact: true })).toHaveAttribute('type', 'text')
  })

  test('guest can prepare a credentials signup and continue to email verification', async ({ page }) => {
    await page.goto('/ko/signup?email=new%40example.com', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('new@example.com로 회원가입')).toBeVisible()
    await expect(page.getByRole('button', { name: '가입하기' })).toBeDisabled()

    await page.getByLabel('이름').fill('홍길동')
    await page.getByLabel('비밀번호', { exact: true }).fill('Valid123!')
    await page.locator('#confirm-password').fill('Valid123!')
    await page.getByRole('checkbox', { name: '이용약관에 동의합니다' }).check()
    await page.getByRole('checkbox', { name: '개인정보 처리방침에 동의합니다' }).check()

    await expect(page.getByRole('button', { name: '가입하기' })).toBeEnabled()

    await page.getByRole('button', { name: '가입하기' }).click()

    await expect(page).toHaveURL(/\/ko\/verify\?email=new%40example\.com/)
    await expect(page.getByText('new@example.com으로 6자리 인증 코드를 전송했습니다')).toBeVisible()
  })

  test('guest is redirected to login before opening a protected page', async ({ page }) => {
    await page.goto('/ko/profile', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
  })
})
