import { useReducer, useCallback, useEffect } from 'react'
import type { Graph, GraphNode, NodeId, TsumoConstraint } from '../domain/graph'
import {
  createInitialGraph,
  addNode,
  addEdge,
  findMatchingEdge,
  findMergeableNode,
  findDuplicateEdge,
  replaceEdgeTarget,
  removeNode,
  findParentNodeId,
  updateNodeMemo,
  validateGraph,
} from '../domain/graph'
import { placePair } from '../domain/pair'
import { isDead } from '../domain/board'
import type { PairState, PuyoPair } from '../domain/pair'
import type { Difficulty } from '../domain/difficulty'
import { DEFAULT_DIFFICULTY } from '../domain/difficulty'
import { formatChainNotation } from '../domain/chain'
import { loadSaveData, saveSaveData, clearGraph } from './useGraphStorage'

interface GraphState {
  graph: Graph
  selectedNodeId: NodeId
  difficulty: Difficulty
  /** localStorage からの読み込み（hydration）が完了したか */
  hydrated: boolean
}

type GraphAction =
  | { type: 'selectNode'; nodeId: NodeId }
  | {
      type: 'placeAndAddNode'
      pairState: PairState
      next?: PuyoPair
      nextNext?: PuyoPair
    }
  | { type: 'updateMemo'; nodeId: NodeId; memo: string }
  | { type: 'deleteNode'; nodeId: NodeId }
  | { type: 'resetGraph'; difficulty: Difficulty }
  | { type: 'hydrateGraph'; graph: Graph; difficulty: Difficulty }
  | { type: 'importGraph'; graph: Graph; difficulty: Difficulty }

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'selectNode':
      return { ...state, selectedNodeId: action.nodeId }

    case 'placeAndAddNode': {
      const currentNode = state.graph.nodes.find(
        (n) => n.id === state.selectedNodeId,
      )
      if (!currentNode) return state
      if (isDead(currentNode.board)) return state

      const placeResult = placePair(currentNode.board, action.pairState)
      if (!placeResult) return state

      const { board: newBoard, chainResult } = placeResult
      const chainNotation = formatChainNotation(chainResult) ?? undefined

      // 同一辺（ツモ・ネクスト・ネクネクが一致）を検索
      const existingEdge = findMatchingEdge(
        state.graph,
        state.selectedNodeId,
        action.pairState.pair,
        action.next,
        action.nextNext,
      )

      if (existingEdge) {
        // 遷移先ノードのツモ制約を計算
        const edgeConstraint: TsumoConstraint | undefined =
          action.next != null
            ? {
                currentPair: action.next,
                ...(action.nextNext != null
                  ? { nextPair: action.nextNext }
                  : {}),
              }
            : undefined

        // 新しい盤面に一致する既存ノードを検索（自動統合）
        const mergeTarget = findMergeableNode(
          state.graph,
          newBoard,
          edgeConstraint,
        )

        if (mergeTarget) {
          // 既に同じノードを指していれば何もしない
          if (existingEdge.to === mergeTarget.id) {
            return { ...state, selectedNodeId: mergeTarget.id }
          }
          // エッジの遷移先を既存ノードに差し替え
          const updatedGraph = replaceEdgeTarget(
            state.graph,
            existingEdge.id,
            mergeTarget.id,
          )
          return {
            ...state,
            graph: updatedGraph,
            selectedNodeId: mergeTarget.id,
          }
        }

        // 新ノードを作成し、エッジの遷移先を差し替え
        const [graphWithNode, newNode] = addNode(
          state.graph,
          newBoard,
          edgeConstraint,
        )
        const updatedGraph = replaceEdgeTarget(
          graphWithNode,
          existingEdge.id,
          newNode.id,
        )
        return { ...state, graph: updatedGraph, selectedNodeId: newNode.id }
      }

      // 遷移先ノードのツモ制約を計算
      const constraint: TsumoConstraint | undefined =
        action.next != null
          ? {
              currentPair: action.next,
              ...(action.nextNext != null ? { nextPair: action.nextNext } : {}),
            }
          : undefined

      // 同じ盤面＋同じ制約の既存ノードを検索（自動統合）
      const mergeableNode = findMergeableNode(state.graph, newBoard, constraint)

      if (mergeableNode) {
        // 同一親から同じノードへの重複エッジがあればエッジ追加を省略
        const dupEdge = findDuplicateEdge(
          state.graph,
          state.selectedNodeId,
          mergeableNode.id,
          action.next,
          action.nextNext,
        )
        if (dupEdge) {
          return { ...state, selectedNodeId: mergeableNode.id }
        }

        const graphWithEdge = addEdge(
          state.graph,
          state.selectedNodeId,
          mergeableNode.id,
          action.pairState.pair,
          action.pairState.col,
          action.pairState.rotation,
          action.next,
          action.nextNext,
          chainNotation,
        )
        return {
          ...state,
          graph: graphWithEdge,
          selectedNodeId: mergeableNode.id,
        }
      }

      const [graphWithNode, newNode] = addNode(
        state.graph,
        newBoard,
        constraint,
      )
      const graphWithEdge = addEdge(
        graphWithNode,
        state.selectedNodeId,
        newNode.id,
        action.pairState.pair,
        action.pairState.col,
        action.pairState.rotation,
        action.next,
        action.nextNext,
        chainNotation,
      )

      return { ...state, graph: graphWithEdge, selectedNodeId: newNode.id }
    }

    case 'updateMemo':
      return {
        ...state,
        graph: updateNodeMemo(state.graph, action.nodeId, action.memo),
      }

    case 'deleteNode': {
      const rootId = state.graph.nodes[0]?.id
      if (!rootId || action.nodeId === rootId) return state
      const parentId = findParentNodeId(state.graph, action.nodeId) ?? rootId
      const newGraph = removeNode(state.graph, action.nodeId)
      return {
        ...state,
        graph: newGraph,
        selectedNodeId: parentId,
      }
    }

    case 'resetGraph': {
      clearGraph()
      return createInitialState(true, action.difficulty)
    }

    case 'hydrateGraph':
      return {
        graph: action.graph,
        selectedNodeId: action.graph.nodes[0].id,
        difficulty: action.difficulty,
        hydrated: true,
      }

    case 'importGraph':
      return {
        graph: action.graph,
        selectedNodeId: action.graph.nodes[0].id,
        difficulty: action.difficulty,
        hydrated: true,
      }
  }
}

