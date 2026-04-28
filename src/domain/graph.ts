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

import type { Board } from './board'
import type { PuyoPair } from './pair'
import type { Rotation } from './pair'
import {
  createEmptyBoard,
  boardsEqual,
  compactBoard,
  expandBoard,
  isDead,
} from './board'
import { placePair } from './pair'
import { formatChainNotation } from './chain'

/** ノードの一意識別子 */
export type NodeId = string & { readonly __brand: 'NodeId' }

/** エッジの一意識別子 */
export type EdgeId = string & { readonly __brand: 'EdgeId' }

/** ノードのツモ確定制約: このノードで確定しているツモとネクスト */
export interface TsumoConstraint {
  readonly currentPair?: PuyoPair
  readonly nextPair?: PuyoPair
}

/** グラフのノード: 盤面の状態 */
export interface GraphNode {
  readonly id: NodeId
  readonly board: Board
  readonly constraint?: TsumoConstraint
  readonly memo?: string
}

/** グラフのエッジ: 組ぷよの配置による遷移 */
export interface GraphEdge {
  readonly id: EdgeId
  readonly from: NodeId
  readonly to: NodeId
  readonly pair: PuyoPair
  readonly col: number
  readonly rotation: Rotation
  readonly next?: PuyoPair
  readonly nextNext?: PuyoPair
  /** 連鎖構成フォーマット文字列（連鎖が発生した場合のみ） */
  readonly chainNotation?: string
}

/** 有向グラフ */
export interface Graph {
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly nodeIdSeq: number
  readonly edgeIdSeq: number
}

/** 空盤面のルートノードで初期グラフを生成する */
export function createInitialGraph(): Graph {
  const rootNode: GraphNode = {
    id: 'node-0' as NodeId,
    board: createEmptyBoard(),
  }
  return { nodes: [rootNode], edges: [], nodeIdSeq: 1, edgeIdSeq: 0 }
}

/** グラフにノードを追加する */
export function addNode(
  graph: Graph,
  board: Board,
  constraint?: TsumoConstraint,
): [Graph, GraphNode] {
  const node: GraphNode = {
    id: `node-${graph.nodeIdSeq}` as NodeId,
    board,
    ...(constraint != null ? { constraint } : {}),
  }
  return [
    {
      ...graph,
      nodes: [...graph.nodes, node],
      nodeIdSeq: graph.nodeIdSeq + 1,
    },
    node,
  ]
}

/** グラフにエッジを追加する */
export function addEdge(
  graph: Graph,
  from: NodeId,
  to: NodeId,
  pair: PuyoPair,
  col: number,
  rotation: Rotation,
  next?: PuyoPair,
  nextNext?: PuyoPair,
  chainNotation?: string,
): Graph {
  const edge: GraphEdge = {
    id: `edge-${graph.edgeIdSeq}` as EdgeId,
    from,
    to,
    pair,
    col,
    rotation,
    ...(next != null ? { next } : {}),
    ...(nextNext != null ? { nextNext } : {}),
    ...(chainNotation != null ? { chainNotation } : {}),
  }
  return {
    ...graph,
    edges: [...graph.edges, edge],
    edgeIdSeq: graph.edgeIdSeq + 1,
  }
}

/** 組ぷよが一致するか判定する */
function pairsEqual(a: PuyoPair | undefined, b: PuyoPair | undefined): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return a.axis === b.axis && a.child === b.child
}

/** 同じ親ノードからツモ・ネクスト・ネクネクがすべて一致するエッジを検索する */
export function findMatchingEdge(
  graph: Graph,
  fromNodeId: NodeId,
  pair: PuyoPair,
  next?: PuyoPair,
  nextNext?: PuyoPair,
): GraphEdge | undefined {
  return graph.edges.find(
    (e) =>
      e.from === fromNodeId &&
      pairsEqual(e.pair, pair) &&
      pairsEqual(e.next, next) &&
      pairsEqual(e.nextNext, nextNext),
  )
}

/** ルートから到達不能なノードとエッジを除去する */
export function pruneUnreachable(graph: Graph): Graph {
  const rootId = graph.nodes[0]?.id
  if (!rootId) return graph

  const reachable = new Set<NodeId>()
  const queue: NodeId[] = [rootId]
  reachable.add(rootId)
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const e of graph.edges) {
      if (e.from === current && !reachable.has(e.to)) {
        reachable.add(e.to)
        queue.push(e.to)
      }
    }
  }

  const prunedNodes = graph.nodes.filter((n) => reachable.has(n.id))
  const prunedEdges = graph.edges.filter(
    (e) => reachable.has(e.from) && reachable.has(e.to),
  )

  if (prunedNodes.length === graph.nodes.length) return graph
  return { ...graph, nodes: prunedNodes, edges: prunedEdges }
}

/** エッジの遷移先を差し替え、到達不能なノードを除去する */
export function replaceEdgeTarget(
  graph: Graph,
  edgeId: EdgeId,
  newTarget: NodeId,
): Graph {
  const updated = {
    ...graph,
    edges: graph.edges.map((e) =>
      e.id === edgeId ? { ...e, to: newTarget } : e,
    ),
  }
  return pruneUnreachable(updated)
}

/** ツモ制約が等しいか判定する */
export function constraintsEqual(
  a: TsumoConstraint | undefined,
  b: TsumoConstraint | undefined,
): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return (
    pairsEqual(a.currentPair, b.currentPair) &&
    pairsEqual(a.nextPair, b.nextPair)
  )
}

