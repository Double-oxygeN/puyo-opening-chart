import { describe, it, expect } from 'vitest'
import {
  createInitialGraph,
  addNode,
  addEdge,
  getChildEdges,
  getChildNodes,
  getRootNode,
  findMatchingEdge,
  updateNodeBoard,
  getParentEdge,
} from './graph'
import type { NodeId } from './graph'
import { createEmptyBoard, setCell } from './board'
import { PuyoColor } from './color'

describe('createInitialGraph', () => {
  it('creates a graph with one empty board node', () => {
    const graph = createInitialGraph()
    expect(graph.nodes).toHaveLength(1)
    expect(graph.edges).toHaveLength(0)
    expect(graph.nodes[0].id).toBe('node-0')
  })
})

describe('addNode', () => {
  it('adds a node and returns it', () => {
    const graph = createInitialGraph()
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Red)

    const [newGraph, node] = addNode(graph, board)
    expect(newGraph.nodes).toHaveLength(2)
    expect(node.id).toBe('node-1')
    expect(node.board[0][0]).toBe(PuyoColor.Red)
  })
})

describe('addEdge', () => {
  it('adds an edge between nodes', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair)

    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].from).toBe('node-0')
    expect(graph.edges[0].to).toBe(node.id)
    expect(graph.edges[0].pair).toEqual(pair)
  })
})

describe('getChildEdges / getChildNodes', () => {
  it('returns children of a node', () => {
    let graph = createInitialGraph()
    const board1 = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const board2 = setCell(createEmptyBoard(), 0, 1, PuyoColor.Green)

    const [g1, node1] = addNode(graph, board1)
    const [g2, node2] = addNode(g1, board2)
    graph = g2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, node1.id, pair)
    graph = addEdge(graph, 'node-0' as NodeId, node2.id, pair)

    expect(getChildEdges(graph, 'node-0' as NodeId)).toHaveLength(2)
    expect(getChildNodes(graph, 'node-0' as NodeId)).toHaveLength(2)
    expect(getChildEdges(graph, node1.id)).toHaveLength(0)
  })
})

describe('getRootNode', () => {
  it('returns the first node', () => {
    const graph = createInitialGraph()
    expect(getRootNode(graph)?.id).toBe('node-0')
  })
})

describe('addEdge with next/nextNext', () => {
  it('adds an edge with next and nextNext pairs', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    const next = { axis: PuyoColor.Green, child: PuyoColor.Yellow }
    const nextNext = { axis: PuyoColor.Blue, child: PuyoColor.Red }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair, next, nextNext)

    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].pair).toEqual(pair)
    expect(graph.edges[0].next).toEqual(next)
    expect(graph.edges[0].nextNext).toEqual(nextNext)
  })

  it('omits next/nextNext when not provided', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair)

    expect(graph.edges[0].next).toBeUndefined()
    expect(graph.edges[0].nextNext).toBeUndefined()
  })
})

describe('findMatchingEdge', () => {
  it('finds an edge with matching pair/next/nextNext', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    const next = { axis: PuyoColor.Green, child: PuyoColor.Yellow }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair, next)

    const found = findMatchingEdge(graph, 'node-0' as NodeId, pair, next)
    expect(found).toBeDefined()
    expect(found?.to).toBe(node.id)
  })

  it('returns undefined when next differs', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    const next = { axis: PuyoColor.Green, child: PuyoColor.Yellow }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair, next)

    const differentNext = { axis: PuyoColor.Blue, child: PuyoColor.Red }
    const found = findMatchingEdge(
      graph,
      'node-0' as NodeId,
      pair,
      differentNext,
    )
    expect(found).toBeUndefined()
  })

  it('distinguishes between no next and a next', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair)

    const next = { axis: PuyoColor.Green, child: PuyoColor.Yellow }
    expect(
      findMatchingEdge(graph, 'node-0' as NodeId, pair, next),
    ).toBeUndefined()
    expect(findMatchingEdge(graph, 'node-0' as NodeId, pair)).toBeDefined()
  })
})

describe('updateNodeBoard', () => {
  it('updates the board of a specific node', () => {
    let graph = createInitialGraph()
    const board1 = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board1)
    graph = graph2

    const board2 = setCell(createEmptyBoard(), 0, 0, PuyoColor.Green)
    graph = updateNodeBoard(graph, node.id, board2)

    const updated = graph.nodes.find((n) => n.id === node.id)
    expect(updated?.board[0][0]).toBe(PuyoColor.Green)
  })
})

describe('getParentEdge', () => {
  it('returns the edge pointing to a node', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair)

    const parent = getParentEdge(graph, node.id)
    expect(parent?.from).toBe('node-0')
  })

  it('returns undefined for root node', () => {
    const graph = createInitialGraph()
    expect(getParentEdge(graph, 'node-0' as NodeId)).toBeUndefined()
  })
})
