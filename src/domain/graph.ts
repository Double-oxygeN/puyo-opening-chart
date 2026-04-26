import type { Board } from './board'
import type { PuyoPair } from './pair'
import { createEmptyBoard } from './board'

/** ノードの一意識別子 */
export type NodeId = string & { readonly __brand: 'NodeId' }

/** エッジの一意識別子 */
export type EdgeId = string & { readonly __brand: 'EdgeId' }

/** グラフのノード: 盤面の状態 */
export interface GraphNode {
  readonly id: NodeId
  readonly board: Board
}

/** グラフのエッジ: 組ぷよの配置による遷移 */
export interface GraphEdge {
  readonly id: EdgeId
  readonly from: NodeId
  readonly to: NodeId
  readonly pair: PuyoPair
  readonly next?: PuyoPair
  readonly nextNext?: PuyoPair
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
export function addNode(graph: Graph, board: Board): [Graph, GraphNode] {
  const node: GraphNode = {
    id: `node-${graph.nodeIdSeq}` as NodeId,
    board,
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
  next?: PuyoPair,
  nextNext?: PuyoPair,
): Graph {
  const edge: GraphEdge = {
    id: `edge-${graph.edgeIdSeq}` as EdgeId,
    from,
    to,
    pair,
    ...(next != null ? { next } : {}),
    ...(nextNext != null ? { nextNext } : {}),
  }
  return {
    ...graph,
    edges: [...graph.edges, edge],
    edgeIdSeq: graph.edgeIdSeq + 1,
  }
}

/** ノードの子エッジを取得する */
export function getChildEdges(graph: Graph, nodeId: NodeId): GraphEdge[] {
  return graph.edges.filter((e) => e.from === nodeId)
}

/** ノードの子ノードを取得する */
export function getChildNodes(graph: Graph, nodeId: NodeId): GraphNode[] {
  const childEdges = getChildEdges(graph, nodeId)
  const childIds = new Set(childEdges.map((e) => e.to))
  return graph.nodes.filter((n) => childIds.has(n.id))
}

/** ルートノード（edges で from として参照されないノード、または最初のノード）を取得する */
export function getRootNode(graph: Graph): GraphNode | undefined {
  return graph.nodes[0]
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

/** 既存ノードの盤面を上書きする */
export function updateNodeBoard(
  graph: Graph,
  nodeId: NodeId,
  board: Board,
): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === nodeId ? { ...n, board } : n)),
  }
}

/** ノードへの親エッジを取得する */
export function getParentEdge(
  graph: Graph,
  nodeId: NodeId,
): GraphEdge | undefined {
  return graph.edges.find((e) => e.to === nodeId)
}
