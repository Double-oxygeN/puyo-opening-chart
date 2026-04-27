import { useState, useEffect, useRef, useCallback } from 'react'
import type { Difficulty } from '../domain/difficulty'
import { ALL_DIFFICULTIES, DIFFICULTY_LABELS } from '../domain/difficulty'

interface HeaderMenuProps {
  difficulty: Difficulty
  onChangeDifficulty: (difficulty: Difficulty) => void
  randomTsumo: boolean
  onToggleRandomTsumo: () => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
}

export default function HeaderMenu({
  difficulty,
  onChangeDifficulty,
  randomTsumo,
  onToggleRandomTsumo,
  onExport,
  onImport,
  onReset,
}: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleExport = useCallback(() => {
    setIsOpen(false)
    onExport()
  }, [onExport])

  const handleImport = useCallback(() => {
    setIsOpen(false)
    onImport()
  }, [onImport])

  const handleReset = useCallback(() => {
    setIsOpen(false)
    onReset()
  }, [onReset])

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded transition-colors cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        メニュー ▾
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-60">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 block mb-1.5">
              難易度
            </span>
            <div className="flex gap-1">
              {ALL_DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    if (d !== difficulty) {
                      onChangeDifficulty(d)
                      setIsOpen(false)
                    }
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
                    d === difficulty
                      ? 'bg-blue-500 text-white font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              ランダムツモ
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={randomTsumo}
              onClick={onToggleRandomTsumo}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                randomTsumo ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform mt-0.5 ${
                  randomTsumo ? 'translate-x-4 ml-0.5' : 'translate-x-0 ml-0.5'
                }`}
              />
            </button>
          </div>
          <button
            onClick={handleExport}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer rounded-t-lg"
          >
            エクスポート
          </button>
          <button
            onClick={handleImport}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            インポート
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={handleReset}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer rounded-b-lg"
          >
            リセット
          </button>
        </div>
      )}
    </div>
  )
}
