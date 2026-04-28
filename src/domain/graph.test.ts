// Copyright 2026 Yuya Shiratori
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, it, expect } from 'vitest'
import {
  createInitialGraph,
  addNode,
  addEdge,
  findMatchingEdge,
  replaceEdgeTarget,
  pruneUnreachable,
  removeNode,
  findParentNodeId,
  constraintsEqual,
  findMergeableNode,
  findDuplicateEdge,
  updateNodeMemo,
  serializeGraph,
  deserializeGraph,
  validateGraph,
} from './graph'
import type { NodeId } from './graph'
import { createEmptyBoard, setCell, DEAD_COL, DEAD_ROW } from './board'
import { PuyoColor } from './color'
import { Rotation } from './pair'
import { placePair } from './pair'

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
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair, 2, Rotation.Up)

    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].from).toBe('node-0')
    expect(graph.edges[0].to).toBe(node.id)
    expect(graph.edges[0].pair).toEqual(pair)
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
    graph = addEdge(
      graph,
      'node-0' as NodeId,
      node.id,
      pair,
      2,
      Rotation.Up,
      next,
      nextNext,
    )

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
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair, 2, Rotation.Up)

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
    graph = addEdge(
      graph,
      'node-0' as NodeId,
      node.id,
      pair,
      2,
      Rotation.Up,
      next,
    )

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
    graph = addEdge(
      graph,
      'node-0' as NodeId,
      node.id,
      pair,
      2,
      Rotation.Up,
      next,
    )

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
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair, 2, Rotation.Up)

    const next = { axis: PuyoColor.Green, child: PuyoColor.Yellow }
    expect(
      findMatchingEdge(graph, 'node-0' as NodeId, pair, next),
    ).toBeUndefined()
    expect(findMatchingEdge(graph, 'node-0' as NodeId, pair)).toBeDefined()
  })
})

describe('replaceEdgeTarget', () => {
  it('redirects an edge to a new target node', () => {
    let graph = createInitialGraph()
    const boardA = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const boardB = setCell(createEmptyBoard(), 0, 1, PuyoColor.Green)

    const [g1, nodeA] = addNode(graph, boardA)
    const [g2, nodeB] = addNode(g1, boardB)
    graph = g2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, nodeA.id, pair, 2, Rotation.Up)

    const edgeId = graph.edges[0].id
    graph = replaceEdgeTarget(graph, edgeId, nodeB.id)

    expect(graph.edges[0].to).toBe(nodeB.id)
    // nodeA is now unreachable → pruned
    expect(graph.nodes.find((n) => n.id === nodeA.id)).toBeUndefined()
    expect(graph.nodes).toHaveLength(2) // root + B
  })

  it('prunes unreachable descendants when edge is redirected', () => {
    // root → A → B, redirect root→A to root→C
    let graph = createInitialGraph()
    const boardA = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const boardB = setCell(createEmptyBoard(), 0, 1, PuyoColor.Green)
    const boardC = setCell(createEmptyBoard(), 0, 2, PuyoColor.Blue)

    const [g1, nodeA] = addNode(graph, boardA)
    const [g2, nodeB] = addNode(g1, boardB)
    const [g3, nodeC] = addNode(g2, boardC)
    graph = g3

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, nodeA.id, pair, 2, Rotation.Up)
    graph = addEdge(graph, nodeA.id, nodeB.id, pair, 2, Rotation.Up)

    const edgeId = graph.edges[0].id
    graph = replaceEdgeTarget(graph, edgeId, nodeC.id)

    // A and B are unreachable → pruned
    expect(graph.nodes).toHaveLength(2) // root + C
    expect(graph.edges).toHaveLength(1) // root→C
    expect(graph.nodes.find((n) => n.id === nodeA.id)).toBeUndefined()
    expect(graph.nodes.find((n) => n.id === nodeB.id)).toBeUndefined()
  })

  it('preserves nodes reachable via other paths', () => {
    // root → A → C, root → B → C (DAG), redirect root→A to root→D
    let graph = createInitialGraph()
    const boardA = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const boardB = setCell(createEmptyBoard(), 0, 1, PuyoColor.Green)
    const boardC = setCell(createEmptyBoard(), 0, 2, PuyoColor.Blue)
    const boardD = setCell(createEmptyBoard(), 0, 3, PuyoColor.Yellow)

    const [g1, nodeA] = addNode(graph, boardA)
    const [g2, nodeB] = addNode(g1, boardB)
    const [g3, nodeC] = addNode(g2, boardC)
    const [g4, nodeD] = addNode(g3, boardD)
    graph = g4

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, nodeA.id, pair, 2, Rotation.Up)
    graph = addEdge(graph, 'node-0' as NodeId, nodeB.id, pair, 2, Rotation.Up)
    graph = addEdge(graph, nodeA.id, nodeC.id, pair, 2, Rotation.Up)
    graph = addEdge(graph, nodeB.id, nodeC.id, pair, 2, Rotation.Up)

    // Redirect root→A to root→D; A becomes unreachable but C remains via B
    const rootToAEdge = graph.edges.find(
      (e) => e.from === ('node-0' as NodeId) && e.to === nodeA.id,
    )!
    graph = replaceEdgeTarget(graph, rootToAEdge.id, nodeD.id)

    expect(graph.nodes).toHaveLength(4) // root + B + C + D (A pruned)
    expect(graph.nodes.find((n) => n.id === nodeA.id)).toBeUndefined()
    expect(graph.nodes.find((n) => n.id === nodeC.id)).toBeDefined()
  })
})

