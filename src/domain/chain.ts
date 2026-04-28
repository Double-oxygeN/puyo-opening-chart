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

import type { Board } from './board'
import type { ConnectedGroup } from './board'
import { findConnectedGroups, eliminateGroups, applyGravity } from './board'
import type { FilledColor } from './color'

// --- ボーナステーブル ---

/** 連鎖ボーナス（インデックス = 連鎖数, 1始まり） */
const CHAIN_BONUSES = [
  0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
  448, 480, 512,
] as const

/** 色数ボーナス（インデックス = 同時消し色数） */
const COLOR_BONUSES = [0, 0, 3, 6, 12, 24] as const

/** 連結ボーナス: グループのぷよ数から対応するボーナスを返す */
function connectionBonus(groupSize: number): number {
  if (groupSize <= 4) return 0
  if (groupSize <= 10) return groupSize - 3
  return 10
}

// --- 型定義 ---

/** 1連鎖ステップの情報 */
export interface ChainStepInfo {
  /** 消去グループ */
  readonly groups: readonly ConnectedGroup[]
  /** 消したぷよの総数 */
  readonly puyoCount: number
  /** 同時消し色数 */
  readonly colorCount: number
  /** 5連結以上のグループを含むか */
  readonly hasLargeGroup: boolean
  /** このステップのスコア */
  readonly stepScore: number
}

/** 連鎖の結果 */
export interface ChainResult {
  /** 連鎖数 */
  readonly chainCount: number
  /** 各ステップの情報 */
  readonly steps: readonly ChainStepInfo[]
  /** 連鎖消去点の合計 */
  readonly totalScore: number
  /** 連鎖解決後の盤面 */
  readonly resultBoard: Board
}

// --- 連鎖スコア計算 ---

/** 1ステップのスコアを計算する */
function computeStepScore(
  groups: readonly ConnectedGroup[],
  chainNumber: number,
): ChainStepInfo {
  const puyoCount = groups.reduce((sum, g) => sum + g.cells.length, 0)

  const colors = new Set<FilledColor>()
  for (const g of groups) {
    colors.add(g.color)
  }
  const colorCount = colors.size

  const hasLargeGroup = groups.some((g) => g.cells.length >= 5)

  const chainBonus =
    chainNumber < CHAIN_BONUSES.length
      ? CHAIN_BONUSES[chainNumber]
      : CHAIN_BONUSES[CHAIN_BONUSES.length - 1]

  const totalConnectionBonus = groups.reduce(
    (sum, g) => sum + connectionBonus(g.cells.length),
    0,
  )

  const colorBonusValue =
    colorCount < COLOR_BONUSES.length
      ? COLOR_BONUSES[colorCount]
      : COLOR_BONUSES[COLOR_BONUSES.length - 1]

  const rawBonus = chainBonus + totalConnectionBonus + colorBonusValue
  const effectiveBonus = Math.max(1, Math.min(999, rawBonus))

  const stepScore = puyoCount * 10 * effectiveBonus

  return {
    groups,
    puyoCount,
    colorCount,
    hasLargeGroup,
    stepScore,
  }
}

/**
 * 消去→落下→再判定を繰り返し、各ステップのスコア情報を記録しながら
 * 最終的な安定盤面と連鎖結果を返す
 */
export function resolveAndScoreChains(board: Board): ChainResult {
  const steps: ChainStepInfo[] = []
  let current = board
  let chainNumber = 1

  for (;;) {
    const groups = findConnectedGroups(current)
    if (groups.length === 0) break

    const stepInfo = computeStepScore(groups, chainNumber)
    steps.push(stepInfo)

    current = applyGravity(eliminateGroups(current, groups))
    chainNumber++
  }

  return {
    chainCount: steps.length,
    steps,
    totalScore: steps.reduce((sum, s) => sum + s.stepScore, 0),
    resultBoard: current,
  }
}

// --- フォーマット ---

/** 色数から対応する記号文字を返す */
function colorSymbol(colorCount: number, useSForSingle: boolean): string {
  switch (colorCount) {
    case 1:
      return useSForSingle ? 'S' : ''
    case 2:
      return 'D'
    case 3:
      return 'T'
    case 4:
      return 'Q'
    case 5:
      return 'M'
    default:
      return 'M'
  }
}

/** 1ステップの同時消し構成記号を生成する */
function stepSymbol(step: ChainStepInfo, useSForSingle: boolean): string {
  const letter = colorSymbol(step.colorCount, useSForSingle)
  return letter + (step.hasLargeGroup ? '+' : '')
}

/**
 * 連鎖結果を連鎖構成フォーマットに変換する。
 * 連鎖が発生しなかった場合は null を返す。
 */
export function formatChainNotation(result: ChainResult): string | null {
  if (result.chainCount === 0) return null

  const { steps, chainCount, totalScore } = result

  const last = steps[chainCount - 1]

  let composition: string
  if (chainCount >= 2) {
    const secondToLast = steps[chainCount - 2]
    if (secondToLast.colorCount > 1) {
      // 最後から2番目が複数色消し: 両方を表記
      composition = stepSymbol(secondToLast, false) + stepSymbol(last, true)
    } else {
      // 最後から2番目が単色消し: 最後のみ表記
      composition = stepSymbol(last, false)
    }
  } else {
    // 1連鎖: 最後のみ表記
    composition = stepSymbol(last, false)
  }

  return `${chainCount}${composition}:${totalScore}`
}
