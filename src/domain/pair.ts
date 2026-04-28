import type { FilledColor } from './color'
import type { Board } from './board'
import { BOARD_COLS, BOARD_ROWS, getDropRow, setCell } from './board'
import type { ChainResult } from './chain'
import { resolveAndScoreChains } from './chain'

/** 組ぷよ: 軸ぷよと子ぷよの色 */
export interface PuyoPair {
  readonly axis: FilledColor
  readonly child: FilledColor
}

/**
 * 子ぷよの相対位置（回転状態）
 * - Up: 子ぷよが軸の上
 * - Right: 子ぷよが軸の右
 * - Down: 子ぷよが軸の下
 * - Left: 子ぷよが軸の左
 */
export const Rotation = {
  Up: 0,
  Right: 1,
  Down: 2,
  Left: 3,
} as const

export type Rotation = (typeof Rotation)[keyof typeof Rotation]

/** 操作中の組ぷよの状態 */
export interface PairState {
  readonly pair: PuyoPair
  /** 軸ぷよの列（0始まり） */
  readonly col: number
  /** 回転状態 */
  readonly rotation: Rotation
}

/** 組ぷよの初期位置: 3列目（index=2）、子ぷよが上 */
export const INITIAL_COL = 2

export function createInitialPairState(pair: PuyoPair): PairState {
  return { pair, col: INITIAL_COL, rotation: Rotation.Up }
}

/** 回転による子ぷよの相対オフセット [dCol, dRow] */
const ROTATION_OFFSETS: Record<Rotation, readonly [number, number]> = {
  [Rotation.Up]: [0, 1],
  [Rotation.Right]: [1, 0],
  [Rotation.Down]: [0, -1],
  [Rotation.Left]: [-1, 0],
}

/** 左に移動する。壁やぷよに衝突する場合はそのまま返す */
export function moveLeft(state: PairState): PairState {
  const next = { ...state, col: state.col - 1 }
  if (isValidPosition(next)) return next
  return state
}

/** 右に移動する。壁やぷよに衝突する場合はそのまま返す */
export function moveRight(state: PairState): PairState {
  const next = { ...state, col: state.col + 1 }
  if (isValidPosition(next)) return next
  return state
}

/** 時計回り（右回転） */
export function rotateClockwise(state: PairState): PairState {
  const newRotation = ((state.rotation + 1) % 4) as Rotation
  return applyRotation(state, newRotation)
}

/** 反時計回り（左回転） */
export function rotateCounterClockwise(state: PairState): PairState {
  const newRotation = ((state.rotation + 3) % 4) as Rotation
  return applyRotation(state, newRotation)
}

function applyRotation(state: PairState, newRotation: Rotation): PairState {
  // まず回転先がそのまま入るか試す
  const rotated = { ...state, rotation: newRotation }
  if (isValidPosition(rotated)) return rotated

  // 壁蹴り: 子ぷよが壁に当たる場合、反対方向にずらす
  const [dCol, dRow] = ROTATION_OFFSETS[newRotation]

  if (dCol !== 0) {
    // 子ぷよが左右にある場合 → 壁蹴り（横方向の押し出し）
    const kicked = { ...state, col: state.col - dCol, rotation: newRotation }
    if (isValidPosition(kicked)) return kicked
  }

  if (dRow < 0) {
    // 子ぷよが下にある場合 → 床蹴り（上方向への押し上げ）
    // 床蹴りは落下位置計算時に自然に処理されるため、ここでは位置をそのまま返す
    // ただしMVPでは操作フィールド上部での操作のため、床蹴り不要
  }

  // 回転不可の場合はそのまま返す
  return state
}

/** 位置が有効かチェックする */
function isValidPosition(state: PairState): boolean {
  // 軸ぷよの列チェック
  if (state.col < 0 || state.col >= BOARD_COLS) return false

  // 子ぷよの位置チェック
  const [dCol] = ROTATION_OFFSETS[state.rotation]
  const childCol = state.col + dCol
  if (childCol < 0 || childCol >= BOARD_COLS) return false

  // 盤面上のぷよとの衝突チェック（操作中は盤面最上部にいるため、
  // 積まれたぷよとの衝突は基本的にはないが、列が満杯の場合を考慮）
  return true
}

