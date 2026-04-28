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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the title after loading', async () => {
    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByText('ぷよぷよ通 初手研究チャート'),
      ).toBeInTheDocument()
    })
  })

  it('shows loading state initially', async () => {
    render(<App />)
    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
    // hydration 完了を待って act() 警告を回避
    await waitFor(() => {
      expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument()
    })
  })

  it('does not show the board operation dialog initially', async () => {
    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByText('ぷよぷよ通 初手研究チャート'),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText('盤面操作')).not.toBeInTheDocument()
  })

  it('opens and closes the header menu', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByText('ぷよぷよ通 初手研究チャート'),
      ).toBeInTheDocument()
    })

    // メニューボタンをクリック
    await user.click(screen.getByText('メニュー ▾'))

    // メニュー項目が表示される
    expect(screen.getByText('エクスポート')).toBeInTheDocument()
    expect(screen.getByText('インポート')).toBeInTheDocument()
    expect(screen.getByText('リセット')).toBeInTheDocument()

    // メニューの外をクリックして閉じる
    await user.click(document.body)

    await waitFor(() => {
      expect(screen.queryByText('エクスポート')).not.toBeInTheDocument()
    })
  })
})
