import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGraph } from './useGraph'
import { PuyoColor } from '../domain/color'
import { Rotation } from '../domain/pair'
import type { PairState } from '../domain/pair'
import type { NodeId } from '../domain/graph'

const RED_RED = { axis: PuyoColor.Red, child: PuyoColor.Red } as const
const RED_BLUE = { axis: PuyoColor.Red, child: PuyoColor.Blue } as const

function makePairState(
  pair: typeof RED_RED | typeof RED_BLUE,
  col = 2,
  rotation = Rotation.Up,
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

    // Place second child from root (different column)
    act(() => {
      result.current.placeAndAddNode(makePairState(RED_BLUE, 4, Rotation.Up))
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
})
