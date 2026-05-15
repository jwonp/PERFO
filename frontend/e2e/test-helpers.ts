import { type Page, type TestInfo } from '@playwright/test'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export async function captureNamedScreenshot(
  page: Page,
  testInfo: TestInfo,
  label?: string,
) {
  const parts = [...testInfo.titlePath.slice(1), label].filter(Boolean) as string[]
  const filename = `${parts.map(slugify).join('__') || 'e2e'}.png`

  await page.screenshot({
    path: testInfo.outputPath(filename),
    fullPage: true,
  })
}

export async function enableVisualAuth(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-playwright-visual-auth': '1',
  })
}
