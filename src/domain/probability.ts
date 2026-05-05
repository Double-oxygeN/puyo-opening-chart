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

import type { Graph, NodeId, GraphEdge } from './graph'
import type { Difficulty } from './difficulty'
import type { FilledColor } from './color'
import type { PuyoPair } from './pair'
import { getAvailableColors } from './difficulty'

/** 1手目の抽象パターン */
export type Move1Pattern = 'AA' | 'AB'

/** 2手目の抽象パターン（1手目の色との関係による分類） */
export type Move2Pattern =
  | 'AAAA'
  | 'AAAB'
  | 'AABB'
  | 'AABC'
  | 'ABAA'
  | 'ABAB'
  | 'ABAC'
  | 'ABCC'
  | 'ABCD'

type Phase = 0 | 1 | 2

interface PatternInfo {
  pairCount: number
  probPerPair: number
}

/**
 * 二項係数 C(n, r) を計算する。
 *
 * @param n - 全体の要素数（非負整数）
 * @param r - 選択する要素数（非負整数）
 * @returns C(n, r) の値。r < 0 または r > n の場合は 0
 */
function choose(n: number, r: number): number {
  if (r < 0 || r > n) return 0
  if (r === 0) return 1
  let result = 1
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return result
}

/**
 * 1手目パターンの確率情報を返す（3色制限考慮）。
 *
 * ぷよぷよ通では最初の3手は3色以内に制限されるため、
 * 1手目の各パターン（AA/AB）に対し、その出現するペア数と
 * 1ペアあたりの確率を計算する。
 *
 * @param pattern - 1手目のパターン文字列（`'AA'` または `'AB'`）
 * @param n - 使用可能な色数
 * @returns パターンのペア数と1ペアあたりの出現確率
 */
function getPhase0PatternInfo(pattern: string, n: number): PatternInfo {
  if (pattern === 'AA') {
    return {
      pairCount: n,
      probPerPair: choose(n - 1, 2) / (9 * choose(n, 3)),
    }
  }
  return {
    pairCount: n * (n - 1),
    probPerPair: choose(n - 2, 1) / (9 * choose(n, 3)),
  }
}

/** 2手目パターンが必要とする異なる色の数 */
const MOVE2_UNION_SIZES: Readonly<Record<string, number>> = {
  AAAA: 1,
  AAAB: 2,
  AABB: 2,
  AABC: 3,
  ABAA: 2,
  ABAB: 2,
  ABAC: 3,
  ABCC: 3,
  ABCD: 4,
}

/** 2手目パターンごとの順序付きペア数（色数 n の関数） */
const MOVE2_PAIR_COUNT_FNS: Readonly<Record<string, (n: number) => number>> = {
  AAAA: () => 1,
  AAAB: (n) => 2 * (n - 1),
  AABB: (n) => n - 1,
  AABC: (n) => (n - 1) * (n - 2),
  ABAA: () => 2,
  ABAB: () => 2,
  ABAC: (n) => 4 * (n - 2),
  ABCC: (n) => n - 2,
  ABCD: (n) => (n - 2) * (n - 3),
}

/**
 * 2手目パターンの確率情報を返す（3色制限考慮）。
 *
 * 1手目で使われた色（参照色）との関係に基づき、
 * 2手目の各パターンに対するペア数と1ペアあたりの確率を計算する。
 * 3色制限のもと、参照色の集合サイズに応じて残りの色の選び方が変わる。
 *
 * @param pattern - 2手目のパターン文字列（例: `'AAAB'`, `'ABCD'` など）
 * @param n - 使用可能な色数
 * @param refSize - 1手目の参照色の数（AA なら 1、AB なら 2）
 * @returns パターンのペア数と1ペアあたりの出現確率。
 *          3色制限を超えるパターン（4色以上必要）の場合は確率 0
 */
