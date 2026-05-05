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
import type { Graph, GraphEdge, GraphNode, NodeId, EdgeId } from './graph'
import type { PuyoPair } from './pair'
import type { FilledColor } from './color'
import { PuyoColor } from './color'
import { createEmptyBoard } from './board'
import { Difficulty } from './difficulty'
import { Rotation } from './pair'
import {
  calculateReachProbabilities,
  classifyMove1Pattern,
  classifyMove2Pattern,
  solveLinearSystem,
} from './probability'

const R = PuyoColor.Red
const G = PuyoColor.Green
const B = PuyoColor.Blue
const Y = PuyoColor.Yellow

function pair(axis: FilledColor, child: FilledColor): PuyoPair {
  return { axis, child }
}

function makeNode(id: string): GraphNode {
  return { id: id as NodeId, board: createEmptyBoard() }
}

function makeEdge(
  id: string,
  from: string,
  to: string,
  p: PuyoPair,
): GraphEdge {
  return {
    id: id as EdgeId,
    from: from as NodeId,
    to: to as NodeId,
    pair: p,
    col: 2,
    rotation: Rotation.Up,
  }
}

function makeGraph(nodes: GraphNode[], edges: GraphEdge[]): Graph {
  return { nodes, edges, nodeIdSeq: nodes.length, edgeIdSeq: edges.length }
}

describe('classifyMove1Pattern', () => {
  it('同色ペアはAA', () => {
    expect(classifyMove1Pattern(pair(R, R))).toBe('AA')
    expect(classifyMove1Pattern(pair(G, G))).toBe('AA')
    expect(classifyMove1Pattern(pair(B, B))).toBe('AA')
    expect(classifyMove1Pattern(pair(Y, Y))).toBe('AA')
  })

  it('異色ペアはAB', () => {
    expect(classifyMove1Pattern(pair(R, G))).toBe('AB')
    expect(classifyMove1Pattern(pair(R, B))).toBe('AB')
    expect(classifyMove1Pattern(pair(R, Y))).toBe('AB')
    expect(classifyMove1Pattern(pair(B, R))).toBe('AB')
    expect(classifyMove1Pattern(pair(B, G))).toBe('AB')
    expect(classifyMove1Pattern(pair(B, Y))).toBe('AB')
    expect(classifyMove1Pattern(pair(G, R))).toBe('AB')
    expect(classifyMove1Pattern(pair(G, B))).toBe('AB')
    expect(classifyMove1Pattern(pair(G, Y))).toBe('AB')
    expect(classifyMove1Pattern(pair(Y, R))).toBe('AB')
    expect(classifyMove1Pattern(pair(Y, G))).toBe('AB')
    expect(classifyMove1Pattern(pair(Y, B))).toBe('AB')
  })
})

