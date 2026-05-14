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

/** ゲームパッドボタンの共通スタイル（半透明） */
const btnClass =
  'flex items-center justify-center w-12 h-12 rounded-xl bg-white/50 hover:bg-white/70 active:bg-white/80 text-xl font-bold select-none touch-none cursor-pointer border border-gray-300/60 backdrop-blur-sm transition-colors'

/** 空白セルのスタイル */
const spacerClass = 'w-12 h-12'

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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 flex justify-center pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        {/* 左ブロック: 十字ボタン */}
        <div className="grid grid-cols-3 gap-1">
          {/* 上段: 1手戻す（上方向） */}
          <div className={spacerClass} />
          <button
            type="button"
            aria-label="1手戻す"
            className={btnClass}
            onPointerDown={handlePointerDown(() => onGoBack?.())}
          >
            ↑
          </button>
          <div className={spacerClass} />

          {/* 中段: 左右移動 */}
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
          <div className={spacerClass} />
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

          {/* 下段: 設置（下方向） */}
          <div className={spacerClass} />
          <button
            type="button"
            aria-label="設置"
            className={btnClass}
            onPointerDown={handlePointerDown(onPlace)}
          >
            ↓
          </button>
          <div className={spacerClass} />
        </div>

        {/* 右ブロック: 回転ボタン（右・下のみ、上・左は非表示） */}
        <div className="grid grid-cols-2 gap-1">
          {/* 上段: (左は非表示) 右回転（右方向） */}
          <div className={spacerClass} />
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

          {/* 下段: 左回転（下方向）、右は非表示 */}
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
          <div className={spacerClass} />
        </div>
      </div>
    </div>
  )
}
