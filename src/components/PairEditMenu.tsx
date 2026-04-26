import { useState } from 'react'
import type { FilledColor } from '../domain/color'
import type { PuyoPair } from '../domain/pair'
import { FILLED_COLORS, COLOR_LABELS, PUYO_BG_CLASSES } from '../domain/color'

interface PairEditMenuProps {
  pair: PuyoPair
  onConfirm: (pair: PuyoPair) => void
  onCancel: () => void
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
  onConfirm,
  onCancel,
}: PairEditMenuProps) {
  const [draft, setDraft] = useState<PuyoPair>(pair)

  return (
    <div className="absolute top-full right-0 mt-2 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex flex-col gap-3">
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-1">
          子ぷよ
        </span>
        <div className="flex gap-2">
          {FILLED_COLORS.map((color) => (
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
          {FILLED_COLORS.map((color) => (
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
