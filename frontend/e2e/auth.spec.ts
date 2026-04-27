import { expect, test } from '@playwright/test'

test.describe('auth entry points', () => {
  test('guest can open the landing and login entry routes', async ({ page }) => {
    await page.goto('/ko', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'PERFO' })).toBeVisible()
    await expect(page.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/ko/login')

    await page.goto('/ko/login', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
    await expect(page.getByRole('link', { name: '다음' })).toBeVisible()
  })

  test('guest is redirected to login before opening a protected page', async ({ page }) => {
    await page.goto('/ko/profile', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/ko\/login/)
    await expect(page.getByRole('textbox', { name: '이메일 주소' })).toBeVisible()
  })
})
