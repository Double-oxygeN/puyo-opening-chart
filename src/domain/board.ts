import { PuyoColor } from './color'
import type { PuyoColor as PuyoColorType, FilledColor } from './color'

/** 盤面の定数 */
export const BOARD_COLS = 6
export const BOARD_ROWS = 13 // 12段 + 非表示の13段目
/** 連結判定の対象行数（12段目まで。13段目は対象外） */
export const VISIBLE_ROWS = 12

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

/** 2つの盤面が等しいか判定する */
export function boardsEqual(a: Board, b: Board): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (a[row][col] !== b[row][col]) return false
    }
  }
  return true
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

/** 盤面の上部の空白行を除去してコンパクトな表現にする */
export function compactBoard(board: Board): PuyoColorType[][] {
  let topRow = board.length - 1
  while (topRow >= 0 && board[topRow].every((c) => c === PuyoColor.Empty)) {
    topRow--
  }
  return board.slice(0, topRow + 1)
}

/** コンパクトな盤面を BOARD_ROWS 行に展開する */
export function expandBoard(rows: PuyoColorType[][]): Board {
  const board = createEmptyBoard()
  for (let r = 0; r < rows.length && r < BOARD_ROWS; r++) {
    for (let c = 0; c < rows[r].length && c < BOARD_COLS; c++) {
      board[r][c] = rows[r][c]
    }
  }
  return board
}

// --- 連鎖消去ロジック ---

/** 同色連結グループ */
export interface ConnectedGroup {
  readonly color: FilledColor
  readonly cells: readonly { row: number; col: number }[]
}

const DIRECTIONS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const

/**
 * 12段目以下の盤面上で、同色4つ以上の連結グループをすべて検出する。
 * 13段目（row 12）は連結判定に含めない。
 */
export function findConnectedGroups(board: Board): ConnectedGroup[] {
  const visited: boolean[][] = Array.from({ length: VISIBLE_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => false),
  )
  const groups: ConnectedGroup[] = []

  for (let row = 0; row < VISIBLE_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (visited[row][col]) continue
      const color = board[row][col]
      if (color === PuyoColor.Empty) continue

      // BFS で同色連結を探索
      const cells: { row: number; col: number }[] = []
      const queue: { row: number; col: number }[] = [{ row, col }]
      visited[row][col] = true

      while (queue.length > 0) {
        const current = queue.shift()!
        cells.push(current)

        for (const [dr, dc] of DIRECTIONS) {
          const nr = current.row + dr
          const nc = current.col + dc
          if (
            nr < 0 ||
            nr >= VISIBLE_ROWS ||
            nc < 0 ||
            nc >= BOARD_COLS ||
            visited[nr][nc]
          )
            continue
          if (board[nr][nc] === color) {
            visited[nr][nc] = true
            queue.push({ row: nr, col: nc })
          }
        }
      }

      if (cells.length >= 4) {
        groups.push({ color, cells })
      }
    }
  }

  return groups
}

/** 指定グループのセルを Empty にした新しい盤面を返す */
export function eliminateGroups(
  board: Board,
  groups: readonly ConnectedGroup[],
): Board {
  const newBoard = board.map((row) => [...row])
  for (const group of groups) {
    for (const { row, col } of group.cells) {
      newBoard[row][col] = PuyoColor.Empty
    }
  }
  return newBoard
}

/** 各列で空きセルの上にあるぷよを落下させる（全13段対象） */
export function applyGravity(board: Board): Board {
  const newBoard = createEmptyBoard()
  for (let col = 0; col < BOARD_COLS; col++) {
    let writeRow = 0
    for (let row = 0; row < BOARD_ROWS; row++) {
      if (board[row][col] !== PuyoColor.Empty) {
        newBoard[writeRow][col] = board[row][col]
        writeRow++
      }
    }
  }
  return newBoard
}

/** 消去→落下→再判定を繰り返し、最終的な安定盤面を返す */
export function resolveChains(board: Board): Board {
  let current = board
  for (;;) {
    const groups = findConnectedGroups(current)
    if (groups.length === 0) return current
    current = applyGravity(eliminateGroups(current, groups))
  }
}
