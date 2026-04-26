import type { Board } from './board'
import type { PuyoPair } from './pair'
import { createEmptyBoard, boardsEqual } from './board'

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
