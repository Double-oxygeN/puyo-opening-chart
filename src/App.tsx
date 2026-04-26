import { useState, useCallback, useMemo } from 'react'
import { PuyoColor } from './domain/color'
import type { PuyoPair, PairState } from './domain/pair'
import { createInitialPairState } from './domain/pair'
import { useGraph } from './hooks/useGraph'
import type { NodeId } from './domain/graph'
import { getParentEdge } from './domain/graph'
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
  const [next, setNext] = useState<PuyoPair | null>(null)
  const [nextNext, setNextNext] = useState<PuyoPair | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 親エッジの情報に基づく色確定ロジック
  const parentEdge = useMemo(
    () => getParentEdge(graph, selectedNodeId),
    [graph, selectedNodeId],
  )

  // 親エッジにネクストが設定されている場合、ツモの色は確定
  const lockedPair = parentEdge?.next ?? null
  // 親エッジにネクネクが設定されている場合、ネクストの色は確定
  const lockedNext = parentEdge?.nextNext ?? null

  const effectivePair = lockedPair ?? pair
  const effectiveNext = lockedNext ?? next

  const handleChangePair = useCallback(
    (newPair: PuyoPair) => {
      if (lockedPair) return
      setPair(newPair)
      setPairState(createInitialPairState(newPair))
    },
    [lockedPair],
  )

  const handleChangeNext = useCallback(
    (newNext: PuyoPair) => {
      if (lockedNext) return
      setNext(newNext)
    },
    [lockedNext],
  )

  const handleChangeNextNext = useCallback((newNextNext: PuyoPair) => {
    setNextNext(newNextNext)
  }, [])

  const handleClearNext = useCallback(() => {
    if (lockedNext) return
    setNext(null)
    setNextNext(null)
  }, [lockedNext])

  const handleClearNextNext = useCallback(() => {
    setNextNext(null)
  }, [])

  const handlePlace = useCallback(() => {
    const success = placeAndAddNode(
      pairState,
      effectiveNext ?? undefined,
      nextNext ?? undefined,
    )
    if (success) {
      // 配置後: ネクストがあればツモに繰り上げ、ネクネクがあればネクストに繰り上げ
      if (effectiveNext) {
        setPair(effectiveNext)
        setPairState(createInitialPairState(effectiveNext))
        if (nextNext) {
          setNext(nextNext)
        } else {
          setNext(null)
        }
        setNextNext(null)
      } else {
        setPairState(createInitialPairState(effectivePair))
      }
    }
  }, [placeAndAddNode, pairState, effectivePair, effectiveNext, nextNext])

  const handleSelectNode = useCallback(
    (nodeId: NodeId) => {
      selectNode(nodeId)

      // ノード選択時に親エッジの情報を確認して色を設定
      const edge = getParentEdge(graph, nodeId)
      if (edge?.next) {
        setPair(edge.next)
        setPairState(createInitialPairState(edge.next))
        if (edge.nextNext) {
          setNext(edge.nextNext)
        } else {
          setNext(null)
        }
      } else {
        setPairState(createInitialPairState(pair))
        setNext(null)
      }
      setNextNext(null)
      setIsDialogOpen(true)
    },
    [selectNode, pair, graph],
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
          pair={effectivePair}
          pairState={pairState}
          onChangePair={handleChangePair}
          onUpdatePairState={setPairState}
          onPlace={handlePlace}
          next={effectiveNext}
          nextNext={nextNext}
          onChangeNext={handleChangeNext}
          onChangeNextNext={handleChangeNextNext}
          onClearNext={handleClearNext}
          onClearNextNext={handleClearNextNext}
          pairEditable={lockedPair === null}
          nextEditable={lockedNext === null}
        />
      )}
    </div>
  )
}

export default App
