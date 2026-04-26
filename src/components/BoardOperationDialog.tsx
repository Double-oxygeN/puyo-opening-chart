import type { Board } from '../domain/board'
import type { PuyoPair, PairState } from '../domain/pair'
import BoardView from './BoardView'
import PairSlot from './PairSlot'
import PairController from './PairController'

interface BoardOperationDialogProps {
  board: Board
  pair: PuyoPair
  pairState: PairState
  onChangePair: (pair: PuyoPair) => void
  onUpdatePairState: (state: PairState) => void
  onPlace: () => void
}

export default function BoardOperationDialog({
  board,
  pair,
  pairState,
  onChangePair,
  onUpdatePairState,
  onPlace,
}: BoardOperationDialogProps) {
  return (
    <div className="fixed top-0 right-0 bottom-0 z-50 pointer-events-none flex items-start justify-end p-6 pt-20">
      <div
        className="pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-6 flex flex-col gap-4 max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-gray-500 text-center">
          盤面操作
        </h2>

        <div className="flex gap-6">
          {/* 盤面表示 */}
          <BoardView board={board} pairState={pairState} />

          {/* 組ぷよ編集領域 */}
          <div className="flex flex-col items-center gap-4">
            <PairSlot label="ツモ" pair={pair} onChangePair={onChangePair} />
          </div>
        </div>

        {/* 操作説明 */}
        <PairController
          pairState={pairState}
          onUpdatePairState={onUpdatePairState}
          onPlace={onPlace}
        />
      </div>
    </div>
  )
}