function getPhase1PatternInfo(
  pattern: string,
  n: number,
  refSize: number,
): PatternInfo {
  const unionSize = MOVE2_UNION_SIZES[pattern]
  const pairCount = MOVE2_PAIR_COUNT_FNS[pattern]?.(n) ?? 1

  if (unionSize === undefined || unionSize > 3) {
    return { pairCount, probPerPair: 0 }
  }

  return {
    pairCount,
    probPerPair:
      choose(n - unionSize, 3 - unionSize) /
      (9 * choose(n - refSize, 3 - refSize)),
  }
}

/**
 * ペアを1手目パターン（AA/AB）に分類する。
 *
 * 軸ぷよと子ぷよが同色なら `'AA'`、異色なら `'AB'` を返す。
 *
 * @param pair - 分類対象の組ぷよ
 * @returns `'AA'`（ゾロ）または `'AB'`（異色）
 */
export function classifyMove1Pattern(pair: PuyoPair): Move1Pattern {
  return pair.axis === pair.child ? 'AA' : 'AB'
}

/**
 * ペアを2手目パターンに分類する（1手目の参照色に基づく）。
 *
 * 1手目のパターン（AA/AB）と2手目の軸・子ぷよの色が
 * 参照色集合に含まれるかどうかにより、9種類のパターンに分類する。
 *
 * 例: 1手目が赤赤（AA）、2手目が赤青なら `'AAAB'`。
 *
 * @param pair - 分類対象の2手目の組ぷよ
 * @param refColors - 1手目で使われた色の集合（AA なら 1色、AB なら 2色）
 * @returns 2手目のパターン（例: `'AAAB'`, `'ABCD'` など）
 */
export function classifyMove2Pattern(
  pair: PuyoPair,
  refColors: ReadonlySet<FilledColor>,
): Move2Pattern {
  const axisInRef = refColors.has(pair.axis)
  const childInRef = refColors.has(pair.child)
  const sameColor = pair.axis === pair.child

  if (refColors.size === 1) {
    // 1手目がAA
    if (sameColor) {
      return axisInRef ? 'AAAA' : 'AABB'
    } else {
      return axisInRef || childInRef ? 'AAAB' : 'AABC'
    }
  } else {
    // 1手目がAB
    if (sameColor) {
      return axisInRef ? 'ABAA' : 'ABCC'
    } else {
      if (axisInRef && childInRef) return 'ABAB'
      if (axisInRef || childInRef) return 'ABAC'
      return 'ABCD'
    }
  }
}

/**
 * ルートからの入力エッジを調べ、1手目の参照色集合を返す。
 *
 * 指定ノードへのルートからの入力エッジがすべて同じ1手目パターン
 * （AA または AB）であれば、最初のエッジのペア色を参照色として返す。
 * パターンが混在している場合や入力エッジがない場合は `null` を返す。
 *
 * @param graph - 対象のグラフ
 * @param nodeId - 参照色を求めたいノードのID
 * @param rootId - ルートノードのID
 * @returns 1手目の参照色の集合。判定不能な場合は `null`
 */
function getMove1RefColors(
  graph: Graph,
  nodeId: NodeId,
  rootId: NodeId,
): ReadonlySet<FilledColor> | null {
  const incoming = graph.edges.filter(
    (e) => e.from === rootId && e.to === nodeId,
  )
  if (incoming.length === 0) return null

  const firstPattern = classifyMove1Pattern(incoming[0].pair)
  if (!incoming.every((e) => classifyMove1Pattern(e.pair) === firstPattern)) {
    return null
  }

  const ref = new Set<FilledColor>()
  ref.add(incoming[0].pair.axis)
  ref.add(incoming[0].pair.child)
  return ref
}

