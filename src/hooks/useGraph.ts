import { useReducer, useCallback } from 'react'
import type { Graph, GraphNode, NodeId } from '../domain/graph'
import {
  createInitialGraph,
  addNode,
  addEdge,
  findMatchingEdge,
  updateNodeBoard,
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
        // 既存ノードの盤面を上書き
        const updatedGraph = updateNodeBoard(
          state.graph,
          existingEdge.to,
          newBoard,
        )
        return { graph: updatedGraph, selectedNodeId: existingEdge.to }
      }

      const [graphWithNode, newNode] = addNode(state.graph, newBoard)
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

  return {
    graph: state.graph,
    selectedNode,
    selectedNodeId: state.selectedNodeId,
    selectNode,
    placeAndAddNode,
  }
}
