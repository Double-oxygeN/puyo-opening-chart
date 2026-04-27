import type { FilledColor } from '../domain/color'
import type { PuyoPair } from '../domain/pair'
import { COLOR_LABELS, PUYO_BG_CLASSES } from '../domain/color'

interface PairSelectorProps {
  pair: PuyoPair
  availableColors: readonly FilledColor[]
  onChangePair: (pair: PuyoPair) => void
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

export default function PairSelector({
  pair,
  availableColors,
  onChangePair,
}: PairSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-1">
          軸ぷよ
        </span>
        <div className="flex gap-2">
          {availableColors.map((color) => (
            <ColorButton
              key={color}
              color={color}
              selected={pair.axis === color}
              onClick={() => onChangePair({ ...pair, axis: color })}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm font-medium text-gray-700 block mb-1">
          子ぷよ
        </span>
        <div className="flex gap-2">
          {availableColors.map((color) => (
            <ColorButton
              key={color}
              color={color}
              selected={pair.child === color}
              onClick={() => onChangePair({ ...pair, child: color })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
