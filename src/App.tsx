import { useState, useCallback } from 'react'
import { isDead } from './domain/board'
import type { Difficulty } from './domain/difficulty'
import { useGraph } from './hooks/useGraph'
import { useTsumoState } from './hooks/useTsumoState'
import {
  exportSaveDataToFile,
  importSaveDataFromFile,
} from './hooks/useGraphStorage'
import type { NodeId } from './domain/graph'
import BoardOperationDialog from './components/BoardOperationDialog'
import GraphTreeView from './components/GraphTreeView'
import HeaderMenu from './components/HeaderMenu'

function App() {
  const {
    graph,
    selectedNode,
    selectedNodeId,
    difficulty,
    selectNode,
    placeAndAddNode,
    updateMemo,
    deleteNode,
    resetGraph,
    importGraph,
    loading,
  } = useGraph()

  const tsumo = useTsumoState({
    selectedNode,
    difficulty,
    placeAndAddNode,
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleChangeDifficulty = useCallback(
    (newDifficulty: Difficulty) => {
      if (newDifficulty === difficulty) return
      if (
        !window.confirm(
          '難易度を変更するとグラフがリセットされます。よろしいですか？',
        )
      ) {
        return
      }
      resetGraph(newDifficulty)
      tsumo.resetForDifficulty(newDifficulty)
      setIsDialogOpen(false)
    },
    [difficulty, resetGraph, tsumo],
  )

  const handleSelectNode = useCallback(
    (nodeId: NodeId) => {
      selectNode(nodeId)

      const node = graph.nodes.find((n) => n.id === nodeId)
      tsumo.resetForNode(node)
      setIsDialogOpen(true)
    },
    [selectNode, graph, tsumo],
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
      resetGraph(difficulty)
      setIsDialogOpen(false)
    }
  }, [resetGraph, difficulty])

  const handleDeleteNode = useCallback(() => {
    deleteNode(selectedNodeId)
    setIsDialogOpen(false)
  }, [deleteNode, selectedNodeId])

  const handleExport = useCallback(() => {
    exportSaveDataToFile({ graph, difficulty })
  }, [graph, difficulty])

  const handleImport = useCallback(() => {
    importSaveDataFromFile()
      .then((imported) => {
        if (!imported) return
        if (
          !window.confirm(
            '現在のデータを上書きしてインポートしますか？この操作は取り消せません。',
          )
        ) {
          return
        }
        importGraph(imported.graph, imported.difficulty)
        setIsDialogOpen(false)
      })
      .catch((e: unknown) => {
        window.alert(
          e instanceof Error ? e.message : 'インポートに失敗しました。',
        )
      })
  }, [importGraph])

  const currentBoard = selectedNode?.board
  const currentBoardDead = currentBoard ? isDead(currentBoard) : false

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
          difficulty={difficulty}
          onChangeDifficulty={handleChangeDifficulty}
          randomTsumo={tsumo.randomTsumo}
          onToggleRandomTsumo={tsumo.toggleRandomTsumo}
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
          pair={tsumo.effectivePair}
          pairState={tsumo.pairState}
          availableColors={tsumo.availableColors}
          onChangePair={tsumo.changePair}
          onUpdatePairState={tsumo.setPairState}
          onPlace={tsumo.place}
          next={tsumo.effectiveNext}
          nextNext={tsumo.nextNext}
          onChangeNext={tsumo.changeNext}
          onChangeNextNext={tsumo.changeNextNext}
          onClearNext={tsumo.clearNext}
          onClearNextNext={tsumo.clearNextNext}
          pairEditable={tsumo.lockedPair === null}
          nextEditable={tsumo.lockedNext === null}
          dead={currentBoardDead}
          memo={selectedNode?.memo ?? ''}
          onSaveMemo={handleSaveMemo}
          onDeleteNode={
            selectedNodeId !== graph.nodes[0]?.id ? handleDeleteNode : undefined
          }
        />
      )}
    </div>
  )
}

export default App
