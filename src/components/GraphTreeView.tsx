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

import type { Graph, GraphEdge, NodeId } from '../domain/graph'
import { BOARD_COLS, BOARD_ROWS } from '../domain/board'
import { PUYO_HEX_COLORS } from '../domain/color'
import type { PuyoPair } from '../domain/pair'
import NodeThumbnail from './NodeThumbnail'

interface GraphTreeViewProps {
  graph: Graph
  selectedNodeId: NodeId
  onSelectNode: (nodeId: NodeId) => void
}

interface TreeLayout {
  nodePositions: Map<NodeId, { x: number; y: number }>
  nodeDepths: Map<NodeId, number>
  width: number
  height: number
}

const THUMBNAIL_HEIGHT = 72
const THUMBNAIL_WIDTH = Math.ceil((THUMBNAIL_HEIGHT / BOARD_ROWS) * BOARD_COLS)
const NODE_WIDTH = THUMBNAIL_WIDTH + 8
const NODE_HEIGHT = THUMBNAIL_HEIGHT + 8
/** 深さ方向（左→右）のノード間隔 */
const DEPTH_GAP = 96
/** 兄弟方向（上→下）のノード間隔 */
const SIBLING_GAP = 36
/** 矢印マーカーのサイズ */
const ARROW_SIZE = 8

function computeTreeLayout(graph: Graph): TreeLayout {
  const positions = new Map<NodeId, { x: number; y: number }>()
  const nodeDepths = new Map<NodeId, number>()
  if (graph.nodes.length === 0)
    return { nodePositions: positions, nodeDepths, width: 0, height: 0 }

  const root = graph.nodes[0]
  const childrenMap = new Map<NodeId, NodeId[]>()

  for (const edge of graph.edges) {
    const children = childrenMap.get(edge.from) ?? []
    children.push(edge.to)
    childrenMap.set(edge.from, children)
  }

  // BFS to determine depth levels
  const levels: NodeId[][] = []
  const visited = new Set<NodeId>()
  const queue: { id: NodeId; depth: number }[] = [{ id: root.id, depth: 0 }]
  visited.add(root.id)

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (!levels[depth]) levels[depth] = []
    levels[depth].push(id)
    nodeDepths.set(id, depth)

    const children = childrenMap.get(id) ?? []
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId)
        queue.push({ id: childId, depth: depth + 1 })
      }
    }
  }

  // Position nodes: 深さを横方向（x）、兄弟を縦方向（y）に配置
  let maxHeight = 0
  for (let depth = 0; depth < levels.length; depth++) {
    const level = levels[depth]
    const totalHeight =
      level.length * NODE_HEIGHT + (level.length - 1) * SIBLING_GAP
    maxHeight = Math.max(maxHeight, totalHeight)
    const startY = -totalHeight / 2

    for (let i = 0; i < level.length; i++) {
      positions.set(level[i], {
        x: depth * (NODE_WIDTH + DEPTH_GAP) + NODE_WIDTH / 2,
        y: startY + i * (NODE_HEIGHT + SIBLING_GAP) + NODE_HEIGHT / 2,
      })
    }
  }

  const width = levels.length * (NODE_WIDTH + DEPTH_GAP)
  return {
    nodePositions: positions,
    nodeDepths,
    width,
    height: maxHeight + NODE_HEIGHT,
  }
}

/** エッジ上に組ぷよペアを1つ描画する（子ぷよ上・軸ぷよ下） */
function renderPairCircles(pair: PuyoPair, cx: number, cy: number) {
  return (
    <>
      <circle
        cx={cx}
        cy={cy - 6}
        r={5}
        fill={PUYO_HEX_COLORS[pair.child]}
        stroke="#fff"
        strokeWidth={1}
      />
      <circle
        cx={cx}
        cy={cy + 6}
        r={5}
        fill={PUYO_HEX_COLORS[pair.axis]}
        stroke="#fff"
        strokeWidth={1}
      />
    </>
  )
}

/** エッジラベル: 1〜3組の組ぷよを横に並べて描画 + 連鎖情報 */
function EdgeLabel({
  edge,
  midX,
  midY,
}: {
  edge: GraphEdge
  midX: number
  midY: number
}) {
  const pairs: PuyoPair[] = [edge.pair]
  if (edge.next) pairs.push(edge.next)
  if (edge.nextNext) pairs.push(edge.nextNext)

  const pairSpacing = 14
  const totalWidth = (pairs.length - 1) * pairSpacing
  const startX = midX - totalWidth / 2

  return (
    <>
      {pairs.map((pair, i) =>
        renderPairCircles(pair, startX + i * pairSpacing, midY),
      )}
      {edge.chainNotation && (
        <>
          <rect
            x={midX - edge.chainNotation.length * 3 - 2}
            y={midY + 12}
            width={edge.chainNotation.length * 6 + 4}
            height={12}
            rx={2}
            fill="rgba(255,255,255,0.85)"
          />
          <text
            x={midX}
            y={midY + 22}
            textAnchor="middle"
            fontSize={9}
            fontWeight="bold"
            fill="#374151"
          >
            {edge.chainNotation}
          </text>
        </>
      )}
    </>
  )
}