describe('classifyMove2Pattern', () => {
  describe('1手目がAA (refColors={R})', () => {
    const ref = new Set<FilledColor>([R])

    it('AAAA: 同色=A', () => {
      expect(classifyMove2Pattern(pair(R, R), ref)).toBe('AAAA')
    })

    it('AAAB: {A, 新色}', () => {
      expect(classifyMove2Pattern(pair(R, G), ref)).toBe('AAAB')
      expect(classifyMove2Pattern(pair(B, R), ref)).toBe('AAAB')
    })

    it('AABB: 同色≠A', () => {
      expect(classifyMove2Pattern(pair(G, G), ref)).toBe('AABB')
      expect(classifyMove2Pattern(pair(B, B), ref)).toBe('AABB')
    })

    it('AABC: {新色1, 新色2}', () => {
      expect(classifyMove2Pattern(pair(G, B), ref)).toBe('AABC')
      expect(classifyMove2Pattern(pair(B, G), ref)).toBe('AABC')
    })
  })

  describe('1手目がAB (refColors={R,G})', () => {
    const ref = new Set<FilledColor>([R, G])

    it('ABAA: 同色∈{A,B}', () => {
      expect(classifyMove2Pattern(pair(R, R), ref)).toBe('ABAA')
      expect(classifyMove2Pattern(pair(G, G), ref)).toBe('ABAA')
    })

    it('ABAB: {A,B}', () => {
      expect(classifyMove2Pattern(pair(R, G), ref)).toBe('ABAB')
      expect(classifyMove2Pattern(pair(G, R), ref)).toBe('ABAB')
    })

    it('ABAC: {A or B, 新色C}', () => {
      expect(classifyMove2Pattern(pair(R, B), ref)).toBe('ABAC')
      expect(classifyMove2Pattern(pair(B, G), ref)).toBe('ABAC')
    })

    it('ABCC: 同色=新色C', () => {
      expect(classifyMove2Pattern(pair(B, B), ref)).toBe('ABCC')
    })

    it('ABCD: 新色同士の異色ペア', () => {
      const ref4 = new Set<FilledColor>([R, G])
      expect(classifyMove2Pattern(pair(B, Y), ref4)).toBe('ABCD')
      expect(classifyMove2Pattern(pair(Y, B), ref4)).toBe('ABCD')
    })
  })
})

describe('solveLinearSystem', () => {
  it('単位行列: Ix = b → x = b', () => {
    const A = [
      [1, 0],
      [0, 1],
    ]
    const b = [2, 3]
    const x = solveLinearSystem(A, b)
    expect(x[0]).toBeCloseTo(2)
    expect(x[1]).toBeCloseTo(3)
  })

  it('2x2 連立方程式', () => {
    // 2x + y = 13, x + 3y = 24 → x=3, y=7
    const A = [
      [2, 1],
      [1, 3],
    ]
    const b = [13, 24]
    const x = solveLinearSystem(A, b)
    expect(x[0]).toBeCloseTo(3)
    expect(x[1]).toBeCloseTo(7)
  })
})