describe('pruneUnreachable', () => {
  it('removes orphaned nodes', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1] = addNode(graph, board) // node-1 with no edges
    graph = g1

    expect(graph.nodes).toHaveLength(2)
    graph = pruneUnreachable(graph)
    expect(graph.nodes).toHaveLength(1) // only root
  })

  it('returns same graph when nothing to prune', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1, node] = addNode(graph, board)
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node.id,
      {
        axis: PuyoColor.Red,
        child: PuyoColor.Blue,
      },
      2,
      Rotation.Up,
    )

    const pruned = pruneUnreachable(graph)
    expect(pruned).toBe(graph) // referential equality (no-op)
  })
})

describe('removeNode', () => {
  it('does nothing when removing root node', () => {
    const graph = createInitialGraph()
    const result = removeNode(graph, 'node-0' as NodeId)
    expect(result).toBe(graph)
  })

  it('removes a leaf node and its edge', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1, node] = addNode(graph, board)
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node.id,
      { axis: PuyoColor.Red, child: PuyoColor.Blue },
      2,
      Rotation.Up,
    )

    const result = removeNode(graph, node.id)
    expect(result.nodes).toHaveLength(1)
    expect(result.edges).toHaveLength(0)
  })

  it('removes a middle node and prunes unreachable descendants', () => {
    let graph = createInitialGraph()
    const board1 = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const board2 = setCell(createEmptyBoard(), 0, 1, PuyoColor.Blue)
    const [g1, node1] = addNode(graph, board1)
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node1.id,
      { axis: PuyoColor.Red, child: PuyoColor.Blue },
      2,
      Rotation.Up,
    )
    const [g2, node2] = addNode(graph, board2)
    graph = addEdge(
      g2,
      node1.id,
      node2.id,
      { axis: PuyoColor.Blue, child: PuyoColor.Red },
      3,
      Rotation.Up,
    )

    // root -> node1 -> node2; removing node1 should also prune node2
    const result = removeNode(graph, node1.id)
    expect(result.nodes).toHaveLength(1)
    expect(result.edges).toHaveLength(0)
  })

  it('keeps child node if reachable from another parent', () => {
    let graph = createInitialGraph()
    const board1 = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const board2 = setCell(createEmptyBoard(), 0, 1, PuyoColor.Blue)
    const boardShared = setCell(createEmptyBoard(), 0, 2, PuyoColor.Green)
    const [g1, node1] = addNode(graph, board1)
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node1.id,
      { axis: PuyoColor.Red, child: PuyoColor.Blue },
      2,
      Rotation.Up,
    )
    const [g2, node2] = addNode(graph, board2)
    graph = addEdge(
      g2,
      'node-0' as NodeId,
      node2.id,
      { axis: PuyoColor.Blue, child: PuyoColor.Red },
      3,
      Rotation.Up,
    )
    const [g3, sharedNode] = addNode(graph, boardShared)
    graph = addEdge(
      g3,
      node1.id,
      sharedNode.id,
      { axis: PuyoColor.Green, child: PuyoColor.Red },
      0,
      Rotation.Up,
    )
    graph = addEdge(
      graph,
      node2.id,
      sharedNode.id,
      { axis: PuyoColor.Green, child: PuyoColor.Blue },
      1,
      Rotation.Up,
    )

    // root -> node1 -> sharedNode, root -> node2 -> sharedNode
    // removing node1 should keep sharedNode (reachable via node2)
    const result = removeNode(graph, node1.id)
    expect(result.nodes).toHaveLength(3) // root, node2, sharedNode
    expect(result.nodes.map((n) => n.id)).toContain(sharedNode.id)
  })

  it('does nothing for non-existent node', () => {
    const graph = createInitialGraph()
    const result = removeNode(graph, 'node-999' as NodeId)
    expect(result).toBe(graph)
  })
})

