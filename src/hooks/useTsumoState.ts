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

import { useState, useCallback, useMemo } from 'react'
import { PuyoColor } from '../domain/color'
import type { FilledColor } from '../domain/color'
import type { PuyoPair, PairState } from '../domain/pair'
import { createInitialPairState, generateRandomPair } from '../domain/pair'
import type { GraphNode, TsumoConstraint } from '../domain/graph'
import type { Difficulty } from '../domain/difficulty'
import { getAvailableColors } from '../domain/difficulty'

const DEFAULT_PAIR: PuyoPair = {
  axis: PuyoColor.Red,
  child: PuyoColor.Red,
}

interface UseTsumoStateOptions {
  selectedNode: GraphNode | undefined
  difficulty: Difficulty
  placeAndAddNode: (
    pairState: PairState,
    next?: PuyoPair,
    nextNext?: PuyoPair,
  ) => boolean
}

export interface TsumoState {
  pairState: PairState
  setPairState: (state: PairState) => void
  effectivePair: PuyoPair
  effectiveNext: PuyoPair | null
  next: PuyoPair | null
  nextNext: PuyoPair | null
  availableColors: readonly FilledColor[]
  lockedPair: PuyoPair | null
  lockedNext: PuyoPair | null
  randomTsumo: boolean
  randomNext: boolean
  changePair: (pair: PuyoPair) => void
  changeNext: (next: PuyoPair) => void
  changeNextNext: (nextNext: PuyoPair) => void
  clearNext: () => void
  clearNextNext: () => void
  toggleRandomTsumo: () => void
  toggleRandomNext: () => void
  place: () => void
  resetForNode: (node: GraphNode | undefined) => void
  resetForDifficulty: (newDifficulty: Difficulty) => void
  goBackToParent: (
    parentNode: GraphNode | undefined,
    childConstraint: TsumoConstraint | undefined,
  ) => void
}

