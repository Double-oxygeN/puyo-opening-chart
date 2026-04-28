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
import { resolveAndScoreChains, formatChainNotation } from './chain'
import type { ChainResult } from './chain'
import { createEmptyBoard, expandBoard } from './board'
import type { Board } from './board'
import { PuyoColor } from './color'

const R = PuyoColor.Red
const G = PuyoColor.Green
const B = PuyoColor.Blue
const Y = PuyoColor.Yellow
const _ = PuyoColor.Empty

describe('resolveAndScoreChains', () => {
  it('連鎖なしの場合 chainCount=0, totalScore=0', () => {
    const board = expandBoard([[R, G, B, Y, _, _]])
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(0)
    expect(result.totalScore).toBe(0)
    expect(result.steps).toHaveLength(0)
  })

  it('1:40 — 単発4連結単色消し', () => {
    const board = expandBoard([[R, R, R, R, _, _]])
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(1)
    expect(result.totalScore).toBe(40)
    expect(result.steps[0].puyoCount).toBe(4)
    expect(result.steps[0].colorCount).toBe(1)
    expect(result.steps[0].hasLargeGroup).toBe(false)
  })

  it('1+:100 — 単発5連結単色消し', () => {
    const board = expandBoard([[R, R, R, R, R, _]])
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(1)
    expect(result.totalScore).toBe(100)
    expect(result.steps[0].puyoCount).toBe(5)
    expect(result.steps[0].hasLargeGroup).toBe(true)
  })

  it('1D:240 — 単発2色消し', () => {
    const board = expandBoard(
      [
        [_, _, _, _, G, G],
        [R, R, R, R, G, G],
      ].toReversed(),
    )
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(1)
    expect(result.totalScore).toBe(240)
    expect(result.steps[0].colorCount).toBe(2)
  })

  it('1D+:2380 — 単発2色消し（多連結）', () => {
    // 赤7連結 + 緑10連結
    const board = expandBoard(
      [
        [_, _, _, _, _, R],
        [R, R, R, R, R, R],
        [G, G, G, G, G, G],
        [Y, B, Y, G, B, G],
        [B, Y, G, G, Y, B],
      ].toReversed(),
    )
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(1)
    // 170 × (0 + (4+7) + 3) = 170 × 14 = 2380
    expect(result.totalScore).toBe(2380)
  })

  it('2連鎖: 40×1 + 40×8 = 360', () => {
    const board = expandBoard(
      [
        [_, R, R, R, _, _],
        [B, B, B, B, R, _],
      ].toReversed(),
    )
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(2)
    expect(result.totalScore).toBe(360)
  })

  it('2D:920 — 2連鎖ダブル', () => {
    const board = expandBoard(
      [
        [_, G, _, _, B, _],
        [_, G, G, B, B, _],
        [G, R, R, R, R, B],
      ].toReversed(),
    )
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(2)
    // Step1: 40×1=40, Step2: 80×(8+0+3)=880
    expect(result.totalScore).toBe(920)
  })

  it('4連鎖: 4:2280', () => {
    const board = expandBoard(
      [
        [_, G, B, Y, _, _],
        [_, R, G, B, Y, _],
        [_, R, G, B, Y, _],
        [R, R, G, B, Y, _],
      ].toReversed(),
    )
    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(4)
    expect(result.totalScore).toBe(2280)
  })

  it('19:175080 — kenny式19連鎖', () => {
    const board = [
      [_, _, Y, R, G, G],
      [Y, B, B, Y, R, B],
      [R, B, Y, R, G, G],
      [Y, B, Y, R, G, B],
      [R, G, B, Y, R, B],
      [G, B, Y, R, G, B],
      [R, G, B, Y, R, G],
      [R, G, B, Y, R, G],
      [R, Y, Y, B, Y, B],
      [Y, G, B, R, B, B],
      [R, Y, G, B, R, Y],
      [R, Y, G, B, R, Y],
      [R, Y, G, B, R, Y],
    ].toReversed() as Board

    const result = resolveAndScoreChains(board)
    expect(result.chainCount).toBe(19)
    expect(result.totalScore).toBe(175080)
  })
})