/**
 * パターン等価性を適用した遷移確率を計算し、遷移行列の行に加算する。
 *
 * 順序付きペアを分類関数でパターンにグループ化し、
 * 非分岐パターン（全マッチ済みペアが同じ遷移先を含む）には
 * パターン乗数を適用して未登録インスタンスの確率を補填する。
 *
 * 同じ順序付きペアが異なるネクストにより複数エッジを持つ場合、
 * 各遷移先は独立に確率を受け取る（分岐とみなさない）。
 *
 * @param transitionRow - 遷移行列の1行分。計算結果がインプレースで加算される
 * @param edges - 現在のノードから出る全エッジ
 * @param nodeIndex - ノードIDから行列インデックスへのマッピング
 * @param colors - 使用可能な色ぷよの配列
 * @param nextPhase - 遷移先のフェーズ（0: 1手目前, 1: 2手目前, 2: 3手目以降）
 * @param classifyPair - 軸色と子色からパターン文字列を返す分類関数
 * @param getPatternInfo - パターン文字列からペア数・確率情報を返す関数
 */
function makePairKey(axis: FilledColor, child: FilledColor): string {
  return `${axis},${child}`
}

function computeTransitions(
  transitionRow: number[],
  edges: readonly GraphEdge[],
  nodeIndex: ReadonlyMap<NodeId, number>,
  colors: readonly FilledColor[],
  nextPhase: Phase,
  classifyPair: (axis: FilledColor, child: FilledColor) => string,
  getPatternInfo: (pattern: string) => PatternInfo,
): void {
  // (axis,child) → 遷移先NodeIdの集合 のMapを事前構築し、繰り返しfilterを避ける
  const edgesByPair = new Map<string, Set<NodeId>>()
  for (const edge of edges) {
    const key = makePairKey(edge.pair.axis, edge.pair.child)
    let dests = edgesByPair.get(key)
    if (dests === undefined) {
      dests = new Set()
      edgesByPair.set(key, dests)
    }
    dests.add(edge.to)
  }

  const patternGroups = new Map<
    string,
    { destPairCounts: Map<NodeId, number>; totalMatchedPairs: number }
  >()

  for (const a of colors) {
    for (const b of colors) {
      const pattern = classifyPair(a, b)

      if (!patternGroups.has(pattern)) {
        patternGroups.set(pattern, {
          destPairCounts: new Map(),
          totalMatchedPairs: 0,
        })
      }
      const group = patternGroups.get(pattern)!

      let dests = edgesByPair.get(makePairKey(a, b))
      if ((dests === undefined || dests.size === 0) && a !== b) {
        dests = edgesByPair.get(makePairKey(b, a))
      }

      if (dests !== undefined && dests.size > 0) {
        for (const dest of dests) {
          group.destPairCounts.set(
            dest,
            (group.destPairCounts.get(dest) ?? 0) + 1,
          )
        }
        group.totalMatchedPairs++
      }
    }
  }

  for (const [pattern, group] of patternGroups) {
    if (group.totalMatchedPairs === 0) continue

    const info = getPatternInfo(pattern)
    if (info.probPerPair === 0) continue

    for (const [destNodeId, pairCount] of group.destPairCounts) {
      const destIdx = nodeIndex.get(destNodeId)
      if (destIdx === undefined) continue

      const isNonBranching = pairCount === group.totalMatchedPairs
      const multiplier = isNonBranching
        ? info.pairCount / group.totalMatchedPairs
        : 1

      const toState = destIdx * 3 + nextPhase
      transitionRow[toState] += info.probPerPair * pairCount * multiplier
    }
  }
}

