import { PuyoColor } from './color'
import type { PuyoColor as PuyoColorType } from './color'

/** 盤面の定数 */
export const BOARD_COLS = 6
export const BOARD_ROWS = 13 // 12段 + 非表示の13段目

/** 盤面: 行(段)×列の2次元配列。[row][col] でアクセス。row=0 が1段目（最下段） */
export type Board = PuyoColorType[][]

/** 空の盤面を生成する */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => PuyoColor.Empty),
  )
}

/** 盤面のセルを取得する。範囲外は undefined */
export function getCell(
  board: Board,
  row: number,
  col: number,
): PuyoColorType | undefined {
  return board[row]?.[col]
}

/** 盤面のセルを設定した新しい盤面を返す（イミュータブル） */
export function setCell(
  board: Board,
  row: number,
  col: number,
  color: PuyoColorType,
): Board {
  return board.map((r, ri) =>
    ri === row ? r.map((c, ci) => (ci === col ? color : c)) : r,
  )
}

/** 指定列の最も低い空きセルの段（行インデックス）を返す。満杯なら -1 */
export function getDropRow(board: Board, col: number): number {
  for (let row = 0; row < BOARD_ROWS; row++) {
    if (board[row][col] === PuyoColor.Empty) {
      return row
    }
  }
  return -1
}
