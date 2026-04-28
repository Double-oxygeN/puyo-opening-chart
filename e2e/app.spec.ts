// Copyright 2026 Yuya Shiratori
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

test('moves pair left and right with arrow keys', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()
  await expect(page.getByText('盤面操作')).toBeVisible()

  // 初期位置で設置 → 3列目に配置される
  await page.keyboard.press('Enter')

  // ノードが2つに増えたことを確認
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)

  // 新しいノードの盤面をクリックして戻す
  await page.getByRole('button', { name: '盤面ノード' }).first().click()

  // 左に2回移動して設置 → 1列目に配置される
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Enter')

  // ノードが3つに増える（ルート + 2つの子ノード）
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(3)
})

test('rotates pair with Z and X keys', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()
  await expect(page.getByText('盤面操作')).toBeVisible()

  // ツモを赤緑に変更して回転確認しやすくする
  await page.getByRole('button', { name: 'ツモの組ぷよを編集' }).click()
  await page
    .getByText('子ぷよ')
    .locator('..')
    .getByRole('button', { name: '緑' })
    .click()
  await page.getByRole('button', { name: '確定' }).click()

  // X（右回転）→ 横置きになる。設置して結果確認
  await page.keyboard.press('x')
  await page.keyboard.press('Enter')

  // ノードが増えた
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)
})

test('places pair and adds node to graph tree', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()

  // 設置
  await page.keyboard.press('Enter')

  // ノードが2つになる
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)
})

test('builds multi-step graph', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()

  // ランダムツモOFF + 連鎖しない色（赤緑）に設定
  await page.getByText('メニュー ▾').click()
  await page.getByRole('switch').click()
  await page.getByText('メニュー ▾').click()

  await page.getByRole('button', { name: 'ツモの組ぷよを編集' }).click()
  await page
    .getByText('子ぷよ')
    .locator('..')
    .getByRole('button', { name: '緑' })
    .click()
  await page.getByRole('button', { name: '確定' }).click()

  // 3手連続で設置（同色4連にならないので連鎖しない）
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  // ノードが4つになる（ルート + 3手）
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(4)
})

test('saves memo on a node', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()
  await expect(page.getByText('盤面操作')).toBeVisible()

  // メモを入力
  const textarea = page.getByPlaceholder('メモを入力...')
  await textarea.fill('テスト用メモ')

  // 保存ボタンをクリック
  await page.getByRole('button', { name: '保存' }).click()

  // ダイアログを閉じて再度開き、メモが保持されていることを確認
  const svg = page.locator('svg').first()
  await svg.click({ position: { x: 5, y: 5 } })
  await expect(page.getByText('盤面操作')).not.toBeVisible()

  await node.click()
  await expect(textarea).toHaveValue('テスト用メモ')
})

test('changes difficulty and available colors change accordingly', async ({
  page,
}) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()

  // まず1手設置してグラフにノードを追加
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)

  // ツモの編集メニューを開いて変更前の色数を確認（中辛: 4色）
  await page.getByRole('button', { name: 'ツモの組ぷよを編集' }).click()
  const axisSection = page.getByText('軸ぷよ').locator('..')
  await expect(axisSection.getByRole('button', { name: '赤' })).toBeVisible()
  await expect(axisSection.getByRole('button', { name: '緑' })).toBeVisible()
  await expect(axisSection.getByRole('button', { name: '青' })).toBeVisible()
  await expect(axisSection.getByRole('button', { name: '黄' })).toBeVisible()
  await expect(
    axisSection.getByRole('button', { name: '紫' }),
  ).not.toBeVisible()
  await page.getByRole('button', { name: '取消' }).click()

  // ダイアログを閉じる
  const svg = page.locator('svg').first()
  await svg.click({ position: { x: 5, y: 5 } })
  await expect(page.getByText('盤面操作')).not.toBeVisible()

  // メニューを開いて難易度を「甘口」に変更
  await page.getByText('メニュー ▾').click()
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByText('甘口').click()

  // グラフがリセットされてノードが1つに戻る
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(1)

  // ノードをクリックしてツモの編集メニューを開き、変更後の色数を確認（甘口: 3色）
  await page.getByRole('button', { name: '盤面ノード' }).first().click()
  await page.getByRole('button', { name: 'ツモの組ぷよを編集' }).click()
  const axisSectionAfter = page.getByText('軸ぷよ').locator('..')
  await expect(
    axisSectionAfter.getByRole('button', { name: '赤' }),
  ).toBeVisible()
  await expect(
    axisSectionAfter.getByRole('button', { name: '緑' }),
  ).toBeVisible()
  await expect(
    axisSectionAfter.getByRole('button', { name: '青' }),
  ).toBeVisible()
  await expect(
    axisSectionAfter.getByRole('button', { name: '黄' }),
  ).not.toBeVisible()
  await expect(
    axisSectionAfter.getByRole('button', { name: '紫' }),
  ).not.toBeVisible()
})

test('deletes a child node', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()

  // 1手設置
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)

  // 子ノードが選択されている状態で削除ボタンが表示される
  await expect(page.getByText('ノードを削除')).toBeVisible()

  // confirm ダイアログを自動承認
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByText('ノードを削除').click()

  // ノードが1つに戻る
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(1)
})

test('does not show delete button for root node', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()
  await expect(page.getByText('盤面操作')).toBeVisible()

  // ルートノードでは削除ボタンが表示されない
  await expect(page.getByText('ノードを削除')).not.toBeVisible()
})

test('toggles random tsumo via menu', async ({ page }) => {
  await page.goto('/')

  await page.getByText('メニュー ▾').click()

  // デフォルトはON
  const toggle = page.getByRole('switch')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')

  // OFF に切り替え
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')

  // ON に戻す
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
})

test('persists graph across page reloads', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()

  // 1手設置
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)

  // ページリロード
  await page.reload()

  // データが保持されてノードが2つある
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)
})

test('resets graph via menu', async ({ page }) => {
  await page.goto('/')

  const node = page.getByRole('button', { name: '盤面ノード' }).first()
  await node.click()

  // 1手設置
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(2)

  // confirm ダイアログを自動承認
  page.on('dialog', (dialog) => dialog.accept())

  // メニューからリセット
  await page.getByText('メニュー ▾').click()
  await page.getByText('リセット').click()

  // ノードが1つに戻る
  await expect(page.getByRole('button', { name: '盤面ノード' })).toHaveCount(1)
})
