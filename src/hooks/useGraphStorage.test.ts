import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportSaveDataToFile,
  importSaveDataFromFile,
  loadSaveData,
  saveSaveData,
  clearGraph,
} from './useGraphStorage'
import { createInitialGraph, addNode, addEdge } from '../domain/graph'
import type { NodeId } from '../domain/graph'
import { PuyoColor } from '../domain/color'
import { Rotation } from '../domain/pair'
import { placePair } from '../domain/pair'
import { DEFAULT_DIFFICULTY } from '../domain/difficulty'

function buildTestGraph() {
  let graph = createInitialGraph()
  const pair = { axis: PuyoColor.Red, child: PuyoColor.Blue }
  const board = placePair(graph.nodes[0].board, {
    pair,
    col: 0,
    rotation: Rotation.Up,
  })!.board
  const [g2, node] = addNode(graph, board)
  graph = addEdge(g2, 'node-0' as NodeId, node.id, pair, 0, Rotation.Up)
  return graph
}

describe('saveSaveData / loadSaveData', () => {
  it('round-trips graph and difficulty through localStorage', () => {
    const graph = buildTestGraph()
    saveSaveData({ graph, difficulty: DEFAULT_DIFFICULTY })

    const loaded = loadSaveData()
    expect(loaded).not.toBeNull()
    expect(loaded!.difficulty).toBe(DEFAULT_DIFFICULTY)
    expect(loaded!.graph.nodes).toHaveLength(graph.nodes.length)
    expect(loaded!.graph.edges).toHaveLength(graph.edges.length)
    // ボード内容が一致する
    expect(loaded!.graph.nodes[1].board).toEqual(graph.nodes[1].board)
  })

  it('returns null when localStorage is empty', () => {
    expect(loadSaveData()).toBeNull()
  })

  it('returns null for invalid JSON in localStorage', () => {
    localStorage.setItem('puyo-opening-chart:graph', 'not json')
    expect(loadSaveData()).toBeNull()
  })

  it('returns null when difficulty field is missing', () => {
    const graph = buildTestGraph()
    saveSaveData({ graph, difficulty: DEFAULT_DIFFICULTY })

    // 難易度フィールドを削除
    const raw = JSON.parse(
      localStorage.getItem('puyo-opening-chart:graph')!,
    ) as Record<string, unknown>
    delete raw.difficulty
    localStorage.setItem('puyo-opening-chart:graph', JSON.stringify(raw))

    expect(loadSaveData()).toBeNull()
  })

  it('returns null when graph data is structurally invalid', () => {
    localStorage.setItem(
      'puyo-opening-chart:graph',
      JSON.stringify({ difficulty: 'medium', nodes: 'bad', edges: [] }),
    )
    expect(loadSaveData()).toBeNull()
  })
})

describe('clearGraph', () => {
  it('removes saved data from localStorage', () => {
    const graph = buildTestGraph()
    saveSaveData({ graph, difficulty: DEFAULT_DIFFICULTY })
    expect(localStorage.getItem('puyo-opening-chart:graph')).not.toBeNull()

    clearGraph()
    expect(localStorage.getItem('puyo-opening-chart:graph')).toBeNull()
  })
})

describe('exportSaveDataToFile', () => {
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
    exportSaveDataToFile({ graph, difficulty: DEFAULT_DIFFICULTY })

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})

describe('importSaveDataFromFile', () => {
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

    await expect(importSaveDataFromFile()).rejects.toThrow()

    vi.restoreAllMocks()
  })
})