export function useTsumoState({
  selectedNode,
  difficulty,
  placeAndAddNode,
}: UseTsumoStateOptions): TsumoState {
  const availableColors = useMemo(
    () => getAvailableColors(difficulty),
    [difficulty],
  )

  const [pairState, setPairState] = useState<PairState>(
    createInitialPairState(DEFAULT_PAIR),
  )
  const [next, setNext] = useState<PuyoPair | null>(null)
  const [nextNext, setNextNext] = useState<PuyoPair | null>(null)
  const [randomTsumo, setRandomTsumo] = useState(true)
  const [randomNext, setRandomNext] = useState(false)

  const lockedPair = selectedNode?.constraint?.currentPair ?? null
  const lockedNext = selectedNode?.constraint?.nextPair ?? null

  const effectivePair = lockedPair ?? pairState.pair
  const effectiveNext = lockedNext ?? next

  const changePair = useCallback(
    (newPair: PuyoPair) => {
      if (lockedPair) return
      setPairState(createInitialPairState(newPair))
    },
    [lockedPair],
  )

  const changeNext = useCallback(
    (newNext: PuyoPair) => {
      if (lockedNext) return
      setNext(newNext)
    },
    [lockedNext],
  )

  const changeNextNext = useCallback((newNextNext: PuyoPair) => {
    setNextNext(newNextNext)
  }, [])

  const clearNext = useCallback(() => {
    if (lockedNext) return
    setNext(null)
    setNextNext(null)
  }, [lockedNext])

  const clearNextNext = useCallback(() => {
    setNextNext(null)
  }, [])

  const toggleRandomTsumo = useCallback(() => {
    setRandomTsumo((prev) => !prev)
  }, [])

  /** ランダムネクストの状態を未確定枠に反映する */
  const applyRandomNext = useCallback(
    (
      isOn: boolean,
      currentLockedNext: PuyoPair | null,
      colors: readonly FilledColor[],
    ) => {
      if (isOn) {
        if (!currentLockedNext) {
          setNext(generateRandomPair(colors))
        }
        setNextNext(generateRandomPair(colors))
      } else {
        if (!currentLockedNext) {
          setNext(null)
        }
        setNextNext(null)
      }
    },
    [],
  )

  const toggleRandomNext = useCallback(() => {
    const newValue = !randomNext
    setRandomNext(newValue)
    applyRandomNext(newValue, lockedNext, availableColors)
  }, [randomNext, lockedNext, availableColors, applyRandomNext])

  const place = useCallback(() => {
    const success = placeAndAddNode(
      pairState,
      effectiveNext ?? undefined,
      nextNext ?? undefined,
    )
    if (success) {
      let nextAfterAdvance: PuyoPair | null = null
      if (effectiveNext) {
        setPairState(createInitialPairState(effectiveNext))
        if (nextNext) {
          setNext(nextNext)
          nextAfterAdvance = nextNext
        } else {
          setNext(null)
        }
        setNextNext(null)
      } else if (randomTsumo) {
        const randomPair = generateRandomPair(availableColors)
        setPairState(createInitialPairState(randomPair))
      } else {
        setPairState(createInitialPairState(effectivePair))
      }

      // ランダムネクスト: 配置後の未確定枠をランダムに設定
      if (randomNext) {
        if (nextAfterAdvance === null) {
          setNext(generateRandomPair(availableColors))
        }
        setNextNext(generateRandomPair(availableColors))
      }
    }
  }, [
    placeAndAddNode,
    pairState,
    effectivePair,
    effectiveNext,
    nextNext,
    randomTsumo,
    randomNext,
    availableColors,
  ])

  const resetForNode = useCallback(
    (node: GraphNode | undefined) => {
      const constraint = node?.constraint
      if (constraint?.currentPair) {
        setPairState(createInitialPairState(constraint.currentPair))
      } else {
        setPairState(createInitialPairState(pairState.pair))
      }
      if (constraint?.nextPair) {
        setNext(constraint.nextPair)
      }
      applyRandomNext(randomNext, constraint?.nextPair ?? null, availableColors)
    },
    [pairState.pair, randomNext, availableColors, applyRandomNext],
  )

  const resetForDifficulty = useCallback(
    (_newDifficulty: Difficulty) => {
      const newColors = getAvailableColors(_newDifficulty)
      const defaultColor = newColors[0]
      setPairState(
        createInitialPairState({ axis: defaultColor, child: defaultColor }),
      )
      applyRandomNext(randomNext, null, newColors)
    },
    [randomNext, applyRandomNext],
  )

  const goBackToParent = useCallback(
    (
      parentNode: GraphNode | undefined,
      childConstraint: TsumoConstraint | undefined,
    ) => {
      // 親ノードの確定配色でペアをリセット
      const parentConstraint = parentNode?.constraint
      if (parentConstraint?.currentPair) {
        setPairState(createInitialPairState(parentConstraint.currentPair))
      } else {
        setPairState(createInitialPairState(pairState.pair))
      }

      // 子ノードの確定ツモ → 親の未確定ネクストに設定
      // 親に確定ネクストがない場合のみ設定可能
      const newNext = childConstraint?.currentPair ?? null
      if (!parentConstraint?.nextPair) {
        setNext(newNext)
      }

      // 子ノードの確定ネクスト → 親の未確定ネクネクに設定
      const newNextNext = childConstraint?.nextPair ?? null
      setNextNext(newNextNext)

      // ランダムネクスト: 補完後の未確定枠をランダムに埋める
      if (randomNext) {
        if (!parentConstraint?.nextPair && !newNext) {
          setNext(generateRandomPair(availableColors))
        }
        if (!newNextNext) {
          setNextNext(generateRandomPair(availableColors))
        }
      }
    },
    [pairState.pair, randomNext, availableColors],
  )

  return {
    pairState,
    setPairState,
    effectivePair,
    effectiveNext,
    next,
    nextNext,
    availableColors,
    lockedPair,
    lockedNext,
    randomTsumo,
    randomNext,
    changePair,
    changeNext,
    changeNextNext,
    clearNext,
    clearNextNext,
    toggleRandomTsumo,
    toggleRandomNext,
    place,
    resetForNode,
    resetForDifficulty,
    goBackToParent,
  }
}
