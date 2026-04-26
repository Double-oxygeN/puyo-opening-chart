import { useState, useCallback } from 'react'
import { PuyoColor } from './domain/color'
import type { PuyoPair, PairState } from './domain/pair'
import { createInitialPairState } from './domain/pair'
import { useGraph } from './hooks/useGraph'
import BoardView from './components/BoardView'
import PairSelector from './components/PairSelector'
import PairController from './components/PairController'
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

  const currentBoard = selectedNode?.board

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">
          ぷよぷよ通 初手研究チャート
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左: グラフツリー */}
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-auto">
          <div className="p-4">
            <h2 className="text-sm font-medium text-gray-500 mb-2">
              グラフツリー
            </h2>
            <GraphTreeView
              graph={graph}
              selectedNodeId={selectedNodeId}
              onSelectNode={selectNode}
            />
          </div>
        </div>

        {/* 右: 盤面 + 操作パネル */}
        <div className="w-1/2 flex flex-col items-center p-6 gap-6 overflow-auto">
          <h2 className="text-sm font-medium text-gray-500">盤面</h2>

          {currentBoard && (
            <>
              <BoardView board={currentBoard} pairState={pairState} />

              <div className="flex flex-col gap-4 items-center">
                <PairSelector pair={pair} onChangePair={handleChangePair} />
                <PairController
                  pairState={pairState}
                  onUpdatePairState={setPairState}
                  onPlace={handlePlace}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
