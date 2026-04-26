import type { Graph, NodeId } from '../domain/graph'
import { BOARD_COLS, BOARD_ROWS } from '../domain/board'
import { PUYO_HEX_COLORS } from '../domain/color'
import NodeThumbnail from './NodeThumbnail'

interface GraphTreeViewProps {
  graph: Graph
  selectedNodeId: NodeId
  onSelectNode: (nodeId: NodeId) => void
}

interface TreeLayout {
  nodePositions: Map<NodeId, { x: number; y: number }>
  width: number
  height: number
}

const THUMBNAIL_HEIGHT = 72
const THUMBNAIL_WIDTH = Math.ceil((THUMBNAIL_HEIGHT / BOARD_ROWS) * BOARD_COLS)
const NODE_WIDTH = THUMBNAIL_WIDTH + 8
const NODE_HEIGHT = THUMBNAIL_HEIGHT + 8
const H_GAP = 10
const V_GAP = 48

function computeTreeLayout(graph: Graph): TreeLayout {
  const positions = new Map<NodeId, { x: number; y: number }>()
  if (graph.nodes.length === 0)
    return { nodePositions: positions, width: 0, height: 0 }

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

    const children = childrenMap.get(id) ?? []
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId)
        queue.push({ id: childId, depth: depth + 1 })
      }
    }
  }

  // Position nodes
  let maxWidth = 0
  for (let depth = 0; depth < levels.length; depth++) {
    const level = levels[depth]
    const totalWidth = level.length * NODE_WIDTH + (level.length - 1) * H_GAP
    maxWidth = Math.max(maxWidth, totalWidth)
    const startX = -totalWidth / 2

    for (let i = 0; i < level.length; i++) {
      positions.set(level[i], {
        x: startX + i * (NODE_WIDTH + H_GAP) + NODE_WIDTH / 2,
        y: depth * (NODE_HEIGHT + V_GAP) + NODE_HEIGHT / 2,
      })
    }
  }

  const height = levels.length * (NODE_HEIGHT + V_GAP)
  return { nodePositions: positions, width: maxWidth + NODE_WIDTH, height }
}

export default function GraphTreeView({
  graph,
  selectedNodeId,
  onSelectNode,
}: GraphTreeViewProps) {
  const layout = computeTreeLayout(graph)
  const padding = 40

  const svgWidth = Math.max(layout.width + padding * 2, 200)
  const svgHeight = Math.max(layout.height + padding * 2, 200)

  return (
    <div className="overflow-auto h-full">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`${-svgWidth / 2} 0 ${svgWidth} ${svgHeight}`}
      >
        {/* エッジ */}
        {graph.edges.map((edge) => {
          const from = layout.nodePositions.get(edge.from)
          const to = layout.nodePositions.get(edge.to)
          if (!from || !to) return null

          const axisColor = PUYO_HEX_COLORS[edge.pair.axis]
          const childColor = PUYO_HEX_COLORS[edge.pair.child]

          const midX = from.x + (to.x - from.x) * 0.5
          const midY = (from.y + NODE_HEIGHT / 2 + to.y - NODE_HEIGHT / 2) / 2

          return (
            <g key={edge.id}>
              <line
                x1={from.x}
                y1={from.y + NODE_HEIGHT / 2}
                x2={to.x}
                y2={to.y - NODE_HEIGHT / 2}
                stroke="#9ca3af"
                strokeWidth={2}
              />
              {/* エッジラベル: 組ぷよ（上=子ぷよ、下=軸ぷよ） */}
              <circle
                cx={midX}
                cy={midY - 6}
                r={5}
                fill={childColor}
                stroke="#fff"
                strokeWidth={1}
              />
              <circle
                cx={midX}
                cy={midY + 6}
                r={5}
                fill={axisColor}
                stroke="#fff"
                strokeWidth={1}
              />
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
                  onClick={() => onSelectNode(node.id)}
                />
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}
