import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  getDropRow,
  getCell,
  setCell,
  boardsEqual,
  compactBoard,
  expandBoard,
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

describe('boardsEqual', () => {
  it('returns true for two empty boards', () => {
    expect(boardsEqual(createEmptyBoard(), createEmptyBoard())).toBe(true)
  })

  it('returns true for identical non-empty boards', () => {
    const a = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const b = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    expect(boardsEqual(a, b)).toBe(true)
  })

  it('returns false when cells differ', () => {
    const a = setCell(createEmptyBoard(), 0, 0, PuyoColor.Red)
    const b = setCell(createEmptyBoard(), 0, 0, PuyoColor.Blue)
    expect(boardsEqual(a, b)).toBe(false)
  })

  it('returns false when one board has an extra puyo', () => {
    const a = createEmptyBoard()
    const b = setCell(createEmptyBoard(), 0, 0, PuyoColor.Green)
    expect(boardsEqual(a, b)).toBe(false)
  })
})

describe('compactBoard / expandBoard', () => {
  it('compacts an empty board to zero rows', () => {
    const board = createEmptyBoard()
    const compact = compactBoard(board)
    expect(compact).toHaveLength(0)
  })

  it('compacts a board with puyos on row 0 to 1 row', () => {
    const board = setCell(createEmptyBoard(), 0, 2, PuyoColor.Red)
    const compact = compactBoard(board)
    expect(compact).toHaveLength(1)
    expect(compact[0][2]).toBe(PuyoColor.Red)
  })

  it('compacts a board with puyos on rows 0-2 to 3 rows', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Red)
    board = setCell(board, 1, 0, PuyoColor.Green)
    board = setCell(board, 2, 0, PuyoColor.Blue)
    const compact = compactBoard(board)
    expect(compact).toHaveLength(3)
  })

  it('round-trips through compact and expand', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Red)
    board = setCell(board, 1, 0, PuyoColor.Green)

    const expanded = expandBoard(compactBoard(board))
    expect(boardsEqual(board, expanded)).toBe(true)
  })

  it('round-trips an empty board', () => {
    const board = createEmptyBoard()
    const expanded = expandBoard(compactBoard(board))
    expect(boardsEqual(board, expanded)).toBe(true)
  })
})
