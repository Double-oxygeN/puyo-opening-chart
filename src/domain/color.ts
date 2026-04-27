/** ぷよの色（5色 + 空） */
export const PuyoColor = {
  Empty: 0,
  Red: 1,
  Green: 2,
  Blue: 3,
  Yellow: 4,
  Purple: 5,
} as const

export type PuyoColor = (typeof PuyoColor)[keyof typeof PuyoColor]

/** 色ぷよのみ（Emptyを除く） */
export type FilledColor = Exclude<PuyoColor, typeof PuyoColor.Empty>

/** 全色ぷよの配列 */
export const FILLED_COLORS: readonly FilledColor[] = [
  PuyoColor.Red,
  PuyoColor.Green,
  PuyoColor.Blue,
  PuyoColor.Yellow,
  PuyoColor.Purple,
] as const

/** 色のCSS表示用ラベル */
export const COLOR_LABELS: Record<PuyoColor, string> = {
  [PuyoColor.Empty]: '',
  [PuyoColor.Red]: '赤',
  [PuyoColor.Green]: '緑',
  [PuyoColor.Blue]: '青',
  [PuyoColor.Yellow]: '黄',
  [PuyoColor.Purple]: '紫',
} as const

/** Tailwind BGクラス */
export const PUYO_BG_CLASSES: Record<PuyoColor, string> = {
  [PuyoColor.Empty]: 'bg-gray-200',
  [PuyoColor.Red]: 'bg-red-500',
  [PuyoColor.Green]: 'bg-green-500',
  [PuyoColor.Blue]: 'bg-blue-500',
  [PuyoColor.Yellow]: 'bg-yellow-400',
  [PuyoColor.Purple]: 'bg-purple-500',
} as const

/** SVG用HEXカラー */
export const PUYO_HEX_COLORS: Record<PuyoColor, string> = {
  [PuyoColor.Empty]: '#e5e7eb',
  [PuyoColor.Red]: '#ef4444',
  [PuyoColor.Green]: '#22c55e',
  [PuyoColor.Blue]: '#3b82f6',
  [PuyoColor.Yellow]: '#facc15',
  [PuyoColor.Purple]: '#a855f7',
} as const
