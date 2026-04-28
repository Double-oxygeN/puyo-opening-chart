import { useState, useCallback, useMemo } from 'react'
import { PuyoColor } from '../domain/color'
import type { FilledColor } from '../domain/color'
import type { PuyoPair, PairState } from '../domain/pair'
import { createInitialPairState, generateRandomPair } from '../domain/pair'
import type { GraphNode } from '../domain/graph'
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
  changePair: (pair: PuyoPair) => void
  changeNext: (next: PuyoPair) => void
  changeNextNext: (nextNext: PuyoPair) => void
  clearNext: () => void
  clearNextNext: () => void
  toggleRandomTsumo: () => void
  place: () => void
  resetForNode: (node: GraphNode | undefined) => void
  resetForDifficulty: (newDifficulty: Difficulty) => void
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

  const place = useCallback(() => {
    const success = placeAndAddNode(
      pairState,
      effectiveNext ?? undefined,
      nextNext ?? undefined,
    )
    if (success) {
      if (effectiveNext) {
        setPairState(createInitialPairState(effectiveNext))
        if (nextNext) {
          setNext(nextNext)
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
    }
  }, [
    placeAndAddNode,
    pairState,
    effectivePair,
    effectiveNext,
    nextNext,
    randomTsumo,
    availableColors,
  ])

  const resetForNode = useCallback(
    (node: GraphNode | undefined) => {
      const constraint = node?.constraint
      if (constraint?.currentPair) {
        setPairState(createInitialPairState(constraint.currentPair))
        if (constraint.nextPair) {
          setNext(constraint.nextPair)
        } else {
          setNext(null)
        }
      } else {
        setPairState(createInitialPairState(pairState.pair))
        setNext(null)
      }
      setNextNext(null)
    },
    [pairState.pair],
  )

  const resetForDifficulty = useCallback((_newDifficulty: Difficulty) => {
    const newColors = getAvailableColors(_newDifficulty)
    const defaultColor = newColors[0]
    setPairState(
      createInitialPairState({ axis: defaultColor, child: defaultColor }),
    )
    setNext(null)
    setNextNext(null)
  }, [])

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
    changePair,
    changeNext,
    changeNextNext,
    clearNext,
    clearNextNext,
    toggleRandomTsumo,
    place,
    resetForNode,
    resetForDifficulty,
  }
}
