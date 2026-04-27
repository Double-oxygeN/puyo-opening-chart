import { describe, it, expect } from 'vitest'
import {
  createEmptyBoard,
  getDropRow,
  getCell,
  setCell,
  boardsEqual,
  compactBoard,
  expandBoard,
  computeConnectivityMap,
  findConnectedGroups,
  eliminateGroups,
  applyGravity,
  resolveChains,
  isDead,
  BOARD_COLS,
  BOARD_ROWS,
  DEAD_COL,
  DEAD_ROW,
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

describe('computeConnectivityMap', () => {
  it('returns all false for an empty board', () => {
    const board = createEmptyBoard()
    const map = computeConnectivityMap(board)
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        expect(map[row][col]).toEqual({
          top: false,
          right: false,
          bottom: false,
          left: false,
        })
      }
    }
  })

  it('returns all false for a single isolated puyo', () => {
    const board = setCell(createEmptyBoard(), 3, 2, PuyoColor.Red)
    const map = computeConnectivityMap(board)
    expect(map[3][2]).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    })
  })

  it('connects two horizontally adjacent same-color puyos', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Green)
    board = setCell(board, 0, 1, PuyoColor.Green)
    const map = computeConnectivityMap(board)

    expect(map[0][0].right).toBe(true)
    expect(map[0][0].left).toBe(false)
    expect(map[0][1].left).toBe(true)
    expect(map[0][1].right).toBe(false)
  })

  it('connects two vertically adjacent same-color puyos', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Blue)
    board = setCell(board, 1, 0, PuyoColor.Blue)
    const map = computeConnectivityMap(board)

    expect(map[0][0].top).toBe(true)
    expect(map[0][0].bottom).toBe(false)
    expect(map[1][0].bottom).toBe(true)
    expect(map[1][0].top).toBe(false)
  })

  it('does not connect two adjacent different-color puyos', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Red)
    board = setCell(board, 0, 1, PuyoColor.Blue)
    const map = computeConnectivityMap(board)

    expect(map[0][0].right).toBe(false)
    expect(map[0][1].left).toBe(false)
  })

  it('computes correct connectivity for an L-shape', () => {
    let board = createEmptyBoard()
    // L字: row0: col0,col1 + row1: col0
    board = setCell(board, 0, 0, PuyoColor.Yellow)
    board = setCell(board, 0, 1, PuyoColor.Yellow)
    board = setCell(board, 1, 0, PuyoColor.Yellow)
    const map = computeConnectivityMap(board)

    // 左下 (row=0, col=0): 上=同色, 右=同色, 下=なし, 左=なし
    expect(map[0][0]).toEqual({
      top: true,
      right: true,
      bottom: false,
      left: false,
    })
    // 右下 (row=0, col=1): 上=なし, 右=なし, 下=なし, 左=同色
    expect(map[0][1]).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: true,
    })
    // 左上 (row=1, col=0): 上=なし, 右=なし, 下=同色, 左=なし
    expect(map[1][0]).toEqual({
      top: false,
      right: false,
      bottom: true,
      left: false,
    })
  })

  it('excludes row 12 (13段目) from connectivity', () => {
    let board = createEmptyBoard()
    board = setCell(board, 11, 0, PuyoColor.Red)
    board = setCell(board, 12, 0, PuyoColor.Red)
    const map = computeConnectivityMap(board)

    // 12段目は13段目と連結しない
    expect(map[11][0].top).toBe(false)
    // 13段目は常に連結なし
    expect(map[12][0]).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    })
  })

  it('excludes connectivity between cells within row 12 (13段目)', () => {
    let board = createEmptyBoard()
    board = setCell(board, 12, 0, PuyoColor.Red)
    board = setCell(board, 12, 1, PuyoColor.Red)
    const map = computeConnectivityMap(board)

    expect(map[12][0]).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    })
    expect(map[12][1]).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    })
  })

  it('does not connect empty cells even if adjacent', () => {
    // 空セルは隣接していても接続しない
    const board = createEmptyBoard()
    const map = computeConnectivityMap(board)
    expect(map[0][0]).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    })
  })
})

