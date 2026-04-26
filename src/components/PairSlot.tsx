import { useState, useCallback } from 'react'
import type { PuyoPair } from '../domain/pair'
import { PUYO_BG_CLASSES } from '../domain/color'
import PairEditMenu from './PairEditMenu'

interface PairSlotProps {
  /** スロットのラベル（"ツモ", "ネクスト" 等） */
  label: string
  /** 表示する組ぷよ */
  pair: PuyoPair
  /** 色変更時のコールバック */
  onChangePair: (pair: PuyoPair) => void
  /** 編集可能かどうか */
  editable?: boolean
}

export default function PairSlot({
  label,
  pair,
  onChangePair,
  editable = true,
}: PairSlotProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleClick = useCallback(() => {
    if (editable) {
      setIsMenuOpen((prev) => !prev)
    }
  }, [editable])

  const handleConfirm = useCallback(
    (newPair: PuyoPair) => {
      onChangePair(newPair)
      setIsMenuOpen(false)
    },
    [onChangePair],
  )

  const handleCancel = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  const axisBg = PUYO_BG_CLASSES[pair.axis]
  const childBg = PUYO_BG_CLASSES[pair.child]

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          disabled={!editable}
          className={`w-12 h-12 rounded-md border-2 ${
            editable
              ? 'border-gray-300 hover:border-gray-400 cursor-pointer'
              : 'border-gray-200 cursor-default'
          } bg-white flex flex-col items-center justify-center gap-0.5 transition-colors`}
          aria-label={`${label}の組ぷよを編集`}
        >
          {/* 子ぷよ（上） */}
          <div className={`w-4 h-4 rounded-full ${childBg}`} />
          {/* 軸ぷよ（下） */}
          <div className={`w-4 h-4 rounded-full ${axisBg}`} />
        </button>
        {isMenuOpen && (
          <PairEditMenu
            pair={pair}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}