function createInitialState(
  hydrated = false,
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
): GraphState {
  const graph = createInitialGraph()
  return { graph, selectedNodeId: graph.nodes[0].id, difficulty, hydrated }
}

interface UseGraphReturn {
  graph: Graph
  selectedNode: GraphNode | undefined
  selectedNodeId: NodeId
  difficulty: Difficulty
  selectNode: (nodeId: NodeId) => void
  placeAndAddNode: (
    pairState: PairState,
    next?: PuyoPair,
    nextNext?: PuyoPair,
  ) => boolean
  updateMemo: (nodeId: NodeId, memo: string) => void
  deleteNode: (nodeId: NodeId) => void
  resetGraph: (difficulty: Difficulty) => void
  importGraph: (graph: Graph, difficulty: Difficulty) => void
  loading: boolean
}

export function useGraph(): UseGraphReturn {
  const [state, dispatch] = useReducer(
    graphReducer,
    undefined,
    createInitialState,
  )

  const selectedNode = state.graph.nodes.find(
    (n) => n.id === state.selectedNodeId,
  )

  const selectNode = useCallback((nodeId: NodeId) => {
    dispatch({ type: 'selectNode', nodeId })
  }, [])

  const placeAndAddNode = useCallback(
    (pairState: PairState, next?: PuyoPair, nextNext?: PuyoPair): boolean => {
      const currentNode = state.graph.nodes.find(
        (n) => n.id === state.selectedNodeId,
      )
      if (!currentNode) return false
      if (isDead(currentNode.board)) return false
      if (placePair(currentNode.board, pairState) === null) return false

      dispatch({ type: 'placeAndAddNode', pairState, next, nextNext })
      return true
    },
    [state],
  )

  const updateMemo = useCallback((nodeId: NodeId, memo: string) => {
    dispatch({ type: 'updateMemo', nodeId, memo })
  }, [])

  const deleteNode = useCallback((nodeId: NodeId) => {
    dispatch({ type: 'deleteNode', nodeId })
  }, [])

  const resetGraph = useCallback((difficulty: Difficulty) => {
    dispatch({ type: 'resetGraph', difficulty })
  }, [])

  const importGraph = useCallback((graph: Graph, difficulty: Difficulty) => {
    dispatch({ type: 'importGraph', graph, difficulty })
  }, [])

  // 初回マウント時に localStorage から非同期読み込み・検証
  useEffect(() => {
    let cancelled = false

    const hydrate = () => {
      const saveData = loadSaveData()
      if (!saveData) {
        if (!cancelled)
          dispatch({
            type: 'hydrateGraph',
            graph: createInitialGraph(),
            difficulty: DEFAULT_DIFFICULTY,
          })
        return
      }

      if (!validateGraph(saveData.graph)) {
        console.error(
          '保存データの整合性検証に失敗しました。初期状態で起動します。',
        )
        if (!cancelled)
          dispatch({
            type: 'hydrateGraph',
            graph: createInitialGraph(),
            difficulty: DEFAULT_DIFFICULTY,
          })
        return
      }

      if (!cancelled)
        dispatch({
          type: 'hydrateGraph',
          graph: saveData.graph,
          difficulty: saveData.difficulty,
        })
    }

    // 非同期にして読み込み中UIを表示可能にする
    void Promise.resolve().then(hydrate)

    return () => {
      cancelled = true
    }
  }, [])

  // hydration 完了後のみグラフ変更を自動保存
  useEffect(() => {
    if (!state.hydrated) return

    saveSaveData({ graph: state.graph, difficulty: state.difficulty })
  }, [state.graph, state.difficulty, state.hydrated])

  return {
    graph: state.graph,
    selectedNode,
    selectedNodeId: state.selectedNodeId,
    difficulty: state.difficulty,
    selectNode,
    placeAndAddNode,
    updateMemo,
    deleteNode,
    resetGraph,
    importGraph,
    loading: !state.hydrated,
  }
}
