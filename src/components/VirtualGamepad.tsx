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

import type { PairState } from '../domain/pair'
import {
  moveLeft,
  moveRight,
  rotateClockwise,
  rotateCounterClockwise,
} from '../domain/pair'

interface VirtualGamepadProps {
  pairState: PairState
  onUpdatePairState: (state: PairState) => void
  onPlace: () => void
  onGoBack?: () => void
}

/** ゲームパッドボタンの共通スタイル */
const btnClass =
  'flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-xl font-bold select-none touch-none cursor-pointer border border-gray-300 transition-colors'

export default function VirtualGamepad({
  pairState,
  onUpdatePairState,
  onPlace,
  onGoBack,
}: VirtualGamepadProps) {
  const handlePointerDown = (action: () => void) => (e: React.PointerEvent) => {
    e.preventDefault()
    action()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-gray-200 p-3 flex flex-col items-center gap-2">
      {/* 回転・移動・設置ボタン */}
      <div className="flex gap-3">
        {/* 左回転 */}
        <button
          type="button"
          aria-label="左回転"
          className={btnClass}
          onPointerDown={handlePointerDown(() =>
            onUpdatePairState(rotateCounterClockwise(pairState)),
          )}
        >
          ↺
        </button>

        {/* 左移動 */}
        <button
          type="button"
          aria-label="左移動"
          className={btnClass}
          onPointerDown={handlePointerDown(() =>
            onUpdatePairState(moveLeft(pairState)),
          )}
        >
          ←
        </button>

        {/* 設置 */}
        <button
          type="button"
          aria-label="設置"
          className={btnClass}
          onPointerDown={handlePointerDown(onPlace)}
        >
          ↓
        </button>

        {/* 右移動 */}
        <button
          type="button"
          aria-label="右移動"
          className={btnClass}
          onPointerDown={handlePointerDown(() =>
            onUpdatePairState(moveRight(pairState)),
          )}
        >
          →
        </button>

        {/* 右回転 */}
        <button
          type="button"
          aria-label="右回転"
          className={btnClass}
          onPointerDown={handlePointerDown(() =>
            onUpdatePairState(rotateClockwise(pairState)),
          )}
        >
          ↻
        </button>
      </div>

      {/* 1手戻すボタン */}
      {onGoBack && (
        <button
          type="button"
          aria-label="1手戻す"
          className="px-6 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-sm font-medium select-none touch-none cursor-pointer border border-gray-300 transition-colors"
          onPointerDown={handlePointerDown(onGoBack)}
        >
          1手戻す
        </button>
      )}
    </div>
  )
}