describe('findConnectedGroups', () => {
  it('detects all shapes of groups of 4', () => {
    const patterns = [
      // RRRR..
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
      // R.....
      // RRR...
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
      ],
      // .R....
      // RRR...
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 1],
      ],
      // ..R...
      // RRR...
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
      ],
      // RR....
      // RR....
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      // RR....
      // .RR...
      [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      // .RR...
      // RR....
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ],
      // RRR...
      // R.....
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      // RRR...
      // .R....
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      // RRR...
      // ..R...
      [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      // R.....
      // R.....
      // RR....
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 2],
      ],
      // .R....
      // .R....
      // RR....
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      // R.....
      // RR....
      // R.....
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 2],
      ],
      // R.....
      // RR....
      // .R....
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
      ],
      // .R....
      // RR....
      // R.....
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
      // .R....
      // RR....
      // .R....
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
      // RR....
      // R.....
      // R.....
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
      ],
      // RR....
      // .R....
      // .R....
      [
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2],
      ],
      // R.....
      // R.....
      // R.....
      // R.....
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    ]

    for (const pattern of patterns) {
      let board = createEmptyBoard()
      for (const [col, row] of pattern) {
        board = setCell(board, row, col, PuyoColor.Red)
      }
      const groups = findConnectedGroups(board)
      expect(groups).toHaveLength(1)
      expect(groups[0].color).toBe(PuyoColor.Red)
      expect(groups[0].cells).toHaveLength(4)
    }
  })

  it('does not detect a group of 3', () => {
    let board = createEmptyBoard()
    for (let col = 0; col < 3; col++) {
      board = setCell(board, 0, col, PuyoColor.Green)
    }
    const groups = findConnectedGroups(board)
    expect(groups).toHaveLength(0)
  })

  it('detects an L-shaped group of 5', () => {
    let board = createEmptyBoard()
    // L字: row0: col0,1,2 + row1: col0 + row2: col0
    board = setCell(board, 0, 0, PuyoColor.Yellow)
    board = setCell(board, 0, 1, PuyoColor.Yellow)
    board = setCell(board, 0, 2, PuyoColor.Yellow)
    board = setCell(board, 1, 0, PuyoColor.Yellow)
    board = setCell(board, 2, 0, PuyoColor.Yellow)
    const groups = findConnectedGroups(board)
    expect(groups).toHaveLength(1)
    expect(groups[0].cells).toHaveLength(5)
  })

  it('detects multiple groups simultaneously', () => {
    let board = createEmptyBoard()
    // 赤4つ (row0: col0-3)
    for (let col = 0; col < 4; col++) {
      board = setCell(board, 0, col, PuyoColor.Red)
    }
    // 青4つ (row2: col0-3)
    for (let col = 0; col < 4; col++) {
      board = setCell(board, 2, col, PuyoColor.Blue)
    }
    const groups = findConnectedGroups(board)
    expect(groups).toHaveLength(2)
  })

  it('excludes row 12 (13段目) from detection', () => {
    let board = createEmptyBoard()
    // 3つを11段目まで、1つを12段目(非表示行)に配置
    board = setCell(board, 9, 0, PuyoColor.Red)
    board = setCell(board, 10, 0, PuyoColor.Red)
    board = setCell(board, 11, 0, PuyoColor.Red)
    board = setCell(board, 12, 0, PuyoColor.Red) // 13段目 → 対象外
    const groups = findConnectedGroups(board)
    expect(groups).toHaveLength(0)
  })

  it('detects a group in row 11 (boundary case)', () => {
    let board = createEmptyBoard()
    for (let col = 0; col < 4; col++) {
      board = setCell(board, 11, col, PuyoColor.Green) // 12段目 → 対象
    }
    const groups = findConnectedGroups(board)
    expect(groups).toHaveLength(1)
    expect(groups[0].cells).toHaveLength(4)
  })

  it('does not count diagonal connections', () => {
    let board = createEmptyBoard()
    // 斜め4つ: (0,0), (1,1), (2,2), (3,3)
    board = setCell(board, 0, 0, PuyoColor.Red)
    board = setCell(board, 1, 1, PuyoColor.Red)
    board = setCell(board, 2, 2, PuyoColor.Red)
    board = setCell(board, 3, 3, PuyoColor.Red)
    const groups = findConnectedGroups(board)
    expect(groups).toHaveLength(0)
  })
})

