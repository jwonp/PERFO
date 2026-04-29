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
  })

  test('비로그인 사용자는 이메일 입력 단계에서 비밀번호 입력 단계로 이동할 수 있다', async ({ page }) => {
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

  test('비로그인 사용자는 회원가입 입력 후 이메일 인증 화면으로 이동할 수 있다', async ({ page }) => {
    await page.goto('/ko/signup?email=new%40example.com', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/ko\/signup\?email=new%40example\.com/)
    await expect(page.getByText('아래 요구사항을 충족하는 비밀번호를 입력하세요.')).toBeVisible()
    await expect(page.getByRole('button', { name: '가입하기' })).toBeDisabled()

    await page.getByLabel('이름').fill('홍길동')
    await page.getByLabel('비밀번호', { exact: true }).fill('Valid123!')
    await page.locator('#confirm-password').fill('Valid123!')
    await page.getByRole('checkbox', { name: /이용약관/ }).check()
    await page.getByRole('checkbox', { name: /개인정보/ }).check()

    await expect(page.getByRole('button', { name: '가입하기' })).toBeEnabled()

    await page.getByRole('button', { name: '가입하기' }).click()

    await expect(page).toHaveURL(/\/ko\/verify\?email=new%40example\.com/)
    await expect(page.getByText('new@example.com으로 6자리 인증 코드를 전송했습니다')).toBeVisible()
  })

  test('비로그인 사용자가 보호된 페이지에 접근하면 로그인으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/ko/profile', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
  })
})
