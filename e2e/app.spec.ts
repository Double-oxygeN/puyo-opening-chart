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

test('does not show board operation dialog initially', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('盤面操作')).not.toBeVisible()
})

test('opens board operation dialog on node click', async ({ page }) => {
  await page.goto('/')

  // 初期ノードをクリック
  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()

  // ダイアログが表示される
  await expect(page.getByText('盤面操作')).toBeVisible()
  await expect(page.getByText('軸ぷよ')).toBeVisible()
  await expect(page.getByText('子ぷよ')).toBeVisible()
})

test('closes dialog on background click', async ({ page }) => {
  await page.goto('/')

  // ノードをクリックしてダイアログを開く
  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()
  await expect(page.getByText('盤面操作')).toBeVisible()

  // SVG背景をクリックしてダイアログを閉じる
  const svg = page.locator('svg').first()
  await svg.click({ position: { x: 5, y: 5 } })

  await expect(page.getByText('盤面操作')).not.toBeVisible()
})
