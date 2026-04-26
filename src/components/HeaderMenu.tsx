import { useState, useEffect, useRef, useCallback } from 'react'

interface HeaderMenuProps {
  onExport: () => void
  onImport: () => void
  onReset: () => void
}

export default function HeaderMenu({
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
