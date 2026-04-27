import type { Board } from '../domain/board'
import type { CellConnectivity } from '../domain/board'
import type { PairState } from '../domain/pair'
import {
  BOARD_COLS,
  BOARD_ROWS,
  DEAD_COL,
  DEAD_ROW,
  computeConnectivityMap,
} from '../domain/board'
import { PuyoColor, PUYO_BG_CLASSES } from '../domain/color'
import { getDropPreview, Rotation } from '../domain/pair'

interface BoardViewProps {
  board: Board
  pairState?: PairState | null
  compact?: boolean
}

/** 角丸半径（セルサイズに対する割合） */
const CORNER_RADIUS_RATIO = 0.5

/**
 * 接続情報に基づいて CSS border-radius を計算する。
 * 角に接する2辺がどちらも非接続の場合のみ角を丸くする。
 */
function computeBorderRadius(conn: CellConnectivity, radiusPx: number): string {
  const r = `${radiusPx}px`
  const tl = !conn.top && !conn.left ? r : '0'
  const tr = !conn.top && !conn.right ? r : '0'
  const br = !conn.bottom && !conn.right ? r : '0'
  const bl = !conn.bottom && !conn.left ? r : '0'
  return `${tl} ${tr} ${br} ${bl}`
}

/**
 * ツモ操作状態の表示用セル位置を計算する。
 * 2行（row 0=下, row 1=上）×6列のグリッド内での軸・子ぷよの位置を返す。
 * 横向きの場合は下の行（row 0）に揃える。
 */
function getPairDisplayCells(pairState: PairState): {
  axis: { row: number; col: number }
  child: { row: number; col: number }
} {
  const col = pairState.col
  switch (pairState.rotation) {
    case Rotation.Up:
      return { axis: { row: 0, col }, child: { row: 1, col } }
    case Rotation.Down:
      return { axis: { row: 1, col }, child: { row: 0, col } }
    case Rotation.Right:
      return { axis: { row: 0, col }, child: { row: 0, col: col + 1 } }
    case Rotation.Left:
      return { axis: { row: 0, col }, child: { row: 0, col: col - 1 } }
  }
}

export default function BoardView({
  board,
  pairState,
  compact = false,
}: BoardViewProps) {
  const preview = pairState ? getDropPreview(board, pairState) : null
  const connectivityMap = computeConnectivityMap(board)

  const cellSizePx = compact ? 12 : 32
  const cellSize = compact ? 'w-3 h-3' : 'w-8 h-8'
  const radiusPx = cellSizePx * CORNER_RADIUS_RATIO

  // 表示は上から下へ（12段目→1段目）、13段目は非表示行として薄く表示
  const visibleRows = BOARD_ROWS // 13段全部表示（13段目は薄く）

  // ツモ操作状態の表示（compact モードでは非表示）
  const pairCells =
    !compact && pairState ? getPairDisplayCells(pairState) : null

  return (
    <div className="inline-flex flex-col">
      {/* ツモ操作状態の表示エリア（2行分） */}
      {pairCells && (
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`,
          }}
        >
          {/* 上の行 (row=1) → 下の行 (row=0) の順に表示 */}
          {[1, 0].map((row) =>
            Array.from({ length: BOARD_COLS }, (_, col) => {
              let color = ''
              if (pairCells.axis.row === row && pairCells.axis.col === col) {
                color = PUYO_BG_CLASSES[pairState!.pair.axis]
              } else if (
                pairCells.child.row === row &&
                pairCells.child.col === col
              ) {
                color = PUYO_BG_CLASSES[pairState!.pair.child]
              }
              return (
                <div
                  key={`pair-${row}-${col}`}
                  className={`${cellSize} rounded-full ${color}`}
                />
              )
            }),
          )}
        </div>
      )}

      {/* 盤面グリッド */}
      <div
        className="inline-grid bg-gray-200"
        style={{
          gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: visibleRows }, (_, displayIdx) => {
          const row = visibleRows - 1 - displayIdx // 上から表示するので反転
          const isHiddenRow = row === BOARD_ROWS - 1 // 13段目

          return Array.from({ length: BOARD_COLS }, (_, col) => {
            const cell = board[row][col]
            const bgColor = PUYO_BG_CLASSES[cell]
            const conn = connectivityMap[row][col]

            // 落下プレビュー
            let isPreview = false
            let previewColor = ''
            if (preview) {
              if (preview.axis.row === row && preview.axis.col === col) {
                isPreview = true
                previewColor = PUYO_BG_CLASSES[pairState!.pair.axis]
              } else if (
                preview.child.row === row &&
                preview.child.col === col
              ) {
                isPreview = true
                previewColor = PUYO_BG_CLASSES[pairState!.pair.child]
              }
            }

            const isDeadZone = row === DEAD_ROW && col === DEAD_COL
            const isEmpty = cell === PuyoColor.Empty
            const borderRadius = isEmpty
              ? undefined
              : computeBorderRadius(conn, radiusPx)

            return (
              <div
                key={`${row}-${col}`}
                className={`${cellSize} relative ${bgColor} ${isHiddenRow ? 'opacity-30' : ''}`}
                style={{
                  borderRadius,
                  ...(isDeadZone && isEmpty
                    ? {
                        outline: '2px solid #f87171',
                        outlineOffset: '-2px',
                      }
                    : {}),
                }}
                aria-label={`${row + 1}段${col + 1}列`}
              >
                {/* 落下プレビュー（独立した丸表示） */}
                {isPreview && isEmpty && (
                  <div
                    className={`absolute inset-0 rounded-full ${previewColor} opacity-40`}
                  />
                )}
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}
