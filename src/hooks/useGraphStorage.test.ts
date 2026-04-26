import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportGraphToFile, importGraphFromFile } from './useGraphStorage'
import { createInitialGraph, addNode, addEdge } from '../domain/graph'
import type { NodeId } from '../domain/graph'
import { PuyoColor } from '../domain/color'
import { Rotation } from '../domain/pair'
import { placePair } from '../domain/pair'

function buildTestGraph() {
  let graph = createInitialGraph()
  const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
  const board = placePair(graph.nodes[0].board, {
    pair,
    col: 0,
    rotation: Rotation.Up,
  })!
  const [g2, node] = addNode(graph, board)
  graph = addEdge(g2, 'node-0' as NodeId, node.id, pair, 0, Rotation.Up)
  return graph
}

describe('exportGraphToFile', () => {
  it('triggers a file download with JSON content', () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    const clickSpy = vi.fn()
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    // <a> 要素の click をモック
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag)
      if (tag === 'a') {
        el.click = clickSpy
      }
      return el
    })

    const graph = buildTestGraph()
    exportGraphToFile(graph)

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})

describe('importGraphFromFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects with error for invalid JSON file', async () => {
    const mockFile = new File(['not valid json'], 'bad.json', {
      type: 'application/json',
    })

    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string): HTMLElement => {
        if (tag === 'input') {
          return {
            type: '',
            accept: '',
            files: [mockFile],
            click: vi.fn(),
            addEventListener: vi.fn((event: string, handler: () => void) => {
              if (event === 'change') {
                setTimeout(handler, 0)
              }
            }),
          } as unknown as HTMLElement
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
      },
    )

    await expect(importGraphFromFile()).rejects.toThrow()

    vi.restoreAllMocks()
  })
})