/** 戻りエッジかどうかを判定する（toの深さ ≤ fromの深さ） */
function isBackEdge(edge: GraphEdge, nodeDepths: Map<NodeId, number>): boolean {
  const fromDepth = nodeDepths.get(edge.from) ?? 0
  const toDepth = nodeDepths.get(edge.to) ?? 0
  return toDepth <= fromDepth
}

/** 順方向エッジのパスデータを生成する（直線） */
function forwardEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { d: string; midX: number; midY: number } {
  const x1 = from.x + NODE_WIDTH / 2
  const y1 = from.y
  const x2 = to.x - NODE_WIDTH / 2 - ARROW_SIZE
  const y2 = to.y
  return {
    d: `M ${x1} ${y1} L ${x2} ${y2}`,
    midX: (x1 + x2) / 2,
    midY: y1 + (y2 - y1) * 0.5,
  }
}

/** 戻りエッジのパスデータを生成する（下方向に迂回する曲線） */
function backEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  layoutHeight: number,
): { d: string; midX: number; midY: number } {
  const x1 = from.x
  const y1 = from.y + NODE_HEIGHT / 2
  const x2 = to.x
  const y2 = to.y + NODE_HEIGHT / 2

  // 曲線の下方向オフセット: 水平距離と垂直距離に比例
  const dx = Math.abs(x1 - x2)
  const curveOffset = Math.max(NODE_HEIGHT, dx * 0.25 + 40)
  const bottomY = Math.max(y1, y2) + curveOffset

  // 下辺を超えないように制限（layoutHeightの半分 + マージン）
  const clampedBottomY = Math.min(bottomY, layoutHeight / 2 + 30)

  const cp1x = x1
  const cp1y = clampedBottomY
  const cp2x = x2
  const cp2y = clampedBottomY

  // 3次ベジェ曲線の中間点（t=0.5）
  const midX = (x1 + 3 * cp1x + 3 * cp2x + x2) / 8
  const midY = (y1 + 3 * cp1y + 3 * cp2y + y2) / 8

  return {
    d: `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`,
    midX,
    midY,
  }
}

export default function GraphTreeView({
  graph,
  selectedNodeId,
  onSelectNode,
}: GraphTreeViewProps) {
  const layout = computeTreeLayout(graph)
  const padding = 40
  const backEdgePadding = 60

  const svgWidth = Math.max(layout.width + padding * 2, 200)
  const svgHeight = Math.max(layout.height + padding * 2 + backEdgePadding, 200)

  return (
    <div className="overflow-auto h-full">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 ${-svgHeight / 2} ${svgWidth} ${svgHeight}`}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth={ARROW_SIZE}
            markerHeight={ARROW_SIZE}
            refX={ARROW_SIZE}
            refY={ARROW_SIZE / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon
              points={`0 0, ${ARROW_SIZE} ${ARROW_SIZE / 2}, 0 ${ARROW_SIZE}`}
              fill="#9ca3af"
            />
          </marker>
          <marker
            id="arrowhead-back"
            markerWidth={ARROW_SIZE}
            markerHeight={ARROW_SIZE}
            refX={ARROW_SIZE}
            refY={ARROW_SIZE / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon
              points={`0 0, ${ARROW_SIZE} ${ARROW_SIZE / 2}, 0 ${ARROW_SIZE}`}
              fill="#d1d5db"
            />
          </marker>
        </defs>

        {/* エッジ（ノードの奥に描画） */}
        {graph.edges.map((edge) => {
          const from = layout.nodePositions.get(edge.from)
          const to = layout.nodePositions.get(edge.to)
          if (!from || !to) return null

          const isBack = isBackEdge(edge, layout.nodeDepths)
          const { d, midX, midY } = isBack
            ? backEdgePath(from, to, layout.height)
            : forwardEdgePath(from, to)

          return (
            <g key={edge.id}>
              <path
                d={d}
                stroke={isBack ? '#d1d5db' : '#9ca3af'}
                strokeWidth={2}
                fill="none"
                strokeDasharray={isBack ? '6 3' : undefined}
                markerEnd={isBack ? 'url(#arrowhead-back)' : 'url(#arrowhead)'}
              />
              <EdgeLabel edge={edge} midX={midX} midY={midY} />
            </g>
          )
        })}

        {/* ノード */}
        {graph.nodes.map((node) => {
          const pos = layout.nodePositions.get(node.id)
          if (!pos) return null

          return (
            <foreignObject
              key={node.id}
              x={pos.x - NODE_WIDTH / 2}
              y={pos.y - NODE_HEIGHT / 2}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
            >
              <div className="flex items-center justify-center h-full">
                <NodeThumbnail
                  board={node.board}
                  height={THUMBNAIL_HEIGHT}
                  selected={node.id === selectedNodeId}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectNode(node.id)
                  }}
                />
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
