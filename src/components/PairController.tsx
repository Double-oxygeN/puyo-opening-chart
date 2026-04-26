import type { PairState } from '../domain/pair'
import { useKeyboardInput } from '../hooks/useKeyboardInput'
import { Rotation } from '../domain/pair'
import { PUYO_BG_CLASSES } from '../domain/color'

const ROTATION_LABELS: Record<Rotation, string> = {
  [Rotation.Up]: '↑',
  [Rotation.Right]: '→',
  [Rotation.Down]: '↓',
  [Rotation.Left]: '←',
}

interface PairControllerProps {
  pairState: PairState
  onUpdatePairState: (state: PairState) => void
  onPlace: () => void
}

export default function PairController({
  pairState,
  onUpdatePairState,
  onPlace,
}: PairControllerProps) {
  useKeyboardInput({
    pairState,
    onUpdatePairState,
    onPlace,
  })

  const axisBg = PUYO_BG_CLASSES[pairState.pair.axis]
  const childBg = PUYO_BG_CLASSES[pairState.pair.child]

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm text-gray-600">
        列: {pairState.col + 1} / 回転: {ROTATION_LABELS[pairState.rotation]}
      </div>

      {/* 組ぷよプレビュー */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">軸</span>
        <div className={`w-6 h-6 rounded-full ${axisBg}`} />
        <span className="text-xs text-gray-500">子</span>
        <div className={`w-6 h-6 rounded-full ${childBg}`} />
      </div>

      {/* キー操作ガイド */}
      <div className="text-xs text-gray-400 text-center leading-relaxed">
        {'←→: 移動 / Z: 左回転 / X: 右回転'}
        <br />
        ↓/Enter: 設置
      </div>
    </div>
  )
}