/** 同じ盤面＋同じツモ制約を持つ既存ノードを検索する */
export function findMergeableNode(
  graph: Graph,
  board: Board,
  constraint?: TsumoConstraint,
): GraphNode | undefined {
  return graph.nodes.find(
    (n) =>
      boardsEqual(n.board, board) && constraintsEqual(n.constraint, constraint),
  )
}

/** 指定ノードを削除し、到達不能になったノード・エッジも除去する。ルートノードは削除不可 */
export function removeNode(graph: Graph, nodeId: NodeId): Graph {
  const rootId = graph.nodes[0]?.id
  if (!rootId || nodeId === rootId) return graph
  if (!graph.nodes.some((n) => n.id === nodeId)) return graph

  const filtered = {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges: graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
  }
  return pruneUnreachable(filtered)
}

/** 指定ノードの親ノードIDを返す（最初に見つかったもの） */
export function findParentNodeId(
  graph: Graph,
  nodeId: NodeId,
): NodeId | undefined {
  const edge = graph.edges.find((e) => e.to === nodeId)
  return edge?.from
}

/** ノードのメモを更新する */
export function updateNodeMemo(
  graph: Graph,
  nodeId: NodeId,
  memo: string,
): Graph {
  const normalizedMemo = memo || undefined
  const nodeExists = graph.nodes.some((n) => n.id === nodeId)
  if (!nodeExists) return graph
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, memo: normalizedMemo } : n,
    ),
  }
}

/** グラフをJSON文字列にシリアライズする（盤面の空白行を省略して圧縮） */
export function serializeGraph(graph: Graph): string {
  const compactGraph = {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      board: compactBoard(n.board),
    })),
  }
  return JSON.stringify(compactGraph)
}

/** JSON文字列からグラフをデシリアライズする。不正データの場合は null を返す */
export function deserializeGraph(json: string): Graph | null {
  try {
    const data: unknown = JSON.parse(json)
    if (!isValidGraph(data)) return null
    // 圧縮された盤面を展開
    return {
      ...data,
      nodes: data.nodes.map((n) => ({
        ...n,
        board: expandBoard(n.board),
      })),
    }
  } catch {
    return null
  }
}

function isValidGraph(data: unknown): data is Graph {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>

  if (typeof obj.nodeIdSeq !== 'number') return false
  if (typeof obj.edgeIdSeq !== 'number') return false
  if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) return false
  if (!Array.isArray(obj.edges)) return false

  for (const node of obj.nodes) {
    if (typeof node !== 'object' || node === null) return false
    const n = node as Record<string, unknown>
    if (typeof n.id !== 'string') return false
    if (!Array.isArray(n.board)) return false
  }

  for (const edge of obj.edges) {
    if (typeof edge !== 'object' || edge === null) return false
    const e = edge as Record<string, unknown>
    if (typeof e.id !== 'string') return false
    if (typeof e.from !== 'string') return false
    if (typeof e.to !== 'string') return false
    if (typeof e.pair !== 'object' || e.pair === null) return false
    if (typeof e.col !== 'number') return false
    if (typeof e.rotation !== 'number') return false
  }

  return true
}

/** 保存データの整合性を検証する: 各エッジの操作を再生して遷移先ノードの盤面と一致するか確認する */
export function validateGraph(graph: Graph): boolean {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

  // ルートノードの存在確認
  if (graph.nodes.length === 0 || !nodeMap.has(graph.nodes[0].id)) return false

  // 全エッジの操作を再生して検証
  for (const edge of graph.edges) {
    const fromNode = nodeMap.get(edge.from)
    const toNode = nodeMap.get(edge.to)
    if (!fromNode || !toNode) return false

    // 窒息状態のノードからは遷移できない
    if (isDead(fromNode.board)) return false

    const pairState = {
      pair: edge.pair,
      col: edge.col,
      rotation: edge.rotation,
    }
    const resultBoard = placePair(fromNode.board, pairState)
    if (!resultBoard) return false
    if (!boardsEqual(resultBoard.board, toNode.board)) return false

    // 連鎖情報の検証
    const expectedNotation = formatChainNotation(resultBoard.chainResult)
    if ((expectedNotation ?? undefined) !== edge.chainNotation) return false
  }

  // ルート以外の全ノードがエッジで到達可能か確認
  const rootId = graph.nodes[0].id
  const reachable = new Set<NodeId>()
  reachable.add(rootId)
  const queue: NodeId[] = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const e of graph.edges) {
      if (e.from === current && !reachable.has(e.to)) {
        reachable.add(e.to)
        queue.push(e.to)
      }
    }
  }

  return graph.nodes.every((n) => reachable.has(n.id))
}

/** 同一親ノードから同じ遷移先ノードへの重複エッジを検索する */
export function findDuplicateEdge(
  graph: Graph,
  fromNodeId: NodeId,
  targetNodeId: NodeId,
  next?: PuyoPair,
  nextNext?: PuyoPair,
): GraphEdge | undefined {
  return graph.edges.find(
    (e) =>
      e.from === fromNodeId &&
      e.to === targetNodeId &&
      pairsEqual(e.next, next) &&
      pairsEqual(e.nextNext, nextNext),
  )
}
