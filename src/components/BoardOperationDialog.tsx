import type { Board } from '../domain/board'
import type { PuyoPair, PairState } from '../domain/pair'
import BoardView from './BoardView'
import PairSelector from './PairSelector'
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
        className="pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-6 flex flex-col items-center gap-6 max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-gray-500">盤面操作</h2>

        <BoardView board={board} pairState={pairState} />

        <div className="flex flex-col gap-4 items-center">
          <PairSelector pair={pair} onChangePair={onChangePair} />
          <PairController
            pairState={pairState}
            onUpdatePairState={onUpdatePairState}
            onPlace={onPlace}
          />
        </div>
      </div>
    </div>
  )
}