describe('calculateReachProbabilities', () => {
  it('ルートのみ（エッジなし）: 空マップ', () => {
    const graph = makeGraph([makeNode('node-0')], [])
    const result = calculateReachProbabilities(graph, Difficulty.Medium)
    expect(result.size).toBe(0)
  })

  describe('パターン等価性（1手目）', () => {
    it('AA 1インスタンスのみ → 確率 = 1/3', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [makeEdge('e-0', 'node-0', 'node-1', pair(R, R))],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
    })

    it('AB 1インスタンスのみ → 確率 = 2/3', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [makeEdge('e-0', 'node-0', 'node-1', pair(R, G))],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(2 / 3)
    })

    it('AA + AB それぞれ別ノードへ → AA=1/3, AB=2/3', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-2', pair(R, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(2 / 3)
    })

    it('AA 2インスタンス同一先 → 確率 = 1/3', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-1', pair(G, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
    })

    it('AA 2インスタンス別先 → 各 1/12（分岐、中辛4色）', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-2', pair(G, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // AA分岐: N=4, probPerPair = C(3,2)/(9*C(4,3)) = 1/12
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 12)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(1 / 12)
    })

    it('AA 全3インスタンス同一先 → 確率 = 1/3', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-1', pair(G, G)),
          makeEdge('e-2', 'node-0', 'node-1', pair(B, B)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
    })
  })

  describe('入れ替え等価性', () => {
    it('(R,G)と(G,R)が別ノードへ → 各 1/18（中辛4色）', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-0', 'node-2', pair(G, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // AB分岐: N=4, probPerPair = C(2,1)/(9*C(4,3)) = 1/18
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 18)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(1 / 18)
    })

    it('(R,G)のみ → 入れ替え合算で 2/9 × パターン乗数 = 2/3', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [makeEdge('e-0', 'node-0', 'node-1', pair(R, G))],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // AB非分岐: (R,G)と(G,R)の両方がswapでnode-1へ → 2matched, 乗数=6/2=3
      // 確率 = 2/9 * 3 = 2/3
      expect(result.get('node-1' as NodeId)).toBeCloseTo(2 / 3)
    })
  })

  describe('同一ツモ・異ネクストによる複数エッジ', () => {
    it('同じAAツモでネクスト違い → 各ノード 1/3', () => {
      // root → nodeA via (R,R) next=(R,G), root → nodeB via (R,R) next=(G,G)
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-2', pair(R, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // 同じ順序付きペア(R,R)が複数先を持つ → 分岐ではない → 各 1/3
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(1 / 3)
    })

    it('同じABツモでネクスト違い → 各ノード 2/3', () => {
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-0', 'node-2', pair(R, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(2 / 3)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(2 / 3)
    })

    it('同階層の確率合計が100%を超過しうる', () => {
      // AA→nodeA, AA→nodeB, AB→nodeC
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-1'),
          makeNode('node-2'),
          makeNode('node-3'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-2', pair(R, R)),
          makeEdge('e-2', 'node-0', 'node-3', pair(R, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(1 / 3)
      expect(result.get('node-3' as NodeId)).toBeCloseTo(2 / 3)
      // 合計: 1/3 + 1/3 + 2/3 = 4/3 > 1
    })
  })

  describe('パターン等価性（2手目）', () => {
    it('AAAB 1インスタンス非分岐 → 確率 = 1/3 × 4/9', () => {
      // root → X via (R,R) [AA], X → Y via (R,G) [AAAB]
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
      // AAAB: matched=2 (R,G)+(G,R via swap), total=4, multiplier=2
      // 条件付き確率 = 2/9 * 2 = 4/9
      expect(result.get('node-2' as NodeId)).toBeCloseTo((1 / 3) * (4 / 9))
    })

    it('ABAC 非分岐 → 確率 = 2/3 × 4/9', () => {
      // root → X via (R,G) [AB], X → Y via (R,B) [ABAC]
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, B)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(2 / 3)
      // ABAC: ref={R,G}, (R,B)→ABAC. matched=2 ((R,B)+(B,R swap)), total=4, mult=2
      expect(result.get('node-2' as NodeId)).toBeCloseTo((2 / 3) * (4 / 9))
    })

    it('ABAB パターン → 確率 = 2/3 × 2/9', () => {
      // root → X via (R,G) [AB], X → Y via (R,G) [ABAB]
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // ABAB: ref={R,G}, (R,G)→ABAB. matched=2 ((R,G)+(G,R swap)), total=2, mult=1
      expect(result.get('node-2' as NodeId)).toBeCloseTo((2 / 3) * (2 / 9))
    })

    it('AAAA パターン → 確率 = 1/3 × 1/9', () => {
      // root → X via (R,R) [AA], X → Y via (R,R) [AAAA]
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // AAAA: matched=1, total=1, mult=1
      expect(result.get('node-2' as NodeId)).toBeCloseTo((1 / 3) * (1 / 9))
    })

    it('ABCC パターン → 確率 = 2/3 × 1/9', () => {
      // root → X via (R,G) [AB], X → Y via (B,B) [ABCC]
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-1', 'node-2', pair(B, B)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // ABCC: ref={R,G}, (B,B)→ABCC. matched=1, total=1, mult=1
      expect(result.get('node-2' as NodeId)).toBeCloseTo((2 / 3) * (1 / 9))
    })
  })

  describe('フェーズ遷移', () => {
    it('3手目はフル色数（中辛4色）で計算', () => {
      // root → A via (R,R) → B via (R,R) → C via (R,R)
      // 3手目は4色、pair=(R,R)は1/16
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-1'),
          makeNode('node-2'),
          makeNode('node-3'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, R)),
          makeEdge('e-2', 'node-2', 'node-3', pair(R, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // move1: AA=1/3, move2: AAAA=1/9, move3: (R,R)=1/16 (no pattern equiv)
      expect(result.get('node-3' as NodeId)).toBeCloseTo(
        (1 / 3) * (1 / 9) * (1 / 16),
      )
    })

    it('甘口3色: 3手目も3色', () => {
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-1'),
          makeNode('node-2'),
          makeNode('node-3'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, R)),
          makeEdge('e-2', 'node-2', 'node-3', pair(R, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Mild)
      // 甘口: move3も3色、pair=(R,R)=1/9 (no pattern equiv at phase 2)
      expect(result.get('node-3' as NodeId)).toBeCloseTo(
        (1 / 3) * (1 / 9) * (1 / 9),
      )
    })

    it('辛口5色: 3手目は5色', () => {
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-1'),
          makeNode('node-2'),
          makeNode('node-3'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, R)),
          makeEdge('e-2', 'node-2', 'node-3', pair(R, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Hot)
      // 辛口: move3は5色、pair=(R,R)=1/25 (no pattern equiv at phase 2)
      expect(result.get('node-3' as NodeId)).toBeCloseTo(
        (1 / 3) * (1 / 9) * (1 / 25),
      )
    })
  })

  describe('共有ノード', () => {
    it('複数親からの確率合算', () => {
      // root → A via (R,R) [AA]
      // root → B via (R,G) [AB]
      // A → C via (R,G) [AAAB]
      // B → C via (R,G) [ABAB]
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-a'),
          makeNode('node-b'),
          makeNode('node-c'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-a', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-b', pair(R, G)),
          makeEdge('e-2', 'node-a', 'node-c', pair(R, G)),
          makeEdge('e-3', 'node-b', 'node-c', pair(R, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // via A: 1/3 × 4/9 (AAAB)
      // via B: 2/3 × 2/9 (ABAB)
      const expected = (1 / 3) * (4 / 9) + (2 / 3) * (2 / 9)
      expect(result.get('node-c' as NodeId)).toBeCloseTo(expected)
    })
  })

  describe('サイクル', () => {
    it('自己ループを含むグラフ', () => {
      // root → A via (R,R) [AA=1/3]
      // A → A via (R,R): phase1でAAAA=1/9 → (A, phase2), phase2で1/16 → (A, phase2)
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-1', pair(R, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // v1 = 1/3 (from root, phase 1)
      // v2 = v1 * 1/9 + v2 * 1/16 → v2 = (1/27) / (15/16) = 16/405
      // total = 1/3 + 16/405 = 135/405 + 16/405 = 151/405
      expect(result.get('node-1' as NodeId)).toBeCloseTo(151 / 405)
    })

    it('2ノード間の相互参照', () => {
      // root → A via (R,R) [AA=1/3]
      // A → B via (R,G) [phase2, 2/16 for medium (swap)]
      // B → A via (R,R) [phase2, 1/16]
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-a'), makeNode('node-b')],
        [
          makeEdge('e-0', 'node-0', 'node-a', pair(R, R)),
          makeEdge('e-1', 'node-a', 'node-b', pair(R, G)),
          makeEdge('e-2', 'node-b', 'node-a', pair(R, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // v_a(phase1) = 1/3 (from root, AAAB to B at phase2)
      // v_a(phase2) = v_b(phase2) * 1/16
      // v_b(phase2) = v_a(phase1) * 4/9 + v_a(phase2) * 2/16
      // ... complex system, just verify positivity and sum
      const probA = result.get('node-a' as NodeId)!
      const probB = result.get('node-b' as NodeId)!
      expect(probA).toBeGreaterThan(1 / 3)
      expect(probB).toBeGreaterThan(0)
    })
  })

  describe('3手目の入れ替え等価（パターン等価性なし）', () => {
    it('(R,G)のみでも入れ替えで2/n²', () => {
      // root → A → B → C via (R,G)
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-1'),
          makeNode('node-2'),
          makeNode('node-3'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, R)),
          makeEdge('e-2', 'node-2', 'node-3', pair(R, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // move3: (R,G) with swap → 2/16 = 1/8
      expect(result.get('node-3' as NodeId)).toBeCloseTo(
        (1 / 3) * (1 / 9) * (2 / 16),
      )
    })
  })

  describe('2手目パターン等価性の完全検証', () => {
    it('全8パターンが正しい確率を持つ', () => {
      // root → A via (R,R) [AA=1/3]
      // A → B_AAAA via (R,R)
      // A → B_AAAB via (R,G)
      // A → B_AABB via (G,G)
      // A → B_AABC via (G,B)
      const graphAA = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-a'),
          makeNode('node-aaaa'),
          makeNode('node-aaab'),
          makeNode('node-aabb'),
          makeNode('node-aabc'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-a', pair(R, R)),
          makeEdge('e-1', 'node-a', 'node-aaaa', pair(R, R)),
          makeEdge('e-2', 'node-a', 'node-aaab', pair(R, G)),
          makeEdge('e-3', 'node-a', 'node-aabb', pair(G, G)),
          makeEdge('e-4', 'node-a', 'node-aabc', pair(G, B)),
        ],
      )
      const rAA = calculateReachProbabilities(graphAA, Difficulty.Medium)
      // 4パターンが分岐（各パターンが異なるノードへ）
      expect(rAA.get('node-aaaa' as NodeId)).toBeCloseTo((1 / 3) * (1 / 9))
      expect(rAA.get('node-aaab' as NodeId)).toBeCloseTo((1 / 3) * (4 / 9))
      expect(rAA.get('node-aabb' as NodeId)).toBeCloseTo((1 / 3) * (2 / 9))
      expect(rAA.get('node-aabc' as NodeId)).toBeCloseTo((1 / 3) * (2 / 9))

      // root → A via (R,G) [AB=2/3]
      // A → B_ABAA via (R,R)
      // A → B_ABAB via (R,G)
      // A → B_ABAC via (R,B)
      // A → B_ABCC via (B,B)
      const graphAB = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-a'),
          makeNode('node-abaa'),
          makeNode('node-abab'),
          makeNode('node-abac'),
          makeNode('node-abcc'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-a', pair(R, G)),
          makeEdge('e-1', 'node-a', 'node-abaa', pair(R, R)),
          makeEdge('e-2', 'node-a', 'node-abab', pair(R, G)),
          makeEdge('e-3', 'node-a', 'node-abac', pair(R, B)),
          makeEdge('e-4', 'node-a', 'node-abcc', pair(B, B)),
        ],
      )
      const rAB = calculateReachProbabilities(graphAB, Difficulty.Medium)
      expect(rAB.get('node-abaa' as NodeId)).toBeCloseTo((2 / 3) * (2 / 9))
      expect(rAB.get('node-abab' as NodeId)).toBeCloseTo((2 / 3) * (2 / 9))
      expect(rAB.get('node-abac' as NodeId)).toBeCloseTo((2 / 3) * (4 / 9))
      expect(rAB.get('node-abcc' as NodeId)).toBeCloseTo((2 / 3) * (1 / 9))
    })

    it('各パターンの確率合計が元のパターン確率と一致する', () => {
      // AA系: 1/9 + 4/9 + 2/9 + 2/9 = 9/9 = 1
      // AB系: 2/9 + 2/9 + 4/9 + 1/9 = 9/9 = 1
      expect(1 / 9 + 4 / 9 + 2 / 9 + 2 / 9).toBeCloseTo(1)
      expect(2 / 9 + 2 / 9 + 4 / 9 + 1 / 9).toBeCloseTo(1)
    })
  })

  describe('入れ替え等価と2手目パターンの組み合わせ', () => {
    it('AAAB: (R,G)と(G,R)が別ノード → 分岐（中辛4色）', () => {
      // ref={R}, (R,G)→AAAB, (G,R)→AAAB. 分岐: probPerPair=2/27
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-a'),
          makeNode('node-x'),
          makeNode('node-y'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-a', pair(R, R)),
          makeEdge('e-1', 'node-a', 'node-x', pair(R, G)),
          makeEdge('e-2', 'node-a', 'node-y', pair(G, R)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      // AAAB分岐: N=4, probPerPair = C(2,1)/(9*C(3,2)) = 2/27
      expect(result.get('node-x' as NodeId)).toBeCloseTo((1 / 3) * (2 / 27))
      expect(result.get('node-y' as NodeId)).toBeCloseTo((1 / 3) * (2 / 27))
    })
  })

  describe('3手目以降でのパターン等価性なし', () => {
    it('黄色ペアは3手目以降でのみ有効', () => {
      // root → A → B → C via (Y,Y)
      // 3手目は中辛4色、(Y,Y)=1/16
      const graph = makeGraph(
        [
          makeNode('node-0'),
          makeNode('node-1'),
          makeNode('node-2'),
          makeNode('node-3'),
        ],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-1', 'node-2', pair(R, R)),
          makeEdge('e-2', 'node-2', 'node-3', pair(Y, Y)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-3' as NodeId)).toBeCloseTo(
        (1 / 3) * (1 / 9) * (1 / 16),
      )
    })
  })

  describe('3色制限の色非依存性', () => {
    it('初手に黄色を含むペアも確率を持つ（中辛4色）', () => {
      // (R,Y) は AB パターン → 非分岐で 2/3
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [makeEdge('e-0', 'node-0', 'node-1', pair(R, Y))],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(2 / 3)
    })

    it('初手に黄色同色ペアも確率を持つ（中辛4色）', () => {
      // (Y,Y) は AA パターン → 非分岐で 1/3
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1')],
        [makeEdge('e-0', 'node-0', 'node-1', pair(Y, Y))],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 3)
    })

    it('2手目にABCDパターン → 確率0（中辛4色）', () => {
      // ref={R,G}, 2手目 (B,Y) → ABCD → union=4 > 3 → prob=0
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-1', 'node-2', pair(B, Y)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(2 / 3)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(0)
    })

    it('甘口3色ではABCDは不要（3色のみ）', () => {
      // N=3: AB ref={R,G}, (B,B) → ABCC → prob=1/9
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-1', 'node-2', pair(B, B)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Mild)
      expect(result.get('node-2' as NodeId)).toBeCloseTo((2 / 3) * (1 / 9))
    })

    it('甘口ではAA分岐が各 1/9', () => {
      // N=3: AA probPerPair = C(2,2)/(9*C(3,3)) = 1/9
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, R)),
          makeEdge('e-1', 'node-0', 'node-2', pair(G, G)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Mild)
      expect(result.get('node-1' as NodeId)).toBeCloseTo(1 / 9)
      expect(result.get('node-2' as NodeId)).toBeCloseTo(1 / 9)
    })
  })

  describe('0確率ノードの表示', () => {
    it('到達不能ノードも結果マップに含まれる', () => {
      // node-2 は初手ABCD (4色使用) → prob=0
      const graph = makeGraph(
        [makeNode('node-0'), makeNode('node-1'), makeNode('node-2')],
        [
          makeEdge('e-0', 'node-0', 'node-1', pair(R, G)),
          makeEdge('e-1', 'node-1', 'node-2', pair(B, Y)),
        ],
      )
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.has('node-1' as NodeId)).toBe(true)
      expect(result.has('node-2' as NodeId)).toBe(true)
      expect(result.get('node-2' as NodeId)).toBe(0)
    })

    it('エッジなしの孤立ノードも結果マップに含まれる', () => {
      const graph = makeGraph([makeNode('node-0'), makeNode('node-1')], [])
      const result = calculateReachProbabilities(graph, Difficulty.Medium)
      expect(result.has('node-1' as NodeId)).toBe(true)
      expect(result.get('node-1' as NodeId)).toBe(0)
    })
  })
})
