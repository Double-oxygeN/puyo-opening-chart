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

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTsumoState } from './useTsumoState'
import { PuyoColor } from '../domain/color'
import { Difficulty, getAvailableColors } from '../domain/difficulty'

function renderUseTsumoState(difficulty: Difficulty = Difficulty.Medium) {
  return renderHook(() =>
    useTsumoState({
      selectedNode: undefined,
      difficulty,
      placeAndAddNode: () => true,
    }),
  )
}

describe('useTsumoState', () => {
  describe('resetForDifficulty', () => {
    it('ランダムネクスト OFF で難易度変更時に next/nextNext が null のまま', () => {
      const { result } = renderUseTsumoState()

      act(() => {
        result.current.resetForDifficulty(Difficulty.Mild)
      })

      expect(result.current.next).toBeNull()
      expect(result.current.nextNext).toBeNull()
    })

    it('ランダムネクスト ON で難易度変更時に next/nextNext がランダムに設定される', () => {
      const { result } = renderUseTsumoState()
      const newDifficulty = Difficulty.Mild
      const validColors = getAvailableColors(newDifficulty)

      act(() => {
        result.current.toggleRandomNext()
      })

      act(() => {
        result.current.resetForDifficulty(newDifficulty)
      })

      expect(result.current.next).not.toBeNull()
      expect(result.current.nextNext).not.toBeNull()

      // 新しい難易度の色のみ使用されていることを確認
      const nextColors = [result.current.next!.axis, result.current.next!.child]
      const nextNextColors = [
        result.current.nextNext!.axis,
        result.current.nextNext!.child,
      ]
      for (const color of [...nextColors, ...nextNextColors]) {
        expect(validColors).toContain(color)
        expect(color).not.toBe(PuyoColor.Empty)
      }
    })

    it('難易度変更でカレントペアが新しい難易度のデフォルト色にリセットされる', () => {
      const { result } = renderUseTsumoState()

      act(() => {
        result.current.resetForDifficulty(Difficulty.Mild)
      })

      const mildColors = getAvailableColors(Difficulty.Mild)
      expect(result.current.effectivePair.axis).toBe(mildColors[0])
      expect(result.current.effectivePair.child).toBe(mildColors[0])
    })
  })
})
