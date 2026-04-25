import { test, expect } from '@playwright/test'

test('displays the page title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('ぷよぷよ通 初手研究チャート')
})

test('displays the heading', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'ぷよぷよ通 初手研究チャート' }),
  ).toBeVisible()
})