describe('eliminateGroups', () => {
  it('removes group cells from the board', () => {
    let board = createEmptyBoard()
    for (let col = 0; col < 4; col++) {
      board = setCell(board, 0, col, PuyoColor.Red)
    }
    const groups = findConnectedGroups(board)
    const result = eliminateGroups(board, groups)
    for (let col = 0; col < 4; col++) {
      expect(result[0][col]).toBe(PuyoColor.Empty)
    }
  })

  it('does not modify the original board', () => {
    let board = createEmptyBoard()
    for (let col = 0; col < 4; col++) {
      board = setCell(board, 0, col, PuyoColor.Red)
    }
    const groups = findConnectedGroups(board)
    eliminateGroups(board, groups)
    // 元の盤面は変更されていない
    expect(board[0][0]).toBe(PuyoColor.Red)
  })
})

describe('applyGravity', () => {
  it('drops floating puyos down', () => {
    let board = createEmptyBoard()
    // row2に赤を置き、row0,1は空 → row0に落ちる
    board = setCell(board, 2, 0, PuyoColor.Red)
    const result = applyGravity(board)
    expect(result[0][0]).toBe(PuyoColor.Red)
    expect(result[2][0]).toBe(PuyoColor.Empty)
  })

  it('preserves relative order when dropping', () => {
    let board = createEmptyBoard()
    // row0: 赤, row2: 青 (row1が空)
    board = setCell(board, 0, 0, PuyoColor.Red)
    board = setCell(board, 2, 0, PuyoColor.Blue)
    const result = applyGravity(board)
    expect(result[0][0]).toBe(PuyoColor.Red)
    expect(result[1][0]).toBe(PuyoColor.Blue)
    expect(result[2][0]).toBe(PuyoColor.Empty)
  })

  it('drops puyos from row 12 (13段目)', () => {
    let board = createEmptyBoard()
    board = setCell(board, 12, 0, PuyoColor.Green)
    const result = applyGravity(board)
    expect(result[0][0]).toBe(PuyoColor.Green)
    expect(result[12][0]).toBe(PuyoColor.Empty)
  })

  it('does not change a board with no gaps', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Red)
    board = setCell(board, 1, 0, PuyoColor.Blue)
    const result = applyGravity(board)
    expect(boardsEqual(result, board)).toBe(true)
  })
})