/**
 * Gaussian消去法（部分ピボット付き）で連立方程式 Ax = b を解く。
 *
 * 拡大係数行列を構成し、前進消去と後退代入により解を求める。
 * ピボットの絶対値が 1e-12 未満の場合はその列をスキップし、
 * 対応する未知数を 0 とする。
 *
 * @param A - 係数行列（n×n の2次元配列）。破壊されない（内部でコピーされる）
 * @param b - 右辺ベクトル（長さ n）
 * @returns 解ベクトル x（長さ n）
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length
  const aug: number[][] = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    let maxVal = Math.abs(aug[col][col])
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row][col])
      if (val > maxVal) {
        maxVal = val
        maxRow = row
      }
    }

    if (maxRow !== col) {
      ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    }

    const pivot = aug[col][col]
    if (Math.abs(pivot) < 1e-12) continue

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j]
      }
    }
  }

  const x: number[] = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-12) continue
    x[i] = aug[i][n]
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j]
    }
    x[i] /= aug[i][i]
  }

  return x
}

/**
 * グラフの初期盤面から各盤面への到達確率を計算する。
 *
 * 状態空間 (NodeId, Phase) で Markov 連鎖を構成し、
 * 連立方程式 (I - Tᵀ)v = e₀ を解いて期待訪問回数を求める。
 * サイクルがなければ到達確率と一致する。
 *
 * フェーズは3色制限ルールに対応し、1手目 (phase=0) と
 * 2手目 (phase=1) ではパターン分類による確率調整を行い、
 * 3手目以降 (phase=2) では一様分布を使用する。
 *
 * @param graph - 盤面遷移グラフ。最初のノードがルート（初期盤面）
 * @param difficulty - 難易度設定（使用可能な色数に影響する）
 * @returns ルートを除く各ノードIDをキー、到達確率（0〜1）を値とするマップ。
 *          ノードが1つ以下の場合は空マップを返す
 */
export function calculateReachProbabilities(
  graph: Graph,
  difficulty: Difficulty,
): Map<NodeId, number> {
  if (graph.nodes.length <= 1) return new Map()

  const rootId = graph.nodes[0].id
  const N = graph.nodes.length

  const nodeIndex = new Map<NodeId, number>()
  graph.nodes.forEach((node, i) => nodeIndex.set(node.id, i))

  const outEdges = new Map<NodeId, GraphEdge[]>()
  for (const edge of graph.edges) {
    const list = outEdges.get(edge.from) ?? []
    list.push(edge)
    outEdges.set(edge.from, list)
  }

  const S = N * 3
  const T: number[][] = Array.from({ length: S }, () =>
    new Array<number>(S).fill(0),
  )

  const allColors = getAvailableColors(difficulty)
  const n = allColors.length

  for (let ni = 0; ni < N; ni++) {
    const nodeId = graph.nodes[ni].id
    const edges = outEdges.get(nodeId) ?? []

    for (let phase = 0; phase < 3; phase++) {
      const fromState = ni * 3 + phase
      const nextPhase = Math.min(phase + 1, 2) as Phase

      if (phase === 0) {
        computeTransitions(
          T[fromState],
          edges,
          nodeIndex,
          allColors,
          nextPhase,
          (a, b) => (a === b ? 'AA' : 'AB'),
          (p) => getPhase0PatternInfo(p, n),
        )
      } else {
        const refColors =
          phase === 1 ? getMove1RefColors(graph, nodeId, rootId) : null
        if (refColors) {
          const refSize = refColors.size
          computeTransitions(
            T[fromState],
            edges,
            nodeIndex,
            allColors,
            nextPhase,
            (a, b) => classifyMove2Pattern({ axis: a, child: b }, refColors),
            (p) => getPhase1PatternInfo(p, n, refSize),
          )
        } else {
          computeTransitions(
            T[fromState],
            edges,
            nodeIndex,
            allColors,
            nextPhase,
            (a, b) => `${a},${b}`,
            () => ({ pairCount: 1, probPerPair: 1 / (n * n) }),
          )
        }
      }
    }
  }

  // (I - Tᵀ) v = e₀
  const A: number[][] = Array.from({ length: S }, (_, i) =>
    Array.from({ length: S }, (_, j) => (i === j ? 1 : 0) - T[j][i]),
  )

  const bVec: number[] = new Array<number>(S).fill(0)
  const rootIdx = nodeIndex.get(rootId)!
  bVec[rootIdx * 3] = 1

  const v = solveLinearSystem(A, bVec)

  const result = new Map<NodeId, number>()
  for (let ni = 0; ni < N; ni++) {
    const nodeId = graph.nodes[ni].id
    if (nodeId === rootId) continue
    const prob = v[ni * 3] + v[ni * 3 + 1] + v[ni * 3 + 2]
    result.set(nodeId, Math.max(0, prob))
  }

  return result
}