describe('findParentNodeId', () => {
  it('returns undefined for root node', () => {
    const graph = createInitialGraph()
    expect(findParentNodeId(graph, 'node-0' as NodeId)).toBeUndefined()
  })

  it('returns parent node id', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1, node] = addNode(graph, board)
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node.id,
      { axis: PuyoColor.Red, child: PuyoColor.Blue },
      2,
      Rotation.Up,
    )
    expect(findParentNodeId(graph, node.id)).toBe('node-0')
  })
})

describe('constraintsEqual', () => {
  it('returns true for both undefined', () => {
    expect(constraintsEqual(undefined, undefined)).toBe(true)
  })

  it('returns false when one is undefined', () => {
    const c = { currentPair: { axis: PuyoColor.Red, child: PuyoColor.Blue } }
    expect(constraintsEqual(c, undefined)).toBe(false)
    expect(constraintsEqual(undefined, c)).toBe(false)
  })

  it('returns true for matching constraints', () => {
    const a = {
      currentPair: { axis: PuyoColor.Red, child: PuyoColor.Blue },
      nextPair: { axis: PuyoColor.Green, child: PuyoColor.Yellow },
    }
    const b = {
      currentPair: { axis: PuyoColor.Red, child: PuyoColor.Blue },
      nextPair: { axis: PuyoColor.Green, child: PuyoColor.Yellow },
    }
    expect(constraintsEqual(a, b)).toBe(true)
  })

  it('returns false when currentPair differs', () => {
    const a = { currentPair: { axis: PuyoColor.Red, child: PuyoColor.Blue } }
    const b = { currentPair: { axis: PuyoColor.Green, child: PuyoColor.Blue } }
    expect(constraintsEqual(a, b)).toBe(false)
  })

  it('returns false when nextPair differs', () => {
    const a = {
      currentPair: { axis: PuyoColor.Red, child: PuyoColor.Blue },
      nextPair: { axis: PuyoColor.Green, child: PuyoColor.Yellow },
    }
    const b = {
      currentPair: { axis: PuyoColor.Red, child: PuyoColor.Blue },
      nextPair: { axis: PuyoColor.Blue, child: PuyoColor.Yellow },
    }
    expect(constraintsEqual(a, b)).toBe(false)
  })
})

