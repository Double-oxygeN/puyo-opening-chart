import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  getDropRow,
  getCell,
  setCell,
  BOARD_COLS,
  BOARD_ROWS,
} from './board'
import { PuyoColor } from './color'

describe('createEmptyBoard', () => {
  it('creates a 13×6 board filled with Empty', () => {
    const board = createEmptyBoard()
    expect(board).toHaveLength(BOARD_ROWS)
    for (const row of board) {
      expect(row).toHaveLength(BOARD_COLS)
      for (const cell of row) {
        expect(cell).toBe(PuyoColor.Empty)
      }
    }
  })
})

describe('getCell / setCell', () => {
  it('returns Empty for a new board', () => {
    const board = createEmptyBoard()
    expect(getCell(board, 0, 0)).toBe(PuyoColor.Empty)
  })

  it('returns undefined for out-of-bounds', () => {
    const board = createEmptyBoard()
    expect(getCell(board, -1, 0)).toBeUndefined()
    expect(getCell(board, 0, -1)).toBeUndefined()
    expect(getCell(board, BOARD_ROWS, 0)).toBeUndefined()
    expect(getCell(board, 0, BOARD_COLS)).toBeUndefined()
  })

  it('sets a cell immutably', () => {
    const board = createEmptyBoard()
    const updated = setCell(board, 0, 0, PuyoColor.Red)

    expect(getCell(updated, 0, 0)).toBe(PuyoColor.Red)
    expect(getCell(board, 0, 0)).toBe(PuyoColor.Empty) // original unchanged
  })
})

describe('getDropRow', () => {
  it('returns 0 for an empty column', () => {
    const board = createEmptyBoard()
    expect(getDropRow(board, 0)).toBe(0)
  })

  it('returns the row above existing puyos', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 2, PuyoColor.Red)
    board = setCell(board, 1, 2, PuyoColor.Blue)
    expect(getDropRow(board, 2)).toBe(2)
  })

  it('returns -1 for a full column', () => {
    let board = createEmptyBoard()
    for (let row = 0; row < BOARD_ROWS; row++) {
      board = setCell(board, row, 0, PuyoColor.Green)
    }
    expect(getDropRow(board, 0)).toBe(-1)
  })
})
