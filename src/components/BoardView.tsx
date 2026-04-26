import type { Board } from '../domain/board'
import type { PairState } from '../domain/pair'
import { BOARD_COLS, BOARD_ROWS } from '../domain/board'
import { PuyoColor, PUYO_BG_CLASSES } from '../domain/color'
import { getDropPreview } from '../domain/pair'

interface BoardViewProps {
  board: Board
  pairState?: PairState | null
  compact?: boolean
}

export default function BoardView({
  board,
  pairState,
  compact = false,
}: BoardViewProps) {
  const preview = pairState ? getDropPreview(board, pairState) : null

  const cellSize = compact ? 'w-3 h-3' : 'w-8 h-8'
  const gap = compact ? 'gap-px' : 'gap-0.5'

  // 表示は上から下へ（12段目→1段目）、13段目は非表示行として薄く表示
  const visibleRows = BOARD_ROWS // 13段全部表示（13段目は薄く）

  return (
    <div
      className={`inline-grid ${gap}`}
      style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: visibleRows }, (_, displayIdx) => {
        const row = visibleRows - 1 - displayIdx // 上から表示するので反転
        const isHiddenRow = row === BOARD_ROWS - 1 // 13段目

        return Array.from({ length: BOARD_COLS }, (_, col) => {
          const cell = board[row][col]
          const bgColor = PUYO_BG_CLASSES[cell]

          // 落下プレビュー
          let isPreview = false
          let previewColor = ''
          if (preview) {
            if (preview.axis.row === row && preview.axis.col === col) {
              isPreview = true
              previewColor = PUYO_BG_CLASSES[pairState!.pair.axis]
            } else if (preview.child.row === row && preview.child.col === col) {
              isPreview = true
              previewColor = PUYO_BG_CLASSES[pairState!.pair.child]
            }
          }

          // 窒息ライン: 3列目(index=2)の12段目(index=11)
          const isDeadZone = row === 11 && col === 2

          return (
            <div
              key={`${row}-${col}`}
              className={`
                ${cellSize} rounded-full border
                ${
                  isPreview && cell === PuyoColor.Empty
                    ? `${previewColor} opacity-40`
                    : bgColor
                }
                ${isHiddenRow ? 'opacity-30' : ''}
                ${isDeadZone && cell === PuyoColor.Empty ? 'border-red-400 border-2' : 'border-gray-300'}
              `}
              aria-label={`${row + 1}段${col + 1}列`}
            />
          )
        })
      })}
    </div>
  )
}
