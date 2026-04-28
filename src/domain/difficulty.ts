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

import { PuyoColor } from './color'
import type { FilledColor } from './color'

/** 難易度設定 */
export const Difficulty = {
  Mild: 'mild',
  Medium: 'medium',
  Hot: 'hot',
} as const

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty]

/** デフォルト難易度 */
export const DEFAULT_DIFFICULTY: Difficulty = Difficulty.Medium

/** 難易度の表示ラベル */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.Mild]: '甘口',
  [Difficulty.Medium]: '中辛',
  [Difficulty.Hot]: '辛口',
} as const

/** 全難易度の配列（UI表示順） */
export const ALL_DIFFICULTIES: readonly Difficulty[] = [
  Difficulty.Mild,
  Difficulty.Medium,
  Difficulty.Hot,
] as const

/** 難易度に応じた使用可能な色ぷよの配列を返す */
export function getAvailableColors(
  difficulty: Difficulty,
): readonly FilledColor[] {
  switch (difficulty) {
    case Difficulty.Mild:
      return [PuyoColor.Red, PuyoColor.Green, PuyoColor.Blue]
    case Difficulty.Medium:
      return [PuyoColor.Red, PuyoColor.Green, PuyoColor.Blue, PuyoColor.Yellow]
    case Difficulty.Hot:
      return [
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Purple,
      ]
  }
}
