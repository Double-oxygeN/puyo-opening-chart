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

import { describe, it, expect } from 'vitest'
import {
  createInitialPairState,
  moveLeft,
  moveRight,
  rotateClockwise,
  rotateCounterClockwise,
  placePair,
  getDropPreview,
  generateRandomPair,
  Rotation,
  INITIAL_COL,
} from './pair'
import { PuyoColor, FILLED_COLORS } from './color'
import type { FilledColor } from './color'
import {
  createEmptyBoard,
  getCell,
  setCell,
  boardsEqual,
  BOARD_COLS,
} from './board'

const RED_BLUE = { axis: PuyoColor.Red, child: PuyoColor.Blue } as const

describe('createInitialPairState', () => {
  it('creates state at column 2 with rotation Up', () => {
    const state = createInitialPairState(RED_BLUE)
    expect(state.col).toBe(INITIAL_COL)
    expect(state.rotation).toBe(Rotation.Up)
    expect(state.pair).toEqual(RED_BLUE)
  })
})

describe('moveLeft / moveRight', () => {
  it('moves left', () => {
    const state = createInitialPairState(RED_BLUE)
    const moved = moveLeft(state)
    expect(moved.col).toBe(INITIAL_COL - 1)
  })

  it('moves right', () => {
    const state = createInitialPairState(RED_BLUE)
    const moved = moveRight(state)
    expect(moved.col).toBe(INITIAL_COL + 1)
  })

  it('does not move past left wall', () => {
    let state = createInitialPairState(RED_BLUE)
    // Move all the way left
    for (let i = 0; i < BOARD_COLS; i++) {
      state = moveLeft(state)
    }
    // Should be at column 0 (with child above, so col 0 is valid)
    expect(state.col).toBe(0)
    // One more should not change
    const same = moveLeft(state)
    expect(same.col).toBe(0)
  })

  it('does not move past right wall', () => {
    let state = createInitialPairState(RED_BLUE)
    for (let i = 0; i < BOARD_COLS; i++) {
      state = moveRight(state)
    }
    expect(state.col).toBe(BOARD_COLS - 1)
    const same = moveRight(state)
    expect(same.col).toBe(BOARD_COLS - 1)
  })

  it('does not move right when child is on the right and at wall', () => {
    let state = createInitialPairState(RED_BLUE)
    state = rotateClockwise(state) // child to the right
    // Move to rightmost valid position
    for (let i = 0; i < BOARD_COLS; i++) {
      state = moveRight(state)
    }
    expect(state.col).toBe(BOARD_COLS - 2) // axis at 4 (0-indexed), child at 5
  })
})

describe('rotateClockwise / rotateCounterClockwise', () => {
  it('cycles through rotations clockwise', () => {
    let state = createInitialPairState(RED_BLUE)
    expect(state.rotation).toBe(Rotation.Up)

    state = rotateClockwise(state)
    expect(state.rotation).toBe(Rotation.Right)

    state = rotateClockwise(state)
    expect(state.rotation).toBe(Rotation.Down)

    state = rotateClockwise(state)
    expect(state.rotation).toBe(Rotation.Left)

    state = rotateClockwise(state)
    expect(state.rotation).toBe(Rotation.Up)
  })

  it('cycles counterclockwise', () => {
    let state = createInitialPairState(RED_BLUE)
    state = rotateCounterClockwise(state)
    expect(state.rotation).toBe(Rotation.Left)
  })

  it('wall kicks when rotating into left wall', () => {
    let state = createInitialPairState(RED_BLUE)
    state = { ...state, col: 0, rotation: Rotation.Up }

    // Rotating CCW: Up → Left, child goes to col -1 → wall kick pushes right
    const rotated = rotateCounterClockwise(state)
    expect(rotated.rotation).toBe(Rotation.Left)
    expect(rotated.col).toBe(1) // kicked right
  })

  it('wall kicks when rotating into right wall', () => {
    let state = createInitialPairState(RED_BLUE)
    state = { ...state, col: BOARD_COLS - 1, rotation: Rotation.Up }

    // Rotating CW: Up → Right, child goes to col 6 → wall kick pushes left
    const rotated = rotateClockwise(state)
    expect(rotated.rotation).toBe(Rotation.Right)
    expect(rotated.col).toBe(BOARD_COLS - 2) // kicked left
  })
})

