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

test('displays the board and controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('盤面')).toBeVisible()
  await expect(page.getByText('グラフツリー')).toBeVisible()
  await expect(page.getByText('軸ぷよ')).toBeVisible()
  await expect(page.getByText('子ぷよ')).toBeVisible()
})
