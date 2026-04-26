import { useReducer, useCallback } from 'react'
import type { Graph, GraphNode, NodeId } from '../domain/graph'
import { createInitialGraph, addNode, addEdge } from '../domain/graph'
import { placePair } from '../domain/pair'
import type { PairState } from '../domain/pair'

interface GraphState {
  graph: Graph
  selectedNodeId: NodeId
}

type GraphAction =
  | { type: 'selectNode'; nodeId: NodeId }
  | { type: 'placeAndAddNode'; pairState: PairState }

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

      const [graphWithNode, newNode] = addNode(state.graph, newBoard)
      const graphWithEdge = addEdge(
        graphWithNode,
        state.selectedNodeId,
        newNode.id,
        action.pairState.pair,
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
  placeAndAddNode: (pairState: PairState) => boolean
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
    (pairState: PairState): boolean => {
      // canPlace を先に判定してから dispatch する。
      // useReducer の dispatch は同期的に reducer を実行するが、
      // state の反映は次のレンダーまで遅延するため、
      // dispatch 後に state を見ても古い値が返る。
      // ただし reducer 内で状態が変わらなかった場合は
      // ここでの事前チェックと一致するので問題ない。
      const currentNode = state.graph.nodes.find(
        (n) => n.id === state.selectedNodeId,
      )
      if (!currentNode) return false
      if (placePair(currentNode.board, pairState) === null) return false

      dispatch({ type: 'placeAndAddNode', pairState })
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
