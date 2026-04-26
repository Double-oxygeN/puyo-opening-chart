import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGraph } from './useGraph'
import { PuyoColor } from '../domain/color'
import { Rotation } from '../domain/pair'
import type { PairState, PuyoPair } from '../domain/pair'
import type { NodeId } from '../domain/graph'

const RED_RED = { axis: PuyoColor.Red, child: PuyoColor.Red } as const
const RED_BLUE = { axis: PuyoColor.Red, child: PuyoColor.Blue } as const

function makePairState(
  pair: PuyoPair,
  col = 2,
  rotation: Rotation = Rotation.Up,
): PairState {
  return { pair, col, rotation }
}

describe('useGraph', () => {
  it('starts with a single root node selected', () => {
    const { result } = renderHook(() => useGraph())

    expect(result.current.graph.nodes).toHaveLength(1)
    expect(result.current.graph.edges).toHaveLength(0)
    expect(result.current.selectedNodeId).toBe('node-0')
    expect(result.current.selectedNode).toBeDefined()
  })

  it('places a pair and adds a new node + edge', () => {
    const { result } = renderHook(() => useGraph())

    let success: boolean
    act(() => {
      success = result.current.placeAndAddNode(
        makePairState(RED_BLUE, 0, Rotation.Up),
      )
    })

    expect(success!).toBe(true)
    expect(result.current.graph.nodes).toHaveLength(2)
    expect(result.current.graph.edges).toHaveLength(1)
    // Automatically selects the new node
    expect(result.current.selectedNodeId).toBe('node-1')
    expect(result.current.selectedNode?.id).toBe('node-1')
  })

  it('selectNode changes the selected node', () => {
    const { result } = renderHook(() => useGraph())

    // Place a node first
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    expect(result.current.selectedNodeId).toBe('node-1')

    // Go back to root
    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })
    expect(result.current.selectedNodeId).toBe('node-0')
  })

  it('can branch from a non-leaf node', () => {
    const { result } = renderHook(() => useGraph())

    // Place first child from root
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })

    // Go back to root
    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })

    // Place second child from root (different pair to create a branch)
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 4, Rotation.Up))
    })

    expect(result.current.graph.nodes).toHaveLength(3)
    expect(result.current.graph.edges).toHaveLength(2)
    // Both edges originate from root
    const rootEdges = result.current.graph.edges.filter(
      (e) => e.from === ('node-0' as NodeId),
    )
    expect(rootEdges).toHaveLength(2)
  })

  it('consecutive placements without re-render do not lose updates', () => {
    const { result } = renderHook(() => useGraph())

    // Simulate rapid consecutive placements in a single act()
    // This is the stale closure scenario: both calls should succeed
    // and produce 2 new nodes, not overwrite each other.
    act(() => {
      const s1 = result.current.placeAndAddNode(
        makePairState(RED_BLUE, 0, Rotation.Up),
      )
      const s2 = result.current.placeAndAddNode(
        makePairState(RED_RED, 3, Rotation.Up),
      )
      expect(s1).toBe(true)
      expect(s2).toBe(true)
    })

    // Should have root + 2 placed nodes
    expect(result.current.graph.nodes).toHaveLength(3)
    expect(result.current.graph.edges).toHaveLength(2)
    // The chain should be: node-0 → node-1 → node-2
    expect(result.current.selectedNodeId).toBe('node-2')
  })

  it('replaces edge target when edge matches (same pair/next/nextNext)', () => {
    const { result } = renderHook(() => useGraph())
    const next = { axis: PuyoColor.Green, child: PuyoColor.Green }

    // Place first time with next
    act(() => {
      result.current.placeAndAddNode(
        makePairState(RED_BLUE, 0, Rotation.Up),
        next,
      )
    })
    expect(result.current.graph.nodes).toHaveLength(2)
    expect(result.current.graph.edges).toHaveLength(1)
    expect(result.current.graph.edges[0].next).toEqual(next)

    // Go back to root
    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })

    // Place same pair+next again (different column → different board)
    act(() => {
      result.current.placeAndAddNode(
        makePairState(RED_BLUE, 3, Rotation.Up),
        next,
      )
    })

    // Edge replaced: old node pruned, new node created
    expect(result.current.graph.nodes).toHaveLength(2) // root + new node
    expect(result.current.graph.edges).toHaveLength(1)
    // New node has the updated board (RED_BLUE at col 3)
    const newNode = result.current.selectedNode!
    expect(newNode.board[0][3]).not.toBe(0) // col 3 has puyo
  })

  it('removes descendants when edge is replaced', () => {
    const { result } = renderHook(() => useGraph())

    // Build chain: root → node-1 → node-2
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 1, Rotation.Up))
    })
    expect(result.current.graph.nodes).toHaveLength(3)
    expect(result.current.graph.edges).toHaveLength(2)

    // Go back to root and replace edge (same pair, different column)
    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 3, Rotation.Up))
    })

    // Old node-1 and node-2 pruned, new node created
    expect(result.current.graph.nodes).toHaveLength(2) // root + new node
    expect(result.current.graph.edges).toHaveLength(1) // root→new node
  })

  it('creates new node when edge differs in next', () => {
    const { result } = renderHook(() => useGraph())
    const next1 = { axis: PuyoColor.Green, child: PuyoColor.Green }
    const next2 = { axis: PuyoColor.Blue, child: PuyoColor.Blue }

    act(() => {
      result.current.placeAndAddNode(
        makePairState(RED_BLUE, 0, Rotation.Up),
        next1,
      )
    })

    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })

    act(() => {
      result.current.placeAndAddNode(
        makePairState(RED_BLUE, 0, Rotation.Up),
        next2,
      )
    })

    // Different next → new node
    expect(result.current.graph.nodes).toHaveLength(3)
    expect(result.current.graph.edges).toHaveLength(2)
  })

  it('select + place in same batch uses the correct node', () => {
    const { result } = renderHook(() => useGraph())

    // Build a chain: root → node-1
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })

    // In one batch: select root, then place from root
    act(() => {
      result.current.selectNode('node-0' as NodeId)
      result.current.placeAndAddNode(makePairState(RED_RED, 4, Rotation.Up))
    })

    // Should have 3 nodes total, and the latest edge should be from root
    expect(result.current.graph.nodes).toHaveLength(3)
    const latestEdge = result.current.graph.edges.find(
      (e) => e.to === ('node-2' as NodeId),
    )
    expect(latestEdge?.from).toBe('node-0')
  })

  it('auto-merges nodes with same board and same constraint', () => {
    const { result } = renderHook(() => useGraph())

    // Path 1: root → place RED_BLUE at col 0
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    // node-1: board has Red at (0,0), Blue at (1,0)

    // Continue path 1: place RED_RED at col 1
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 1, Rotation.Up))
    })
    // node-2: board has Red at (0,0), Blue at (1,0), Red at (0,1), Red at (1,1)

    // Go back to root
    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })

    // Path 2: root → place RED_RED at col 1
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 1, Rotation.Up))
    })
    // node-3: board has Red at (0,1), Red at (1,1)

    // Continue path 2: place RED_BLUE at col 0 → same board as node-2
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })

    // Should have merged with node-2 (same board, no constraint)
    expect(result.current.selectedNodeId).toBe('node-2')
    // root + node-1 + node-2 + node-3 = 4 nodes (not 5)
    expect(result.current.graph.nodes).toHaveLength(4)
    // root→node-1, node-1→node-2, root→node-3, node-3→node-2 = 4 edges
    expect(result.current.graph.edges).toHaveLength(4)
  })

  it('does not merge nodes with same board but different constraints', () => {
    const { result } = renderHook(() => useGraph())
    const next1 = { axis: PuyoColor.Green, child: PuyoColor.Green }
    const next2 = { axis: PuyoColor.Blue, child: PuyoColor.Blue }

    // Path 1: place with next1
    act(() => {
      result.current.placeAndAddNode(
        makePairState(RED_BLUE, 0, Rotation.Up),
        next1,
      )
    })

    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })

    // Path 2: same placement but with next2 → different constraint
    act(() => {
      result.current.placeAndAddNode(
        makePairState(RED_BLUE, 0, Rotation.Up),
        next2,
      )
    })

    // Should NOT merge: different constraints → separate nodes
    expect(result.current.graph.nodes).toHaveLength(3)
    expect(result.current.graph.edges).toHaveLength(2)
  })

  it('skips duplicate edge from same parent to same merged node (axis/child swapped)', () => {
    const { result } = renderHook(() => useGraph())

    // Place RED_BLUE at col 0 horizontally (axis=Red@col0, child=Blue@col1)
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Right))
    })
    expect(result.current.graph.nodes).toHaveLength(2)

    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })

    // Place BLUE_RED at col 1 horizontally with child left
    // axis=Blue@col1, child=Red@col0 → same board as above
    const BLUE_RED = { axis: PuyoColor.Blue, child: PuyoColor.Red } as const
    act(() => {
      result.current.placeAndAddNode(makePairState(BLUE_RED, 1, Rotation.Left))
    })

    // Should reuse node-1 AND skip the duplicate edge
    expect(result.current.selectedNodeId).toBe('node-1')
    expect(result.current.graph.nodes).toHaveLength(2)
    expect(result.current.graph.edges).toHaveLength(1)
  })

  it('preserves memo on existing node when auto-merged', () => {
    const { result } = renderHook(() => useGraph())

    // Path 1: root → RED_BLUE at col 0 → RED_RED at col 1
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 1, Rotation.Up))
    })
    // node-2 にメモを付与
    act(() => {
      result.current.updateMemo('node-2' as NodeId, '重要なメモ')
    })

    // Path 2: root → RED_RED at col 1 → RED_BLUE at col 0 → node-2 に統合
    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 1, Rotation.Up))
    })
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })

    // 統合先の node-2 が選択され、メモが保持されている
    expect(result.current.selectedNodeId).toBe('node-2')
    const mergedNode = result.current.graph.nodes.find(
      (n) => n.id === ('node-2' as NodeId),
    )
    expect(mergedNode?.memo).toBe('重要なメモ')
  })

  it('updates memo on a node', () => {
    const { result } = renderHook(() => useGraph())

    act(() => {
      result.current.updateMemo('node-0' as NodeId, 'テストメモ')
    })

    expect(result.current.selectedNode?.memo).toBe('テストメモ')
  })

  it('clears memo when set to empty string', () => {
    const { result } = renderHook(() => useGraph())

    act(() => {
      result.current.updateMemo('node-0' as NodeId, 'メモ')
    })
    expect(result.current.selectedNode?.memo).toBe('メモ')

    act(() => {
      result.current.updateMemo('node-0' as NodeId, '')
    })
    expect(result.current.selectedNode?.memo).toBeUndefined()
  })

  it('importGraph replaces the graph and selects root node', () => {
    const { result } = renderHook(() => useGraph())

    // 既存グラフに操作を加える
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    expect(result.current.graph.nodes).toHaveLength(2)

    // インポート用のグラフを作成（別のグラフ状態）
    const importedGraph = { ...result.current.graph }

    // リセットしてからインポート
    act(() => {
      result.current.resetGraph()
    })
    expect(result.current.graph.nodes).toHaveLength(1)

    // グラフをインポート
    act(() => {
      result.current.importGraph(importedGraph)
    })

    expect(result.current.graph.nodes).toHaveLength(2)
    expect(result.current.graph.edges).toHaveLength(1)
    expect(result.current.selectedNodeId).toBe(importedGraph.nodes[0].id)
  })
})
