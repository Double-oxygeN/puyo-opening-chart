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
  await expect(page.getByText('ツモ')).toBeVisible()
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

test('shows suffocation message and hides pair controls on dead board', async ({
  page,
}) => {
  await page.goto('/')

  // ノードをクリックしてダイアログを開く
  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()
  await expect(page.getByText('盤面操作')).toBeVisible()

  // ツモを子ぷよ=緑、軸ぷよ=赤に変更（縦置きで赤緑赤緑…と交互に積まれ連鎖しない）
  await page.getByRole('button', { name: 'ツモの組ぷよを編集' }).click()
  await page
    .getByText('子ぷよ')
    .locator('..')
    .getByRole('button', { name: '緑' })
    .click()
  await page.getByRole('button', { name: '確定' }).click()

  // 3列目（初期位置）に6回設置して12段積み上げ → 窒息
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Enter')
  }

  // 窒息メッセージが表示される
  await expect(page.getByText('ばたんきゅ〜')).toBeVisible()

  // ツモ・ネクスト・ネクネクが非表示
  await expect(page.getByText('ツモ')).not.toBeVisible()
  await expect(page.getByText('ネクスト')).not.toBeVisible()
  await expect(page.getByText('ネクネク')).not.toBeVisible()

  // 操作ガイドが非表示
  await expect(page.getByText('←→: 移動')).not.toBeVisible()
})
