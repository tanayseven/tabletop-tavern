import { describe, expect, it } from 'vitest'
import {
  boardResult,
  currentPlayer,
  emptyGame,
  isDecided,
  isLegal,
  legalMoves,
  metaCells,
  play,
  playableBoards,
  status,
  type Cell,
  type Game,
  type Mark,
} from './board'

/** Reads a small board from a 9-char string, where '.' is an empty cell. */
function cells(spec: string): Cell[] {
  return [...spec].map((c) => (c === '.' ? null : (c as Mark)))
}

/**
 * Builds a game from nine 9-char board specs. `active` is the board the mover
 * is confined to, matching the `activeBoard` field.
 */
function game(
  specs: readonly string[],
  active: number | null = null,
  startingPlayer: Mark = 'X',
): Game {
  return {
    boards: specs.map(cells),
    activeBoard: active,
    startingPlayer,
  }
}

const BLANK = '.........'
const blanks = (overrides: Record<number, string> = {}) =>
  Array.from({ length: 9 }, (_, i) => overrides[i] ?? BLANK)

describe('boardResult', () => {
  it('reports a small board still in progress', () => {
    expect(boardResult(cells('X...O....')).kind).toBe('in-progress')
  })

  it('detects a win on each line', () => {
    const lines = [
      'XXX......',
      '...XXX...',
      '......XXX',
      'X..X..X..',
      '.X..X..X.',
      '..X..X..X',
      'X...X...X',
      '..X.X.X..',
    ]
    for (const spec of lines) {
      expect(boardResult(cells(spec))).toMatchObject({
        kind: 'won',
        winner: 'X',
      })
    }
  })

  it('calls a full board with no line a draw', () => {
    expect(boardResult(cells('XXOOOXXXO')).kind).toBe('draw')
  })

  it('prefers a win over a draw when the last cell completes a line', () => {
    expect(boardResult(cells('XOOXOOXXX'))).toMatchObject({
      kind: 'won',
      winner: 'X',
    })
  })
})

describe('isDecided', () => {
  it('is true for a won board and for a full one', () => {
    expect(isDecided(cells('XXX......'))).toBe(true)
    expect(isDecided(cells('XXOOOXXXO'))).toBe(true)
  })

  it('is false while cells remain and nobody has won', () => {
    expect(isDecided(cells('XO.......'))).toBe(false)
  })
})

describe('currentPlayer', () => {
  it('starts with the starting mark and alternates by total marks placed', () => {
    const fresh = emptyGame('O')
    expect(currentPlayer(fresh)).toBe('O')

    const after = play(fresh, { board: 4, cell: 4 }, 'O')
    expect(currentPlayer(after)).toBe('X')
  })

  it('counts marks across every board, not just the active one', () => {
    expect(currentPlayer(game(blanks({ 0: 'X........' })))).toBe('O')
    expect(
      currentPlayer(game(blanks({ 0: 'X........', 5: 'O........' }))),
    ).toBe('X')
  })
})

describe('the active board', () => {
  it('lets the opening move go anywhere', () => {
    expect(playableBoards(emptyGame())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(legalMoves(emptyGame())).toHaveLength(81)
  })

  it('sends the opponent to the board named by the cell just played', () => {
    const after = play(emptyGame(), { board: 0, cell: 6 }, 'X')
    expect(after.activeBoard).toBe(6)
    expect(playableBoards(after)).toEqual([6])
    expect(legalMoves(after)).toHaveLength(9)
  })

  it('frees the choice when the named board is already won', () => {
    const won = game(blanks({ 3: 'OOO......' }))
    const after = play(won, { board: 0, cell: 3 }, 'X')
    expect(after.activeBoard).toBeNull()
    // Every board except the settled one is open.
    expect(playableBoards(after)).not.toContain(3)
    expect(playableBoards(after)).toHaveLength(8)
  })

  it('frees the choice when the named board is full', () => {
    const full = game(blanks({ 1: 'XXOOOXXXO' }))
    const after = play(full, { board: 0, cell: 1 }, 'X')
    expect(after.activeBoard).toBeNull()
    expect(playableBoards(after)).not.toContain(1)
  })

  it('never offers a settled board even on a free choice', () => {
    const mixed = game(blanks({ 0: 'XXX......', 8: 'XXOOOXXXO' }), null)
    expect(playableBoards(mixed)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('play', () => {
  it('places the mark and leaves the original game untouched', () => {
    const before = emptyGame()
    const after = play(before, { board: 2, cell: 5 }, 'X')
    expect(after.boards[2][5]).toBe('X')
    expect(before.boards[2][5]).toBeNull()
  })

  it('returns the same game for a move outside the active board', () => {
    const sent = play(emptyGame(), { board: 0, cell: 6 }, 'X')
    expect(play(sent, { board: 1, cell: 0 }, 'O')).toBe(sent)
  })

  it('returns the same game for an occupied cell', () => {
    const once = play(emptyGame(), { board: 4, cell: 4 }, 'X')
    expect(play(once, { board: 4, cell: 4 }, 'O')).toBe(once)
  })

  it('returns the same game once the match is decided', () => {
    const decided = game(
      blanks({ 0: 'XXX......', 4: 'XXX......', 8: 'XXX......' }),
      null,
    )
    expect(status(decided).kind).toBe('won')
    expect(play(decided, { board: 1, cell: 0 }, 'O')).toBe(decided)
  })

  it('rejects a move into a board that is already settled', () => {
    const settled = game(blanks({ 3: 'OOO......' }), null)
    expect(isLegal(settled, { board: 3, cell: 5 })).toBe(false)
    expect(play(settled, { board: 3, cell: 5 }, 'X')).toBe(settled)
  })
})

describe('metaCells', () => {
  it('names the holder of each won board and leaves the rest empty', () => {
    const mixed = game(blanks({ 0: 'XXX......', 4: 'OOO......' }))
    expect(metaCells(mixed)).toEqual([
      'X',
      null,
      null,
      null,
      'O',
      null,
      null,
      null,
      null,
    ])
  })

  it('leaves a drawn board empty, so it can never complete a meta-line', () => {
    const drawn = game(blanks({ 1: 'XXOOOXXXO' }))
    expect(metaCells(drawn)[1]).toBeNull()

    // X holds boards 0 and 2; the drawn board 1 between them wins nothing.
    const flanked = game(
      blanks({ 0: 'XXX......', 1: 'XXOOOXXXO', 2: 'XXX......' }),
    )
    expect(status(flanked).kind).toBe('in-progress')
  })
})

describe('status', () => {
  it('is in progress on a fresh game', () => {
    expect(status(emptyGame()).kind).toBe('in-progress')
  })

  it('is won when three boards in a meta-line share a holder', () => {
    const won = game(blanks({ 2: 'OOO......', 4: 'OOO......', 6: 'OOO......' }))
    expect(status(won)).toMatchObject({
      kind: 'won',
      winner: 'O',
      line: [2, 4, 6],
    })
  })

  it('is a draw when every board is settled with no meta-line', () => {
    const drawnBoard = 'XXOOOXXXO'
    const all = game(
      Array.from({ length: 9 }, () => drawnBoard),
      null,
    )
    expect(status(all).kind).toBe('draw')
    expect(legalMoves(all)).toEqual([])
  })

  it('is still in progress while boards remain, even with several claimed', () => {
    const partial = game(blanks({ 0: 'XXX......', 4: 'OOO......' }))
    expect(status(partial).kind).toBe('in-progress')
  })
})