describe('formatChainNotation', () => {
  it('連鎖なしの場合 null', () => {
    const result: ChainResult = {
      chainCount: 0,
      steps: [],
      totalScore: 0,
      resultBoard: createEmptyBoard(),
    }
    expect(formatChainNotation(result)).toBeNull()
  })

  // --- 盤面ベースの統合テスト ---

  it('1:40', () => {
    const board = expandBoard([[R, R, R, R, _, _]])
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('1:40')
  })

  it('1+:100', () => {
    const board = expandBoard([[R, R, R, R, R, _]])
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('1+:100')
  })

  it('1D:240', () => {
    const board = expandBoard(
      [
        [_, _, _, _, G, G],
        [R, R, R, R, G, G],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('1D:240')
  })

  it('1D+:2380', () => {
    const board = expandBoard(
      [
        [_, _, _, _, _, R],
        [R, R, R, R, R, R],
        [G, G, G, G, G, G],
        [Y, B, Y, G, B, G],
        [B, Y, G, G, Y, B],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('1D+:2380')
  })

  it('2D — 最後が2色消し', () => {
    const board = expandBoard(
      [
        [_, G, _, _, B, _],
        [_, G, G, B, B, _],
        [G, R, R, R, R, B],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('2D:920')
  })

  it('2T — 最後が3色消し', () => {
    const board = expandBoard(
      [
        [_, _, _, Y, _, _],
        [_, G, B, R, _, _],
        [_, R, R, R, _, _],
        [_, G, B, Y, _, _],
        [_, G, B, Y, _, _],
        [_, G, B, Y, _, _],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('2T:1720')
  })

  it('4 — 全4連結単色消し', () => {
    const board = expandBoard(
      [
        [_, G, B, Y, _, _],
        [_, R, G, B, Y, _],
        [_, R, G, B, Y, _],
        [R, R, G, B, Y, _],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4:2280')
  })

  it('4 — 1連鎖目5連結だが構成表記なし', () => {
    const board = expandBoard(
      [
        [_, G, B, Y, _, _],
        [_, R, G, B, Y, _],
        [R, R, G, B, Y, _],
        [R, R, G, B, Y, _],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4:2340')
  })

  it('4+ — 最後および最後から2番目のぷよが5連結単色消し', () => {
    const board = expandBoard(
      [
        [_, G, B, Y, _, _],
        [_, G, B, Y, _, _],
        [R, R, G, B, B, Y],
        [R, R, G, B, Y, Y],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4+:2960')
  })

  it('4D — 最後が2色消し', () => {
    const board = expandBoard(
      [
        [_, G, B, G, _, _],
        [_, G, B, Y, G, G],
        [R, R, G, B, G, Y],
        [R, R, G, B, Y, Y],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4D:3800')
  })

  it('4DS — 最後から2番目が2色消し、最後が単色', () => {
    const board = expandBoard(
      [
        [_, _, R, Y, _, _],
        [_, _, R, Y, _, _],
        [_, G, B, R, _, _],
        [_, G, B, R, _, _],
        [R, R, G, B, Y, _],
        [R, R, G, B, Y, _],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4DS:3160')
  })

  it('4D+S — 最後から2番目が2色消し（多連結）、最後が単色', () => {
    const board = expandBoard(
      [
        [_, _, R, Y, _, _],
        [_, _, R, Y, _, _],
        [_, G, B, R, _, _],
        [_, G, B, R, R, _],
        [R, R, G, B, Y, _],
        [R, R, G, B, Y, _],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4D+S:3530')
  })

  it('4D+S+ — 最後から2番目が2色消し（多連結）、最後が5連結単色', () => {
    const board = expandBoard(
      [
        [_, _, R, Y, _, _],
        [_, _, R, Y, _, _],
        [_, G, B, R, _, _],
        [_, G, B, R, R, _],
        [R, R, G, B, Y, _],
        [R, R, G, B, Y, Y],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4D+S+:3950')
  })

  it('4DD — 最後から2番目・最後ともに2色消し', () => {
    const board = expandBoard(
      [
        [_, _, R, G, _, _],
        [_, _, R, Y, _, _],
        [_, G, B, R, _, _],
        [_, G, B, R, G, G],
        [R, R, G, B, G, Y],
        [R, R, G, B, Y, Y],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4DD:4680')
  })

  it('4D+D — 最後から2番目が2色消し（多連結）、最後が2色消し', () => {
    const board = expandBoard(
      [
        [_, _, R, G, _, _],
        [_, _, R, Y, _, _],
        [_, G, B, R, R, _],
        [_, G, B, R, G, G],
        [R, R, G, B, G, Y],
        [R, R, G, B, Y, Y],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4D+D:5050')
  })

  it('4DD+ — 最後が2色消し（多連結）', () => {
    const board = expandBoard(
      [
        [_, _, R, _, _, _],
        [_, _, R, G, G, _],
        [_, G, B, Y, G, _],
        [_, G, B, R, R, G],
        [R, R, G, B, G, Y],
        [R, R, G, B, Y, Y],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4DD+:5210')
  })

  it('4D+D+ — どちらも2色消し（多連結）', () => {
    const board = expandBoard(
      [
        [_, _, R, _, _, _],
        [_, B, R, G, G, _],
        [_, G, B, Y, G, _],
        [_, G, B, R, R, G],
        [R, R, G, B, G, Y],
        [R, R, G, B, Y, Y],
      ].toReversed(),
    )
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('4D+D+:5580')
  })

  it('19:175080', () => {
    const board = [
      [_, _, Y, R, G, G],
      [Y, B, B, Y, R, B],
      [R, B, Y, R, G, G],
      [Y, B, Y, R, G, B],
      [R, G, B, Y, R, B],
      [G, B, Y, R, G, B],
      [R, G, B, Y, R, G],
      [R, G, B, Y, R, G],
      [R, Y, Y, B, Y, B],
      [Y, G, B, R, B, B],
      [R, Y, G, B, R, Y],
      [R, Y, G, B, R, Y],
      [R, Y, G, B, R, Y],
    ].toReversed() as Board
    expect(formatChainNotation(resolveAndScoreChains(board))).toBe('19:175080')
  })
})
