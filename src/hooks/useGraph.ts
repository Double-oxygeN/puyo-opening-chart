import { useReducer, useCallback } from 'react'
import type { Graph, GraphNode, NodeId, TsumoConstraint } from '../domain/graph'
import {
  createInitialGraph,
  addNode,
  addEdge,
  findMatchingEdge,
  findMergeableNode,
  findDuplicateEdge,
  replaceEdgeTarget,
  updateNodeMemo,
} from '../domain/graph'
import { placePair } from '../domain/pair'
import type { PairState, PuyoPair } from '../domain/pair'

interface GraphState {
  graph: Graph
  selectedNodeId: NodeId
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

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'selectNode':
      return { ...state, selectedNodeId: action.nodeId }

    case 'placeAndAddNode': {
      const currentNode = state.graph.nodes.find(
        (n) => n.id === state.selectedNodeId,
      )
      if (!currentNode) return state

      const newBoard = placePair(currentNode.board, action.pairState)
      if (!newBoard) return state

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
          return { graph: updatedGraph, selectedNodeId: mergeTarget.id }
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
        return { graph: updatedGraph, selectedNodeId: newNode.id }
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

        // 異なる親からの合流: エッジのみ追加
        const graphWithEdge = addEdge(
          state.graph,
          state.selectedNodeId,
          mergeableNode.id,
          action.pairState.pair,
          action.next,
          action.nextNext,
        )
        return { graph: graphWithEdge, selectedNodeId: mergeableNode.id }
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
        action.next,
        action.nextNext,
      )

      return { graph: graphWithEdge, selectedNodeId: newNode.id }
    }

    case 'updateMemo':
      return {
        ...state,
        graph: updateNodeMemo(state.graph, action.nodeId, action.memo),
      }
  }
}

function createInitialState(): GraphState {
  const graph = createInitialGraph()
  return { graph, selectedNodeId: graph.nodes[0].id }
}

interface UseGraphReturn {
  graph: Graph
  selectedNode: GraphNode | undefined
  selectedNodeId: NodeId
  selectNode: (nodeId: NodeId) => void
  placeAndAddNode: (
    pairState: PairState,
    next?: PuyoPair,
    nextNext?: PuyoPair,
  ) => boolean
  updateMemo: (nodeId: NodeId, memo: string) => void
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
      if (placePair(currentNode.board, pairState) === null) return false

      dispatch({ type: 'placeAndAddNode', pairState, next, nextNext })
      return true
    },
    [state],
  )

  const updateMemo = useCallback((nodeId: NodeId, memo: string) => {
    dispatch({ type: 'updateMemo', nodeId, memo })
  }, [])

  return {
    graph: state.graph,
    selectedNode,
    selectedNodeId: state.selectedNodeId,
    selectNode,
    placeAndAddNode,
    updateMemo,
  }
}