describe('findMergeableNode', () => {
  it('finds a node with the same board and constraint', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const constraint = {
      currentPair: { axis: PuyoColor.Green, child: PuyoColor.Blue },
    }
    const [graph2, node] = addNode(graph, board, constraint)
    graph = graph2

    const found = findMergeableNode(graph, board, constraint)
    expect(found?.id).toBe(node.id)
  })

  it('returns undefined when board differs', () => {
    let graph = createInitialGraph()
    const board1 = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const board2 = setCell(createEmptyBoard(), 0, 1, PuyoColor.Red)
    const [graph2] = addNode(graph, board1)
    graph = graph2

    expect(findMergeableNode(graph, board2)).toBeUndefined()
  })

  it('returns undefined when constraint differs', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const c1 = {
      currentPair: { axis: PuyoColor.Green, child: PuyoColor.Blue },
    }
    const c2 = {
      currentPair: { axis: PuyoColor.Red, child: PuyoColor.Blue },
    }
    const [graph2] = addNode(graph, board, c1)
    graph = graph2

    expect(findMergeableNode(graph, board, c2)).toBeUndefined()
  })

  it('matches nodes without constraints', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const found = findMergeableNode(graph, board)
    expect(found?.id).toBe(node.id)
  })
})

describe('findDuplicateEdge', () => {
  it('finds duplicate edge to the same target node', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, node.id, pair, 2, Rotation.Up)

    const found = findDuplicateEdge(graph, 'node-0' as NodeId, node.id)
    expect(found).toBeDefined()
  })

  it('returns undefined for different target', () => {
    let graph = createInitialGraph()
    const board1 = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const board2 = setCell(createEmptyBoard(), 0, 1, PuyoColor.Blue)
    const [g1, node1] = addNode(graph, board1)
    const [g2] = addNode(g1, board2)
    graph = g2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    graph = addEdge(graph, 'node-0' as NodeId, node1.id, pair, 2, Rotation.Up)

    const found = findDuplicateEdge(
      graph,
      'node-0' as NodeId,
      'node-2' as NodeId,
    )
    expect(found).toBeUndefined()
  })

  it('returns undefined when next differs', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [graph2, node] = addNode(graph, board)
    graph = graph2

    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    const next = { axis: PuyoColor.Green, child: PuyoColor.Yellow }
    graph = addEdge(
      graph,
      'node-0' as NodeId,
      node.id,
      pair,
      2,
      Rotation.Up,
      next,
    )

    // 異なる next で検索
    const differentNext = { axis: PuyoColor.Blue, child: PuyoColor.Red }
    const found = findDuplicateEdge(
      graph,
      'node-0' as NodeId,
      node.id,
      differentNext,
    )
    expect(found).toBeUndefined()
  })
})

describe('updateNodeMemo', () => {
  it('updates memo on an existing node', () => {
    const graph = createInitialGraph()
    const updated = updateNodeMemo(graph, 'node-0' as NodeId, 'テストメモ')
    expect(updated.nodes[0].memo).toBe('テストメモ')
  })

  it('returns the same graph when node does not exist', () => {
    const graph = createInitialGraph()
    const updated = updateNodeMemo(
      graph,
      'non-existent' as NodeId,
      'テストメモ',
    )
    expect(updated).toBe(graph)
  })

  it('clears memo when given an empty string', () => {
    let graph = createInitialGraph()
    graph = updateNodeMemo(graph, 'node-0' as NodeId, 'メモ')
    expect(graph.nodes[0].memo).toBe('メモ')

    graph = updateNodeMemo(graph, 'node-0' as NodeId, '')
    expect(graph.nodes[0].memo).toBeUndefined()
  })
})

