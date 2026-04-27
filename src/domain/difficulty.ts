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
