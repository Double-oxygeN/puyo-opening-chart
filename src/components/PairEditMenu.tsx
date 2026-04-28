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

import { useState } from 'react'
import type { FilledColor } from '../domain/color'
import type { PuyoPair } from '../domain/pair'
import { PuyoColor, COLOR_LABELS, PUYO_BG_CLASSES } from '../domain/color'

interface PairEditMenuProps {
  /** 現在の組ぷよ（null = 未設定、新規設定時のデフォルトを使う） */
  pair: PuyoPair | null
  /** 選択可能な色の配列 */
  availableColors: readonly FilledColor[]
  onConfirm: (pair: PuyoPair) => void
  /** クリアコールバック（設定されている場合のみ「クリア」ボタンを表示） */
  onClear?: () => void
  onCancel: () => void
}

const DEFAULT_PAIR: PuyoPair = {
  axis: PuyoColor.Red,
  child: PuyoColor.Red,
}

function ColorButton({
  color,
  selected,
  onClick,
}: {
  color: FilledColor
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-8 h-8 rounded-full ${PUYO_BG_CLASSES[color]} ${
        selected ? 'ring-2 ring-offset-2 ring-gray-800' : ''
      } transition-all hover:scale-110`}
      aria-label={COLOR_LABELS[color]}
      aria-pressed={selected}
    />
  )
}

export default function PairEditMenu({
  pair,
  availableColors,
  onConfirm,
  onClear,
  onCancel,
}: PairEditMenuProps) {
  const [draft, setDraft] = useState<PuyoPair>(pair ?? DEFAULT_PAIR)

  return (
    <div className="absolute top-full right-0 mt-2 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex flex-col gap-3 min-w-max">
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-1">
          子ぷよ
        </span>
        <div className="flex gap-2">
          {availableColors.map((color) => (
            <ColorButton
              key={color}
              color={color}
              selected={draft.child === color}
              onClick={() => setDraft({ ...draft, child: color })}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-1">
          軸ぷよ
        </span>
        <div className="flex gap-2">
          {availableColors.map((color) => (
            <ColorButton
              key={color}
              color={color}
              selected={draft.axis === color}
              onClick={() => setDraft({ ...draft, axis: color })}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 rounded border border-red-300 hover:bg-red-50 mr-auto"
          >
            クリア
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded border border-gray-300 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => onConfirm(draft)}
          className="px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded"
        >
          確定
        </button>
      </div>
    </div>
  )
}