describe('serializeGraph / deserializeGraph', () => {
  it('round-trips an initial graph', () => {
    const graph = createInitialGraph()
    const json = serializeGraph(graph)
    const restored = deserializeGraph(json)

    expect(restored).not.toBeNull()
    expect(restored!.nodes).toHaveLength(1)
    expect(restored!.edges).toHaveLength(0)
    expect(restored!.nodeIdSeq).toBe(graph.nodeIdSeq)
    expect(restored!.edgeIdSeq).toBe(graph.edgeIdSeq)
  })

  it('round-trips a graph with nodes, edges, and constraints', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const constraint = {
      currentPair: { axis: PuyoColor.Green, child: PuyoColor.Blue },
    }
    const [g1, node] = addNode(graph, board, constraint)
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    const next = { axis: PuyoColor.Green, child: PuyoColor.Yellow }
    graph = addEdge(g1, 'node-0' as NodeId, node.id, pair, 2, Rotation.Up, next)

    const json = serializeGraph(graph)
    const restored = deserializeGraph(json)

    expect(restored).not.toBeNull()
    expect(restored!.nodes).toHaveLength(2)
    expect(restored!.edges).toHaveLength(1)
    expect(restored!.nodes[1].constraint).toEqual(constraint)
    expect(restored!.edges[0].pair).toEqual(pair)
    expect(restored!.edges[0].next).toEqual(next)
  })

  it('round-trips a graph with memo', () => {
    let graph = createInitialGraph()
    graph = updateNodeMemo(graph, 'node-0' as NodeId, 'テストメモ')

    const json = serializeGraph(graph)
    const restored = deserializeGraph(json)

    expect(restored).not.toBeNull()
    expect(restored!.nodes[0].memo).toBe('テストメモ')
  })

  it('returns null for invalid JSON', () => {
    expect(deserializeGraph('not json')).toBeNull()
  })

  it('returns null for empty object', () => {
    expect(deserializeGraph('{}')).toBeNull()
  })

  it('returns null for missing nodes', () => {
    expect(
      deserializeGraph(
        JSON.stringify({ edges: [], nodeIdSeq: 0, edgeIdSeq: 0 }),
      ),
    ).toBeNull()
  })

  it('returns null for empty nodes array', () => {
    expect(
      deserializeGraph(
        JSON.stringify({ nodes: [], edges: [], nodeIdSeq: 0, edgeIdSeq: 0 }),
      ),
    ).toBeNull()
  })

  it('returns null for node without id', () => {
    expect(
      deserializeGraph(
        JSON.stringify({
          nodes: [{ board: [] }],
          edges: [],
          nodeIdSeq: 0,
          edgeIdSeq: 0,
        }),
      ),
    ).toBeNull()
  })

  it('returns null for edge without required fields', () => {
    expect(
      deserializeGraph(
        JSON.stringify({
          nodes: [{ id: 'node-0', board: [] }],
          edges: [{ id: 'edge-0' }],
          nodeIdSeq: 1,
          edgeIdSeq: 1,
        }),
      ),
    ).toBeNull()
  })

  it('returns null for edge without col/rotation', () => {
    expect(
      deserializeGraph(
        JSON.stringify({
          nodes: [{ id: 'node-0', board: [] }],
          edges: [
            {
              id: 'edge-0',
              from: 'node-0',
              to: 'node-1',
              pair: { axis: 1, child: 2 },
            },
          ],
          nodeIdSeq: 2,
          edgeIdSeq: 1,
        }),
      ),
    ).toBeNull()
  })
})

