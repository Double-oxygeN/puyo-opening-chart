import type { PairState } from '../domain/pair'
import { useKeyboardInput } from '../hooks/useKeyboardInput'

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

  return (
    <div className="flex flex-col items-center gap-2">
      {/* キー操作ガイド */}
      <div className="text-xs text-gray-400 text-center leading-relaxed">
        {'←→: 移動 / Z: 左回転 / X: 右回転'}
        <br />
        ↓/Enter: 設置
      </div>
    </div>
  )
}
