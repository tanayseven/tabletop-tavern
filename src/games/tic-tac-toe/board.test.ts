import { describe, expect, it } from 'vitest'
import {
  currentPlayer,
  emptyBoard,
  other,
  place,
  status,
  winningLine,
  WINNING_LINES,
  type Board,
  type Cell,
  type Player,
} from './board'

/** Reads a board from a 9-char string, where '.' is an empty cell. */
function board(spec: string, startingPlayer: Player = 'X'): Board {
  return {
    cells: [...spec].map((c) => (c === '.' ? null : (c as Cell))),
    startingPlayer,
  }
}

describe('status', () => {
  it('reports an empty board as still in progress', () => {
    expect(status(emptyBoard())).toEqual({ kind: 'in-progress' })
  })

  it('reports a partly-filled board with no line as in progress', () => {
    // Eight marks, one empty cell, no line: still in progress, not a draw.
    expect(status(board('XOXOXOOX.'))).toEqual({ kind: 'in-progress' })
  })

  it('detects all 8 winning lines for both players', () => {
    for (const line of WINNING_LINES) {
      for (const mark of ['X', 'O'] as const) {
        const cells = Array<Cell>(9).fill(null)
        for (const i of line) cells[i] = mark
        expect(status({ cells, startingPlayer: 'X' })).toEqual({
          kind: 'won',
          winner: mark,
        })
      }
    }
  })

  it('detects a win without needing a full board', () => {
    expect(status(board('XXX......'))).toEqual({ kind: 'won', winner: 'X' })
  })

  it('calls a win on the very last move a win, not a draw', () => {
    // Full board that also contains a completed line: X holds the top row.
    expect(status(board('XXXOOXOXO'))).toEqual({ kind: 'won', winner: 'X' })
  })

  it('calls a full board with no line a draw', () => {
    expect(status(board('XOXXOOOXX'))).toEqual({ kind: 'draw' })
  })
})

describe('winningLine', () => {
  it('reports which three cells completed the line', () => {
    expect(winningLine(board('X...X...X'))).toEqual([0, 4, 8])
    expect(winningLine(board('..O.O.O..'))).toEqual([2, 4, 6])
  })

  it('reports nothing when no line is complete', () => {
    expect(winningLine(emptyBoard())).toBeNull()
    expect(winningLine(board('XOXXOOOXX'))).toBeNull()
  })
})

describe('place', () => {
  it('places a mark on an empty cell', () => {
    expect(place(emptyBoard(), 4, 'X').cells[4]).toBe('X')
  })

  it('does not mutate the board it was given', () => {
    const start = emptyBoard()
    place(start, 0, 'X')
    expect(start.cells.every((c) => c === null)).toBe(true)
  })

  // Returning the identical reference is how the UI knows to leave the turn
  // with the current player rather than handing it over.
  it('returns the same board for an occupied cell', () => {
    const start = board('X........')
    expect(place(start, 0, 'O')).toBe(start)
  })

  it('returns the same board once the round is decided', () => {
    const won = board('XXX......')
    expect(place(won, 5, 'O')).toBe(won)

    const drawn = board('XOXXOOOXX')
    expect(place(drawn, 0, 'O')).toBe(drawn)
  })

  it('preserves the starting player', () => {
    expect(place(emptyBoard('O'), 0, 'O').startingPlayer).toBe('O')
  })
})

describe('currentPlayer', () => {
  it('starts with the starting player, not always X', () => {
    expect(currentPlayer(emptyBoard('O'))).toBe('O')
    expect(currentPlayer(emptyBoard('X'))).toBe('X')
  })

  it('alternates as marks are placed', () => {
    let b = emptyBoard('O')
    expect(currentPlayer(b)).toBe('O')
    b = place(b, 0, 'O')
    expect(currentPlayer(b)).toBe('X')
    b = place(b, 1, 'X')
    expect(currentPlayer(b)).toBe('O')
  })
})

describe('other', () => {
  it('alternates players', () => {
    expect(other('X')).toBe('O')
    expect(other('O')).toBe('X')
  })
})
