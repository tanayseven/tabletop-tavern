import { describe, expect, it } from 'vitest'
import {
  coords,
  emptyCells,
  isFull,
  other,
  statusOf,
  winningLine,
  WINNING_LINES,
  type Cell,
  type Player,
} from './grid3'

/** `.` is an empty cell, so a position reads as one 9-character string. */
function cells(spec: string): Cell[] {
  return [...spec].map((c) => (c === '.' ? null : (c as Player)))
}

describe('other', () => {
  it('swaps the two marks', () => {
    expect(other('X')).toBe('O')
    expect(other('O')).toBe('X')
  })
})

describe('winningLine', () => {
  it('finds nothing on an empty grid', () => {
    expect(winningLine(cells('.........'))).toBeNull()
  })

  it('detects every one of the eight lines, for both marks', () => {
    for (const line of WINNING_LINES) {
      for (const mark of ['X', 'O'] as const) {
        const grid = cells('.........')
        for (const index of line) grid[index] = mark
        expect(winningLine(grid)).toEqual(line)
        expect(statusOf(grid)).toEqual({ kind: 'won', winner: mark })
      }
    }
  })

  it('returns the three indices, not just that someone won', () => {
    // Top row to X; the caller needs these to draw a strike-through.
    expect(winningLine(cells('XXX.O.O..'))).toEqual([0, 1, 2])
  })
})

describe('statusOf', () => {
  it('reports an empty grid as in progress', () => {
    expect(statusOf(cells('.........'))).toEqual({ kind: 'in-progress' })
  })

  it('is still in progress with one cell left and no line', () => {
    expect(statusOf(cells('XOXXOOOX.'))).toEqual({ kind: 'in-progress' })
  })

  it('is a draw when full with no line', () => {
    expect(statusOf(cells('XXOOOXXOX'))).toEqual({ kind: 'draw' })
  })

  it('counts a win on the very last cell as a win, not a draw', () => {
    // Full grid, and X holds the left column.
    expect(statusOf(cells('XOOXXOXXO'))).toEqual({ kind: 'won', winner: 'X' })
  })
})

describe('isFull', () => {
  it('is false while any cell is empty and true once none are', () => {
    expect(isFull(cells('XOXOXOXO.'))).toBe(false)
    expect(isFull(cells('XOXOXOXOX'))).toBe(true)
  })
})

describe('emptyCells', () => {
  it('lists the empty indices in order', () => {
    expect(emptyCells(cells('X.O.X.O..'))).toEqual([1, 3, 5, 7, 8])
  })

  it('is empty for a full grid', () => {
    expect(emptyCells(cells('XXOOOXXOX'))).toEqual([])
  })
})

describe('coords', () => {
  it('maps an index to a 1-based row and column', () => {
    expect(coords(0)).toEqual({ row: 1, column: 1 })
    expect(coords(4)).toEqual({ row: 2, column: 2 })
    expect(coords(8)).toEqual({ row: 3, column: 3 })
  })
})
