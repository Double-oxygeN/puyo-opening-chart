import { useState, useCallback } from 'react'
import { PuyoColor } from './domain/color'
import type { PuyoPair, PairState } from './domain/pair'
import { createInitialPairState } from './domain/pair'
import { useGraph } from './hooks/useGraph'
import { exportGraphToFile, importGraphFromFile } from './hooks/useGraphStorage'
import type { NodeId } from './domain/graph'
import BoardOperationDialog from './components/BoardOperationDialog'
import GraphTreeView from './components/GraphTreeView'
import HeaderMenu from './components/HeaderMenu'

const DEFAULT_PAIR: PuyoPair = {
  axis: PuyoColor.Red,
  child: PuyoColor.Red,
}

function App() {
  const {
    graph,
    selectedNode,
    selectedNodeId,
    selectNode,
    placeAndAddNode,
    updateMemo,
    resetGraph,
    importGraph,
    loading,
  } = useGraph()

  const [pair, setPair] = useState<PuyoPair>(DEFAULT_PAIR)
  const [pairState, setPairState] = useState<PairState>(
    createInitialPairState(DEFAULT_PAIR),
  )
  const [next, setNext] = useState<PuyoPair | null>(null)
  const [nextNext, setNextNext] = useState<PuyoPair | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // ノードのツモ制約に基づく色確定ロジック
  const lockedPair = selectedNode?.constraint?.currentPair ?? null
  const lockedNext = selectedNode?.constraint?.nextPair ?? null

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

      // ノード選択時に制約の情報を確認して色を設定
      const node = graph.nodes.find((n) => n.id === nodeId)
      const constraint = node?.constraint
      if (constraint?.currentPair) {
        setPair(constraint.currentPair)
        setPairState(createInitialPairState(constraint.currentPair))
        if (constraint.nextPair) {
          setNext(constraint.nextPair)
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

  const handleSaveMemo = useCallback(
    (memo: string) => {
      updateMemo(selectedNodeId, memo)
    },
    [updateMemo, selectedNodeId],
  )

  const handleResetGraph = useCallback(() => {
    if (
      window.confirm(
        'すべてのデータをリセットしますか？この操作は取り消せません。',
      )
    ) {
      resetGraph()
      setIsDialogOpen(false)
    }
  }, [resetGraph])

  const handleExport = useCallback(() => {
    exportGraphToFile(graph)
  }, [graph])

  const handleImport = useCallback(() => {
    importGraphFromFile()
      .then((imported) => {
        if (!imported) return
        if (
          !window.confirm(
            '現在のデータを上書きしてインポートしますか？この操作は取り消せません。',
          )
        ) {
          return
        }
        importGraph(imported)
        setIsDialogOpen(false)
      })
      .catch((e: unknown) => {
        window.alert(
          e instanceof Error ? e.message : 'インポートに失敗しました。',
        )
      })
  }, [importGraph])

  const currentBoard = selectedNode?.board

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          ぷよぷよ通 初手研究チャート
        </h1>
        <HeaderMenu
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleResetGraph}
        />
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
          memo={selectedNode?.memo ?? ''}
          onSaveMemo={handleSaveMemo}
        />
      )}
    </div>
  )
}

export default App
