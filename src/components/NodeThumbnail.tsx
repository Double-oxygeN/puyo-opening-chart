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

import type { Board } from '../domain/board'
import { BOARD_COLS, BOARD_ROWS, computeConnectivityMap } from '../domain/board'
import type { CellConnectivity } from '../domain/board'
import { PuyoColor, PUYO_HEX_COLORS } from '../domain/color'

/** 角丸半径（セルサイズに対する割合） */
const CORNER_RADIUS_RATIO = 0.5

/**
 * 角ごとに個別の丸め半径を持つ矩形の SVG パスを生成する。
 */
function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rtl: number,
  rtr: number,
  rbr: number,
  rbl: number,
): string {
  return [
    `M ${x + rtl} ${y}`,
    `H ${x + w - rtr}`,
    rtr > 0 ? `A ${rtr} ${rtr} 0 0 1 ${x + w} ${y + rtr}` : `L ${x + w} ${y}`,
    `V ${y + h - rbr}`,
    rbr > 0
      ? `A ${rbr} ${rbr} 0 0 1 ${x + w - rbr} ${y + h}`
      : `L ${x + w} ${y + h}`,
    `H ${x + rbl}`,
    rbl > 0 ? `A ${rbl} ${rbl} 0 0 1 ${x} ${y + h - rbl}` : `L ${x} ${y + h}`,
    `V ${y + rtl}`,
    rtl > 0 ? `A ${rtl} ${rtl} 0 0 1 ${x + rtl} ${y}` : `L ${x} ${y}`,
    'Z',
  ].join(' ')
}

/** 接続情報に基づいて角丸半径を計算する */
function computeCornerRadii(
  conn: CellConnectivity,
  radiusPx: number,
): [number, number, number, number] {
  const tl = !conn.top && !conn.left ? radiusPx : 0
  const tr = !conn.top && !conn.right ? radiusPx : 0
  const br = !conn.bottom && !conn.right ? radiusPx : 0
  const bl = !conn.bottom && !conn.left ? radiusPx : 0
  return [tl, tr, br, bl]
}

interface NodeThumbnailProps {
  board: Board
  /** サムネイルの高さ（px） */
  height?: number
  selected?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export default function NodeThumbnail({
  board,
  height = 72,
  selected = false,
  onClick,
}: NodeThumbnailProps) {
  const cellSize = height / BOARD_ROWS
  const svgWidth = cellSize * BOARD_COLS
  const svgHeight = height
  const radiusPx = cellSize * CORNER_RADIUS_RATIO
  const connectivityMap = computeConnectivityMap(board)

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={`cursor-pointer rounded border-2 ${
        selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'
      } hover:border-blue-300 transition-colors`}
      onClick={onClick}
      role="button"
      aria-label="盤面ノード"
    >
      <rect width={svgWidth} height={svgHeight} fill="#f9fafb" />
      {Array.from({ length: BOARD_ROWS }, (_, displayIdx) => {
        const row = BOARD_ROWS - 1 - displayIdx
        return Array.from({ length: BOARD_COLS }, (_, col) => {
          const cell = board[row][col]
          if (cell === PuyoColor.Empty) return null
          const conn = connectivityMap[row][col]
          const [rtl, rtr, rbr, rbl] = computeCornerRadii(conn, radiusPx)
          const x = col * cellSize
          const y = displayIdx * cellSize
          return (
            <path
              key={`${row}-${col}`}
              d={roundedRectPath(x, y, cellSize, cellSize, rtl, rtr, rbr, rbl)}
              fill={PUYO_HEX_COLORS[cell]}
              opacity={row === BOARD_ROWS - 1 ? 0.3 : 1}
            />
          )
        })
      })}
    </svg>
  )
}
