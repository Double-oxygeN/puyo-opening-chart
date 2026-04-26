import { useState, useCallback } from 'react'
import type { PuyoPair } from '../domain/pair'
import { PUYO_BG_CLASSES } from '../domain/color'
import PairEditMenu from './PairEditMenu'

interface PairSlotProps {
  /** スロットのラベル（"ツモ", "ネクスト" 等） */
  label: string
  /** 表示する組ぷよ（null = 未設定） */
  pair: PuyoPair | null
  /** 色変更時のコールバック */
  onChangePair: (pair: PuyoPair) => void
  /** 空にするコールバック（ツモでは不要） */
  onClear?: () => void
  /** 編集可能かどうか */
  editable?: boolean
  /** 無効状態（ネクスト未設定時のネクネク等） */
  disabled?: boolean
}

export default function PairSlot({
  label,
  pair,
  onChangePair,
  onClear,
  editable = true,
  disabled = false,
}: PairSlotProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleClick = useCallback(() => {
    if (editable && !disabled) {
      setIsMenuOpen((prev) => !prev)
    }
  }, [editable, disabled])

  const handleConfirm = useCallback(
    (newPair: PuyoPair) => {
      onChangePair(newPair)
      setIsMenuOpen(false)
    },
    [onChangePair],
  )

  const handleClear = useCallback(() => {
    onClear?.()
    setIsMenuOpen(false)
  }, [onClear])

  const handleCancel = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  const isEmpty = pair === null
  const isInteractive = editable && !disabled

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          disabled={!isInteractive}
          className={`w-12 h-12 rounded-md border-2 ${
            disabled
              ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-40'
              : isInteractive
                ? isEmpty
                  ? 'border-dashed border-gray-300 hover:border-gray-400 cursor-pointer'
                  : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                : 'border-gray-200 cursor-not-allowed'
          } bg-white flex flex-col items-center justify-center gap-0.5 transition-colors`}
          aria-label={`${label}の組ぷよを編集`}
        >
          {isEmpty ? (
            <span className="text-gray-300 text-lg">＋</span>
          ) : (
            <>
              {/* 子ぷよ（上） */}
              <div
                className={`w-4 h-4 rounded-full ${PUYO_BG_CLASSES[pair.child]}`}
              />
              {/* 軸ぷよ（下） */}
              <div
                className={`w-4 h-4 rounded-full ${PUYO_BG_CLASSES[pair.axis]}`}
              />
            </>
          )}
        </button>
        {isMenuOpen && (
          <PairEditMenu
            pair={pair}
            onConfirm={handleConfirm}
            onClear={onClear ? handleClear : undefined}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}