describe('placePair', () => {
  it('places a vertical pair on empty board', () => {
    const board = createEmptyBoard()
    const state = createInitialPairState(RED_BLUE) // col=2, rotation=Up

    const result = placePair(board, state)
    expect(result).not.toBeNull()

    // axis (Red) at row 0, child (Blue) at row 1
    expect(getCell(result!.board, 0, 2)).toBe(PuyoColor.Red)
    expect(getCell(result!.board, 1, 2)).toBe(PuyoColor.Blue)
  })

  it('places on top of existing puyos', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 2, PuyoColor.Green)

    const state = createInitialPairState(RED_BLUE)
    const result = placePair(board, state)
    expect(result).not.toBeNull()

    expect(getCell(result!.board, 0, 2)).toBe(PuyoColor.Green) // existing
    expect(getCell(result!.board, 1, 2)).toBe(PuyoColor.Red) // axis
    expect(getCell(result!.board, 2, 2)).toBe(PuyoColor.Blue) // child
  })

  it('places horizontal pair in separate columns', () => {
    const board = createEmptyBoard()
    let state = createInitialPairState(RED_BLUE)
    state = rotateClockwise(state) // child to the right (col 3)

    const result = placePair(board, state)
    expect(result).not.toBeNull()

    expect(getCell(result!.board, 0, 2)).toBe(PuyoColor.Red) // axis at col 2
    expect(getCell(result!.board, 0, 3)).toBe(PuyoColor.Blue) // child at col 3
  })

  it('handles chigiiri (different heights)', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 2, PuyoColor.Green) // col 2 has 1 puyo

    let state = createInitialPairState(RED_BLUE)
    state = rotateClockwise(state) // child to right (col 3)

    const result = placePair(board, state)
    expect(result).not.toBeNull()

    // axis drops to row 1 (on top of Green), child drops to row 0
    expect(getCell(result!.board, 1, 2)).toBe(PuyoColor.Red)
    expect(getCell(result!.board, 0, 3)).toBe(PuyoColor.Blue)
  })

  it('places pair with child below (rotation Down)', () => {
    const board = createEmptyBoard()
    let state = createInitialPairState(RED_BLUE)
    state = { ...state, rotation: Rotation.Down }

    const result = placePair(board, state)
    expect(result).not.toBeNull()

    // child (Blue) below, axis (Red) above
    expect(getCell(result!.board, 0, 2)).toBe(PuyoColor.Blue) // child first
    expect(getCell(result!.board, 1, 2)).toBe(PuyoColor.Red) // axis on top
  })

  it('returns null when column is full', () => {
    let board = createEmptyBoard()
    for (let row = 0; row < 13; row++) {
      board = setCell(board, row, 2, PuyoColor.Green)
    }

    const state = createInitialPairState(RED_BLUE)
    expect(placePair(board, state)).toBeNull()
  })

  it('resolves chains after placement (4 connected → elimination)', () => {
    let board = createEmptyBoard()
    // col2 に赤2つ積んでおく
    board = setCell(board, 0, 2, PuyoColor.Red)
    board = setCell(board, 1, 2, PuyoColor.Red)

    // 赤赤の縦ペアを配置 → 赤4連結 → 消去
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    const state = createInitialPairState(pair) // col=2, Up
    const result = placePair(board, state)
    expect(result).not.toBeNull()
    // 赤4つが消えて空盤面になる
    expect(boardsEqual(result!.board, createEmptyBoard())).toBe(true)
  })

  it('resolves multi-chain after placement', () => {
    let board = createEmptyBoard()
    // row0: col0-2に青, row1: col0-2に赤
    board = setCell(board, 0, 0, PuyoColor.Blue)
    board = setCell(board, 0, 1, PuyoColor.Blue)
    board = setCell(board, 0, 2, PuyoColor.Blue)
    board = setCell(board, 1, 0, PuyoColor.Red)
    board = setCell(board, 1, 1, PuyoColor.Red)
    board = setCell(board, 1, 2, PuyoColor.Red)

    // 赤赤ペアをcol3に縦置き（赤が下、赤が上）
    const pair = { axis: PuyoColor.Red, child: PuyoColor.Red }
    const state = { pair, col: 3, rotation: Rotation.Up }
    const result = placePair(board, state)
    expect(result).not.toBeNull()

    // 配置後: row0: B,B,B,R(axis) row1: R,R,R,R(child) → 赤5連結消去
    // 落下後: row0: B,B,B,_ → 青3つだけ残る

    expect(getCell(result!.board, 0, 0)).toBe(PuyoColor.Blue)
    expect(getCell(result!.board, 0, 1)).toBe(PuyoColor.Blue)
    expect(getCell(result!.board, 0, 2)).toBe(PuyoColor.Blue)
    expect(getCell(result!.board, 0, 3)).toBe(PuyoColor.Empty)
    expect(getCell(result!.board, 1, 0)).toBe(PuyoColor.Empty)
    expect(getCell(result!.board, 1, 1)).toBe(PuyoColor.Empty)
    expect(getCell(result!.board, 1, 2)).toBe(PuyoColor.Empty)
    expect(getCell(result!.board, 1, 3)).toBe(PuyoColor.Empty)
  })
})

describe('getDropPreview', () => {
  it('returns preview positions for vertical pair', () => {
    const board = createEmptyBoard()
    const state = createInitialPairState(RED_BLUE)

    const preview = getDropPreview(board, state)
    expect(preview).not.toBeNull()
    expect(preview!.axis).toEqual({ row: 0, col: 2 })
    expect(preview!.child).toEqual({ row: 1, col: 2 })
  })

  it('returns preview for horizontal pair', () => {
    const board = createEmptyBoard()
    let state = createInitialPairState(RED_BLUE)
    state = rotateClockwise(state)

    const preview = getDropPreview(board, state)
    expect(preview).not.toBeNull()
    expect(preview!.axis).toEqual({ row: 0, col: 2 })
    expect(preview!.child).toEqual({ row: 0, col: 3 })
  })
})

describe('generateRandomPair', () => {
  it('generates a pair with colors from availableColors', () => {
    const colors: readonly FilledColor[] = [PuyoColor.Red, PuyoColor.Green]
    for (let i = 0; i < 50; i++) {
      const pair = generateRandomPair(colors)
      expect(colors).toContain(pair.axis)
      expect(colors).toContain(pair.child)
    }
  })

  it('works with a single color', () => {
    const colors: readonly FilledColor[] = [PuyoColor.Blue]
    const pair = generateRandomPair(colors)
    expect(pair.axis).toBe(PuyoColor.Blue)
    expect(pair.child).toBe(PuyoColor.Blue)
  })

  it('can generate different combinations with all 5 colors', () => {
    const seenAxis = new Set<FilledColor>()
    const seenChild = new Set<FilledColor>()
    for (let i = 0; i < 200; i++) {
      const pair = generateRandomPair(FILLED_COLORS)
      seenAxis.add(pair.axis)
      seenChild.add(pair.child)
    }
    // 200回試行で全5色が出ないのは極めてまれ
    expect(seenAxis.size).toBe(5)
    expect(seenChild.size).toBe(5)
  })
})
