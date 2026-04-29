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
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGraph } from './useGraph'
import { PuyoColor } from '../domain/color'
import { Rotation } from '../domain/pair'
import type { PairState, PuyoPair } from '../domain/pair'
import type { NodeId } from '../domain/graph'
import { findParentNodeId } from '../domain/graph'
import { DEAD_COL } from '../domain/board'
import { DEFAULT_DIFFICULTY } from '../domain/difficulty'

const RED_RED = { axis: PuyoColor.Red, child: PuyoColor.Red } as const
const RED_BLUE = { axis: PuyoColor.Red, child: PuyoColor.Blue } as const

function makePairState(
  pair: PuyoPair,
  col = 2,
  rotation: Rotation = Rotation.Up,
): PairState {
  return { pair, col, rotation }
}

async function renderUseGraph() {
  const hook = renderHook(() => useGraph())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useGraph', () => {
  it('starts with a single root node selected', async () => {
    const { result } = await renderUseGraph()

    expect(result.current.graph.nodes).toHaveLength(1)
    expect(result.current.graph.edges).toHaveLength(0)
    expect(result.current.selectedNodeId).toBe('node-0')
    expect(result.current.selectedNode).toBeDefined()
  })

  it('places a pair and adds a new node + edge', async () => {
    const { result } = await renderUseGraph()

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

  it('selectNode changes the selected node', async () => {
    const { result } = await renderUseGraph()

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

  it('can branch from a non-leaf node', async () => {
    const { result } = await renderUseGraph()

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

  it('consecutive placements without re-render do not lose updates', async () => {
    const { result } = await renderUseGraph()

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

  it('replaces edge target when edge matches (same pair/next/nextNext)', async () => {
    const { result } = await renderUseGraph()
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

  it('removes descendants when edge is replaced', async () => {
    const { result } = await renderUseGraph()

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

  it('overwrites chainNotation when edge is replaced', async () => {
    const { result } = await renderUseGraph()

    // node-0 → node-1: RED_RED at col 0 (2 reds, no chain)
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 0, Rotation.Up))
    })

    // node-1 → (back to node-0 via merge): RED_RED at col 0 (4 reds in col 0 → 1-chain, all clear)
    // 全消しになるので node-0 に自動統合される
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 0, Rotation.Up))
    })

    // 辺 node-1→node-0 に連鎖情報が記録されているか確認
    const edgeWithChain = result.current.graph.edges.find(
      (e) => e.from === ('node-1' as NodeId),
    )
    expect(edgeWithChain?.chainNotation).toBeDefined()

    // node-1 に戻る
    act(() => {
      result.current.selectNode('node-1' as NodeId)
    })

    // 同じ組ぷよを隣接しない列 (col 2) に配置 → 辺の付け替えが発生（連鎖なし）
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 2, Rotation.Up))
    })

    // 付け替え後の辺の連鎖情報は空になる
    const replacedEdge = result.current.graph.edges.find(
      (e) => e.from === ('node-1' as NodeId),
    )
    expect(replacedEdge?.chainNotation).toBeUndefined()
  })

  it('creates new node when edge differs in next', async () => {
    const { result } = await renderUseGraph()
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

  it('select + place in same batch uses the correct node', async () => {
    const { result } = await renderUseGraph()

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

  it('auto-merges nodes with same board and same constraint', async () => {
    const { result } = await renderUseGraph()

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

  it('findParentNodeId returns the most recently traversed parent for a merge node', async () => {
    const { result } = await renderUseGraph()

    // Path 1: root → RED_BLUE at col 0 → RED_RED at col 1 (node-2)
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 1, Rotation.Up))
    })

    // Go back to root
    act(() => {
      result.current.selectNode('node-0' as NodeId)
    })

    // Path 2: root → RED_RED at col 1 → RED_BLUE at col 0 → merged into node-2
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_RED, 1, Rotation.Up))
    })
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })

    // Merged node is node-2; most recently used parent should be node-3 (from path 2)
    expect(result.current.selectedNodeId).toBe('node-2')
    const parentId = findParentNodeId(result.current.graph, 'node-2' as NodeId)
    expect(parentId).toBe('node-3')
  })

  it('does not merge nodes with same board but different constraints', async () => {
    const { result } = await renderUseGraph()
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

  it('skips duplicate edge from same parent to same merged node (axis/child swapped)', async () => {
    const { result } = await renderUseGraph()

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

  it('preserves memo on existing node when auto-merged', async () => {
    const { result } = await renderUseGraph()

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

  it('updates memo on a node', async () => {
    const { result } = await renderUseGraph()

    act(() => {
      result.current.updateMemo('node-0' as NodeId, 'テストメモ')
    })

    expect(result.current.selectedNode?.memo).toBe('テストメモ')
  })

  it('clears memo when set to empty string', async () => {
    const { result } = await renderUseGraph()

    act(() => {
      result.current.updateMemo('node-0' as NodeId, 'メモ')
    })
    expect(result.current.selectedNode?.memo).toBe('メモ')

    act(() => {
      result.current.updateMemo('node-0' as NodeId, '')
    })
    expect(result.current.selectedNode?.memo).toBeUndefined()
  })

  it('importGraph replaces the graph and selects root node', async () => {
    const { result } = await renderUseGraph()

    // 既存グラフに操作を加える
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    expect(result.current.graph.nodes).toHaveLength(2)

    // インポート用のグラフを作成（別のグラフ状態）
    const importedGraph = { ...result.current.graph }

    // リセットしてからインポート
    act(() => {
      result.current.resetGraph(DEFAULT_DIFFICULTY)
    })
    expect(result.current.graph.nodes).toHaveLength(1)

    // グラフをインポート
    act(() => {
      result.current.importGraph(importedGraph, DEFAULT_DIFFICULTY)
    })

    expect(result.current.graph.nodes).toHaveLength(2)
    expect(result.current.graph.edges).toHaveLength(1)
    expect(result.current.selectedNodeId).toBe(importedGraph.nodes[0].id)
  })

  it('deleteNode removes a node and selects parent', async () => {
    const { result } = await renderUseGraph()

    // Place a node
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 0, Rotation.Up))
    })
    expect(result.current.selectedNodeId).toBe('node-1')
    expect(result.current.graph.nodes).toHaveLength(2)

    // Delete it
    act(() => {
      result.current.deleteNode('node-1' as NodeId)
    })
    expect(result.current.graph.nodes).toHaveLength(1)
    expect(result.current.selectedNodeId).toBe('node-0')
  })

  it('deleteNode does nothing for root node', async () => {
    const { result } = await renderUseGraph()

    act(() => {
      result.current.deleteNode('node-0' as NodeId)
    })
    expect(result.current.graph.nodes).toHaveLength(1)
    expect(result.current.selectedNodeId).toBe('node-0')
  })

  it('rejects placement on a dead (suffocated) board', async () => {
    const { result } = await renderUseGraph()

    // 3列目を12段目まで積み上げて窒息状態にする
    // 同色4連鎖を避けるため、2色を交互に配置
    const pairs: PuyoPair[] = [
      { axis: PuyoColor.Red, child: PuyoColor.Red },
      { axis: PuyoColor.Blue, child: PuyoColor.Blue },
      { axis: PuyoColor.Red, child: PuyoColor.Red },
      { axis: PuyoColor.Blue, child: PuyoColor.Blue },
      { axis: PuyoColor.Red, child: PuyoColor.Red },
      { axis: PuyoColor.Blue, child: PuyoColor.Blue },
    ]

    for (const pair of pairs) {
      let success: boolean
      act(() => {
        success = result.current.placeAndAddNode(
          makePairState(pair, DEAD_COL, Rotation.Up),
        )
      })
      expect(success!).toBe(true)
    }

    // 現在のノードの盤面は3列目が12段全部埋まっている → 窒息
    // 他の列に置こうとしても拒否される
    let success: boolean
    act(() => {
      success = result.current.placeAndAddNode(
        makePairState(RED_RED, 0, Rotation.Up),
      )
    })
    expect(success!).toBe(false)
  })
})
