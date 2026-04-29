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
  onGoBack?: () => void
  enabled?: boolean
}

export function useKeyboardInput({
  pairState,
  onUpdatePairState,
  onPlace,
  onGoBack,
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
        case 'b':
        case 'B':
          if (onGoBack) {
            e.preventDefault()
            onGoBack()
          }
          break
      }
    },
    [pairState, onUpdatePairState, onPlace, onGoBack, enabled],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
