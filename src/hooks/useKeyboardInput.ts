import { useEffect, useCallback } from 'react'
import type { PairState } from '../domain/pair'
import {
  moveLeft,
  moveRight,
  rotateClockwise,
  rotateCounterClockwise,
} from '../domain/pair'

interface UseKeyboardInputOptions {
  pairState: PairState
  onUpdatePairState: (state: PairState) => void
  onPlace: () => void
  enabled?: boolean
}

export function useKeyboardInput({
  pairState,
  onUpdatePairState,
  onPlace,
  enabled = true,
}: UseKeyboardInputOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onUpdatePairState(moveLeft(pairState))
          break
        case 'ArrowRight':
          e.preventDefault()
          onUpdatePairState(moveRight(pairState))
          break
        case 'z':
        case 'Z':
          e.preventDefault()
          onUpdatePairState(rotateCounterClockwise(pairState))
          break
        case 'x':
        case 'X':
          e.preventDefault()
          onUpdatePairState(rotateClockwise(pairState))
          break
        case 'ArrowDown':
        case 'Enter':
          e.preventDefault()
          onPlace()
          break
      }
    },
    [pairState, onUpdatePairState, onPlace, enabled],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
