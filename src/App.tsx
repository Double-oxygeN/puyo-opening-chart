import { useState, useCallback } from 'react'
import { PuyoColor } from './domain/color'
import type { PuyoPair, PairState } from './domain/pair'
import { createInitialPairState } from './domain/pair'
import { useGraph } from './hooks/useGraph'
import type { NodeId } from './domain/graph'
import BoardOperationDialog from './components/BoardOperationDialog'
import GraphTreeView from './components/GraphTreeView'

const DEFAULT_PAIR: PuyoPair = {
  axis: PuyoColor.Red,
  child: PuyoColor.Red,
}

function App() {
  const { graph, selectedNode, selectedNodeId, selectNode, placeAndAddNode } =
    useGraph()

  const [pair, setPair] = useState<PuyoPair>(DEFAULT_PAIR)
  const [pairState, setPairState] = useState<PairState>(
    createInitialPairState(DEFAULT_PAIR),
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleChangePair = useCallback((newPair: PuyoPair) => {
    setPair(newPair)
    setPairState(createInitialPairState(newPair))
  }, [])

  const handlePlace = useCallback(() => {
    const success = placeAndAddNode(pairState)
    if (success) {
      setPairState(createInitialPairState(pair))
    }
  }, [placeAndAddNode, pairState, pair])

  const handleSelectNode = useCallback(
    (nodeId: NodeId) => {
      selectNode(nodeId)
      setPairState(createInitialPairState(pair))
      setIsDialogOpen(true)
    },
    [selectNode, pair],
  )

  const handleBackgroundClick = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  const currentBoard = selectedNode?.board

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">
          ぷよぷよ通 初手研究チャート
        </h1>
      </header>

      <div
        className="flex-1 overflow-auto bg-white"
        onClick={handleBackgroundClick}
      >
        <div className="p-4">
          <GraphTreeView
            graph={graph}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        </div>
      </div>

      {isDialogOpen && currentBoard && (
        <BoardOperationDialog
          board={currentBoard}
          pair={pair}
          pairState={pairState}
          onChangePair={handleChangePair}
          onUpdatePairState={setPairState}
          onPlace={handlePlace}
        />
      )}
    </div>
  )
}

export default App
