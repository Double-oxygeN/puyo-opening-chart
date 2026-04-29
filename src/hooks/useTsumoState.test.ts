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
import type { GraphNode, TsumoConstraint } from '../domain/graph'
import { createEmptyBoard } from '../domain/board'

function makeNode(constraint?: TsumoConstraint): GraphNode {
  return {
    id: 'node-0' as GraphNode['id'],
    board: createEmptyBoard(),
    ...(constraint != null ? { constraint } : {}),
  }
}

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

  describe('goBackToParent', () => {
    const RED_PAIR = { axis: PuyoColor.Red, child: PuyoColor.Red }
    const BLUE_PAIR = { axis: PuyoColor.Blue, child: PuyoColor.Blue }
    const GREEN_PAIR = { axis: PuyoColor.Green, child: PuyoColor.Green }

    it('子ノードの確定ツモが親の未確定ネクストに設定される', () => {
      const { result } = renderUseTsumoState()
      const childConstraint: TsumoConstraint = { currentPair: RED_PAIR }

      act(() => {
        result.current.goBackToParent(undefined, childConstraint)
      })

      expect(result.current.next).toEqual(RED_PAIR)
      expect(result.current.nextNext).toBeNull()
    })

    it('子ノードの確定ネクストが親の未確定ネクネクに設定される', () => {
      const { result } = renderUseTsumoState()
      const childConstraint: TsumoConstraint = {
        currentPair: RED_PAIR,
        nextPair: BLUE_PAIR,
      }

      act(() => {
        result.current.goBackToParent(undefined, childConstraint)
      })

      expect(result.current.next).toEqual(RED_PAIR)
      expect(result.current.nextNext).toEqual(BLUE_PAIR)
    })

    it('子ノードの確定配色がない場合は next/nextNext が null になる', () => {
      const { result } = renderUseTsumoState()

      act(() => {
        result.current.goBackToParent(undefined, undefined)
      })

      expect(result.current.next).toBeNull()
      expect(result.current.nextNext).toBeNull()
    })

    it('親ノードに確定ネクスト（nextPair）がある場合は未確定ネクストを上書きしない', () => {
      const { result } = renderUseTsumoState()
      const parentNode = makeNode({
        currentPair: GREEN_PAIR,
        nextPair: BLUE_PAIR,
      })
      const childConstraint: TsumoConstraint = { currentPair: RED_PAIR }

      act(() => {
        result.current.goBackToParent(parentNode, childConstraint)
      })

      // 親の確定ネクスト（lockedNext）が存在するため未確定ネクストは変更されない
      expect(result.current.next).toBeNull()
    })

    it('ランダムネクスト ON のとき補完後の空き枠にランダムな配色が設定される', () => {
      const { result } = renderUseTsumoState()

      act(() => {
        result.current.toggleRandomNext()
      })

      // 確定配色なし → 全枠が未確定
      act(() => {
        result.current.goBackToParent(undefined, undefined)
      })

      expect(result.current.next).not.toBeNull()
      expect(result.current.nextNext).not.toBeNull()
    })

    it('ランダムネクスト ON で子の確定配色が揃っている場合はランダム補完が不要', () => {
      const { result } = renderUseTsumoState()

      act(() => {
        result.current.toggleRandomNext()
      })

      const childConstraint: TsumoConstraint = {
        currentPair: RED_PAIR,
        nextPair: BLUE_PAIR,
      }

      act(() => {
        result.current.goBackToParent(undefined, childConstraint)
      })

      // ネクネクは子の確定値で埋まっているのでランダム補完は不要
      expect(result.current.next).toEqual(RED_PAIR)
      expect(result.current.nextNext).toEqual(BLUE_PAIR)
    })
  })
})