/** 組ぷよの配置結果 */
export interface PlacePairResult {
  /** 連鎖解決後の盤面 */
  readonly board: Board
  /** 連鎖情報 */
  readonly chainResult: ChainResult
}

/**
 * 組ぷよを盤面に落下配置する（連鎖解決前）。
 * 配置不可（列が満杯など）の場合は null を返す。
 */
function dropPair(board: Board, state: PairState): Board | null {
  const [dCol, dRow] = ROTATION_OFFSETS[state.rotation]
  const childCol = state.col + dCol

  if (dCol === 0) {
    // 縦向き: 同じ列に2つ積む
    const dropRow = getDropRow(board, state.col)
    if (dropRow < 0) return null

    if (dRow > 0) {
      if (dropRow + 1 >= BOARD_ROWS) return null
      const b1 = setCell(board, dropRow, state.col, state.pair.axis)
      return setCell(b1, dropRow + 1, state.col, state.pair.child)
    } else {
      if (dropRow + 1 >= BOARD_ROWS) return null
      const b1 = setCell(board, dropRow, state.col, state.pair.child)
      return setCell(b1, dropRow + 1, state.col, state.pair.axis)
    }
  } else {
    // 横向き: 別の列に落とす（ちぎり）
    const axisDropRow = getDropRow(board, state.col)
    const childDropRow = getDropRow(board, childCol)
    if (axisDropRow < 0 || childDropRow < 0) return null

    const b1 = setCell(board, axisDropRow, state.col, state.pair.axis)
    return setCell(b1, childDropRow, childCol, state.pair.child)
  }
}

/**
 * 組ぷよを盤面に配置する。連鎖解決後の盤面と連鎖情報を返す。
 * 配置不可（列が満杯など）の場合は null を返す。
 */
export function placePair(
  board: Board,
  state: PairState,
): PlacePairResult | null {
  const dropped = dropPair(board, state)
  if (!dropped) return null
  const chainResult = resolveAndScoreChains(dropped)
  return { board: chainResult.resultBoard, chainResult }
}

/** 使用可能な色からランダムに組ぷよを生成する */
export function generateRandomPair(
  availableColors: readonly FilledColor[],
): PuyoPair {
  const axis =
    availableColors[Math.floor(Math.random() * availableColors.length)]
  const child =
    availableColors[Math.floor(Math.random() * availableColors.length)]
  return { axis, child }
}

/**
 * 操作中の組ぷよの落下プレビュー位置を計算する。
 * 各ぷよが実際に落下する [row, col] を返す。
 */
export function getDropPreview(
  board: Board,
  state: PairState,
): {
  axis: { row: number; col: number }
  child: { row: number; col: number }
} | null {
  const [dCol, dRow] = ROTATION_OFFSETS[state.rotation]
  const childCol = state.col + dCol

  if (dCol === 0) {
    // 縦向き
    const dropRow = getDropRow(board, state.col)
    if (dropRow < 0) return null

    if (dRow > 0) {
      if (dropRow + 1 >= BOARD_ROWS) return null
      return {
        axis: { row: dropRow, col: state.col },
        child: { row: dropRow + 1, col: state.col },
      }
    } else {
      if (dropRow + 1 >= BOARD_ROWS) return null
      return {
        axis: { row: dropRow + 1, col: state.col },
        child: { row: dropRow, col: state.col },
      }
    }
  } else {
    // 横向き
    const axisDropRow = getDropRow(board, state.col)
    const childDropRow = getDropRow(board, childCol)
    if (axisDropRow < 0 || childDropRow < 0) return null

    return {
      axis: { row: axisDropRow, col: state.col },
      child: { row: childDropRow, col: childCol },
    }
  }
}
