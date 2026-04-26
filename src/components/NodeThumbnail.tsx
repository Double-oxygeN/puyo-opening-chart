import type { Board } from '../domain/board'
import { BOARD_COLS, BOARD_ROWS } from '../domain/board'
import { PuyoColor, PUYO_HEX_COLORS } from '../domain/color'

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
          return (
            <circle
              key={`${row}-${col}`}
              cx={col * cellSize + cellSize / 2}
              cy={displayIdx * cellSize + cellSize / 2}
              r={cellSize / 2 - 0.5}
              fill={PUYO_HEX_COLORS[cell]}
              opacity={row === BOARD_ROWS - 1 ? 0.3 : 1}
            />
          )
        })
      })}
    </svg>
  )
}