describe('validateGraph', () => {
  it('validates an initial graph (root only)', () => {
    const graph = createInitialGraph()
    expect(validateGraph(graph)).toBe(true)
  })

  it('validates a graph built with placePair operations', () => {
    let graph = createInitialGraph()

    // 赤赤を2列目に縦置き → 盤面の [0][2] と [1][2] に赤が配置される
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    const board = placePair(createEmptyBoard(), {
      pair,
      col: 2,
      rotation: Rotation.Up,
    })!.board
    const [g1, node] = addNode(graph, board)
    graph = addEdge(g1, 'node-0' as NodeId, node.id, pair, 2, Rotation.Up)

    expect(validateGraph(graph)).toBe(true)
  })

  it('rejects a graph where edge operation does not produce target board', () => {
    let graph = createInitialGraph()
    // 盤面は手動で作るが、エッジの操作（col=2, Up）で再生しても一致しない
    const wrongBoard = setCell(createEmptyBoard(), 0, 5, PuyoColor.Red)
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
    const [g1, node] = addNode(graph, wrongBoard)
    graph = addEdge(g1, 'node-0' as NodeId, node.id, pair, 2, Rotation.Up)

    expect(validateGraph(graph)).toBe(false)
  })

  it('rejects a graph with unreachable nodes', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1] = addNode(graph, board) // node-1 has no edge
    graph = g1

    expect(validateGraph(graph)).toBe(false)
  })

  it('rejects a graph with edge referencing missing node', () => {
    let graph = createInitialGraph()
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    // エッジの遷移先が存在しないノード
    graph = addEdge(
      graph,
      'node-0' as NodeId,
      'node-99' as NodeId,
      pair,
      2,
      Rotation.Up,
    )

    expect(validateGraph(graph)).toBe(false)
  })

  it('rejects a graph with an edge from a dead (suffocated) node', () => {
    // 窒息盤面を作成（3列目12段目が埋まっている）
    let deadBoard = createEmptyBoard()
    for (let row = 0; row <= DEAD_ROW; row++) {
      deadBoard = setCell(
        deadBoard,
        row,
        DEAD_COL,
        row % 2 === 0 ? PuyoColor.Red : PuyoColor.Green,
      )
    }

    // 窒息盤面からさらに先に遷移するエッジを持つグラフ
    let graph = createInitialGraph()
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    const [g1, deadNode] = addNode(graph, deadBoard)
    const nextBoard = setCell(deadBoard, 0, 0, PuyoColor.Blue)
    const [g2, nextNode] = addNode(g1, nextBoard)
    // ルート → 窒息ノード
    graph = addEdge(
      g2,
      'node-0' as NodeId,
      deadNode.id,
      pair,
      DEAD_COL,
      Rotation.Up,
    )
    // 窒息ノード → 次のノード（これは不正）
    graph = addEdge(graph, deadNode.id, nextNode.id, pair, 0, Rotation.Up)

    expect(validateGraph(graph)).toBe(false)
  })

  it('rejects a graph with incorrect chainNotation', () => {
    let graph = createInitialGraph()
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    const result = placePair(createEmptyBoard(), {
      pair,
      col: 2,
      rotation: Rotation.Up,
    })!
    const [g1, node] = addNode(graph, result.board)
    // 連鎖なしの配置に不正な chainNotation を付与
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node.id,
      pair,
      2,
      Rotation.Up,
      undefined,
      undefined,
      '2:240',
    )

    expect(validateGraph(graph)).toBe(false)
  })
})

describe('addEdge with chainNotation', () => {
  it('stores chainNotation on an edge', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1, node] = addNode(graph, board)
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node.id,
      pair,
      0,
      Rotation.Up,
      undefined,
      undefined,
      '2:240',
    )

    expect(graph.edges[0].chainNotation).toBe('2:240')
  })

  it('omits chainNotation when not provided', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1, node] = addNode(graph, board)
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    graph = addEdge(g1, 'node-0' as NodeId, node.id, pair, 0, Rotation.Up)

    expect(graph.edges[0].chainNotation).toBeUndefined()
  })

  it('preserves chainNotation through serialization', () => {
    let graph = createInitialGraph()
    const board = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const [g1, node] = addNode(graph, board)
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    graph = addEdge(
      g1,
      'node-0' as NodeId,
      node.id,
      pair,
      0,
      Rotation.Up,
      undefined,
      undefined,
      '3D:600',
    )

    const serialized = serializeGraph(graph)
    const deserialized = deserializeGraph(serialized)!
    expect(deserialized.edges[0].chainNotation).toBe('3D:600')
  })
})