describe('resolveChains', () => {
  it('returns the board unchanged when no groups exist', () => {
    let board = createEmptyBoard()
    board = setCell(board, 0, 0, PuyoColor.Red)
    const result = resolveChains(board)
    expect(boardsEqual(result, board)).toBe(true)
  })

  it('eliminates a single group', () => {
    let board = createEmptyBoard()
    for (let col = 0; col < 4; col++) {
      board = setCell(board, 0, col, PuyoColor.Red)
    }
    const result = resolveChains(board)
    // 消去後は空盤面
    expect(boardsEqual(result, createEmptyBoard())).toBe(true)
  })

  it('handles multi-chain (gravity triggers second elimination)', () => {
    let board = createEmptyBoard()
    // row0: 青青青青 (4つ → 消える) + 赤
    for (let col = 0; col < 4; col++) {
      board = setCell(board, 0, col, PuyoColor.Blue)
    }
    board = setCell(board, 0, 4, PuyoColor.Red)
    // row1: 空 + 赤赤赤 + row1,col5以降は空
    board = setCell(board, 1, 1, PuyoColor.Red)
    board = setCell(board, 1, 2, PuyoColor.Red)
    board = setCell(board, 1, 3, PuyoColor.Red)

    // 消去前:
    // row1: . R R R . .
    // row0: B B B B R .
    //
    // 1段目消去後（青4消去 → 重力）:
    // row1: . . . . . .
    // row0: . R R R R .  ← 赤4つが横に連結
    //
    // 2段目消去（赤4消去）→ 空盤面

    const result = resolveChains(board)
    expect(boardsEqual(result, createEmptyBoard())).toBe(true)
  })

  it('row 12 puyo falls and can clear on next chain step', () => {
    let board = createEmptyBoard()
    // col0: row0-2 に赤3つ、row3-6に青4つ（縦一列）、row12に赤1つ
    board = setCell(board, 0, 0, PuyoColor.Red)
    board = setCell(board, 1, 0, PuyoColor.Red)
    board = setCell(board, 2, 0, PuyoColor.Red)
    board = setCell(board, 3, 0, PuyoColor.Blue)
    board = setCell(board, 4, 0, PuyoColor.Blue)
    board = setCell(board, 5, 0, PuyoColor.Blue)
    board = setCell(board, 6, 0, PuyoColor.Blue)
    board = setCell(board, 12, 0, PuyoColor.Red) // 13段目

    // 1段目: 青4つ消去 → 重力 → row12の赤がrow3に落下
    // row0=赤, row1=赤, row2=赤, row3=赤 → 赤4連結 → 消去 → 空盤面

    const result = resolveChains(board)
    expect(boardsEqual(result, createEmptyBoard())).toBe(true)
  })

  it('handles a maximum chain length scenario (kenny’s chain)', () => {
    // kenny式: https://w.atwiki.jp/puyowords/pages/39.html
    const board = [
      [
        PuyoColor.Empty,
        PuyoColor.Empty,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Green,
      ],
      [
        PuyoColor.Yellow,
        PuyoColor.Blue,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Blue,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Green,
      ],
      [
        PuyoColor.Yellow,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Blue,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Blue,
      ],
      [
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Blue,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Green,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Red,
        PuyoColor.Green,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Yellow,
        PuyoColor.Yellow,
        PuyoColor.Blue,
        PuyoColor.Yellow,
        PuyoColor.Blue,
      ],
      [
        PuyoColor.Yellow,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Red,
        PuyoColor.Blue,
        PuyoColor.Blue,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Yellow,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Red,
        PuyoColor.Yellow,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Yellow,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Red,
        PuyoColor.Yellow,
      ],
      [
        PuyoColor.Red,
        PuyoColor.Yellow,
        PuyoColor.Green,
        PuyoColor.Blue,
        PuyoColor.Red,
        PuyoColor.Yellow,
      ],
    ].toReversed()

    const result = resolveChains(board)
    expect(boardsEqual(result, createEmptyBoard())).toBe(true)
  })
})

describe('isDead', () => {
  it('returns false for an empty board', () => {
    expect(isDead(createEmptyBoard())).toBe(false)
  })

  it('returns true when column 3 row 12 is occupied', () => {
    const board = setCell(createEmptyBoard(), DEAD_ROW, DEAD_COL, PuyoColor.Red)
    expect(isDead(board)).toBe(true)
  })

  it('returns false when column 3 is filled up to row 11 (row 12 is empty)', () => {
    let board = createEmptyBoard()
    for (let row = 0; row < DEAD_ROW; row++) {
      board = setCell(board, row, DEAD_COL, PuyoColor.Green)
    }
    expect(isDead(board)).toBe(false)
  })
})
