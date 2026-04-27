import { useState, useCallback, useMemo } from 'react'
import { PuyoColor } from './domain/color'
import type { PuyoPair, PairState } from './domain/pair'
import { createInitialPairState, generateRandomPair } from './domain/pair'
import { isDead } from './domain/board'
import type { Difficulty } from './domain/difficulty'
import { getAvailableColors } from './domain/difficulty'
import { useGraph } from './hooks/useGraph'
import {
  exportSaveDataToFile,
  importSaveDataFromFile,
} from './hooks/useGraphStorage'
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
    difficulty,
    selectNode,
    placeAndAddNode,
    updateMemo,
    deleteNode,
    resetGraph,
    importGraph,
    loading,
  } = useGraph()

  const availableColors = useMemo(
    () => getAvailableColors(difficulty),
    [difficulty],
  )

  const [pairState, setPairState] = useState<PairState>(
    createInitialPairState(DEFAULT_PAIR),
  )
  const [next, setNext] = useState<PuyoPair | null>(null)
  const [nextNext, setNextNext] = useState<PuyoPair | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [randomTsumo, setRandomTsumo] = useState(true)

  // ノードのツモ制約に基づく色確定ロジック
  const lockedPair = selectedNode?.constraint?.currentPair ?? null
  const lockedNext = selectedNode?.constraint?.nextPair ?? null

  const effectivePair = lockedPair ?? pairState.pair
  const effectiveNext = lockedNext ?? next

  const handleChangePair = useCallback(
    (newPair: PuyoPair) => {
      if (lockedPair) return
      setPairState(createInitialPairState(newPair))
    },
    [lockedPair],
  )

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
      const newColors = getAvailableColors(newDifficulty)
      const defaultColor = newColors[0]
      setPairState(
        createInitialPairState({ axis: defaultColor, child: defaultColor }),
      )
      setNext(null)
      setNextNext(null)
      setIsDialogOpen(false)
    },
    [difficulty, resetGraph],
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
        setPairState(createInitialPairState(effectiveNext))
        if (nextNext) {
          setNext(nextNext)
        } else {
          setNext(null)
        }
        setNextNext(null)
      } else if (randomTsumo) {
        // ランダムツモ: ネクスト未設定時に現在ツモをランダムに切り替え（制約には保存しない）
        const randomPair = generateRandomPair(availableColors)
        setPairState(createInitialPairState(randomPair))
      } else {
        setPairState(createInitialPairState(effectivePair))
      }
    }
  }, [
    placeAndAddNode,
    pairState,
    effectivePair,
    effectiveNext,
    nextNext,
    randomTsumo,
    availableColors,
  ])

  const handleSelectNode = useCallback(
    (nodeId: NodeId) => {
      selectNode(nodeId)

      // ノード選択時に制約の情報を確認して色を設定
      const node = graph.nodes.find((n) => n.id === nodeId)
      const constraint = node?.constraint
      if (constraint?.currentPair) {
        setPairState(createInitialPairState(constraint.currentPair))
        if (constraint.nextPair) {
          setNext(constraint.nextPair)
        } else {
          setNext(null)
        }
      } else {
        setPairState(createInitialPairState(pairState.pair))
        setNext(null)
      }
      setNextNext(null)
      setIsDialogOpen(true)
    },
    [selectNode, pairState.pair, graph],
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

  const handleToggleRandomTsumo = useCallback(() => {
    setRandomTsumo((prev) => !prev)
  }, [])

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
          randomTsumo={randomTsumo}
          onToggleRandomTsumo={handleToggleRandomTsumo}
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
          availableColors={availableColors}
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
