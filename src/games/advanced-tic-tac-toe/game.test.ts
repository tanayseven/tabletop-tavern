import { describe, expect, it } from 'vitest'
import type { Cell, Player } from '../shared/grid3'
import {
  boardsWon,
  emptyGame,
  gameOf,
  isPlayable,
  legalMoves,
  matchStatus,
  matchWinningLine,
  play,
  playableBoards,
  smallWinningLine,
  type Game,
  type Move,
} from './game'

const EMPTY = '.........'

/**
 * One 9-character string per small board, `.` for an empty cell — the same
 * shorthand `board.test.ts` uses, one level up. Goes through `gameOf`, so a
 * fixture cannot be built with owners that disagree with its cells.
 */
function game(
  specs: readonly string[],
  target: number | null,
  turn: Player = 'X',
): Game {
  const boards = specs.map(
    (spec) =>
      [...spec].map((c) => (c === '.' ? null : (c as Player))) as Cell[],
  )
  return gameOf({ boards, target, turn })
}

/** A position where only `board` has been touched, so targets are easy to read. */
function oneBoard(index: number, spec: string, target: number | null): Game {
  const specs = Array<string>(9).fill(EMPTY)
  specs[index] = spec
  return game(specs, target)
}

describe('emptyGame', () => {
  it('starts with the toss winner to move and a free choice of board', () => {
    const g = emptyGame('O')
    expect(g.turn).toBe('O')
    expect(g.startingPlayer).toBe('O')
    expect(g.target).toBeNull()
    expect(g.owners.every((o) => o === null)).toBe(true)
    expect(g.decided.every((d) => d === false)).toBe(true)
  })

  it('offers all 81 cells on the first move', () => {
    expect(legalMoves(emptyGame()).length).toBe(81)
    expect(playableBoards(emptyGame()).length).toBe(9)
  })
})

describe('gameOf', () => {
  it('recomputes owners and decided from the cells it is given', () => {
    // Board 0 is won by X; the fixture never states that, it is derived.
    const g = oneBoard(0, 'XXX......', null)
    expect(g.owners[0]).toBe('X')
    expect(g.decided[0]).toBe(true)
    expect(g.owners[1]).toBeNull()
    expect(g.decided[1]).toBe(false)
  })
})

describe('where the next move must go', () => {
  it('sends the opponent to the board matching the cell just played', () => {
    for (let cell = 0; cell < 9; cell++) {
      const next = play(emptyGame(), { board: 4, cell })
      expect(next.target).toBe(cell)
      expect(playableBoards(next)).toEqual([cell])
    }
  })

  it('grants a free move when the target board is already won', () => {
    // Board 2 belongs to O; X plays cell 2 of board 0 and would send them there.
    const specs = Array<string>(9).fill(EMPTY)
    specs[2] = 'OOO......'
    const next = play(game(specs, 0), { board: 0, cell: 2 })
    expect(next.target).toBeNull()
    expect(playableBoards(next)).not.toContain(2)
  })

  it('grants a free move when the target board is already full and drawn', () => {
    const specs = Array<string>(9).fill(EMPTY)
    specs[2] = 'XXOOOXXOX' // full, no line
    const drawn = game(specs, 0)
    expect(drawn.owners[2]).toBeNull()
    expect(drawn.decided[2]).toBe(true)

    const next = play(drawn, { board: 0, cell: 2 })
    expect(next.target).toBeNull()
  })

  it('grants a free move when the move wins the very board it points at', () => {
    // Cell 8 of board 8 completes X's diagonal *and* points back at board 8,
    // which has just become decided -- so the opponent is freed, not trapped.
    const next = play(oneBoard(8, 'X...X....', 8), { board: 8, cell: 8 })
    expect(next.owners[8]).toBe('X')
    expect(next.decided[8]).toBe(true)
    expect(next.target).toBeNull()
  })

  it('grants a free move when the move fills the board it points at', () => {
    // Cell 4 of board 4 is the last empty cell and completes no line, so the
    // board is drawn by the same move that points at it.
    const next = play(oneBoard(4, 'OOXX.OOXX', 4), { board: 4, cell: 4 })
    expect(next.decided[4]).toBe(true)
    expect(next.owners[4]).toBeNull()
    expect(next.target).toBeNull()
  })

  it('offers every undecided board, and no decided one, on a free move', () => {
    const specs = Array<string>(9).fill(EMPTY)
    specs[0] = 'XXX......' // won
    specs[1] = 'XXOOOXXOX' // drawn
    const free = game(specs, null)
    expect(playableBoards(free)).toEqual([2, 3, 4, 5, 6, 7, 8])
  })
})

describe('illegal moves return the same game', () => {
  it('ignores a move in the wrong board while forced', () => {
    const forced = play(emptyGame(), { board: 0, cell: 4 })
    expect(play(forced, { board: 7, cell: 0 })).toBe(forced)
  })

  it('ignores an occupied cell', () => {
    const g = play(emptyGame(), { board: 4, cell: 4 })
    expect(play(g, { board: 4, cell: 4 })).toBe(g)
  })

  it('ignores a move in a decided board', () => {
    const specs = Array<string>(9).fill(EMPTY)
    specs[0] = 'XXX......'
    const g = game(specs, null)
    expect(play(g, { board: 0, cell: 5 })).toBe(g)
  })

  it('ignores every move once the match is over', () => {
    const specs = Array<string>(9).fill(EMPTY)
    specs[0] = 'XXX......'
    specs[4] = 'XXX......'
    specs[8] = 'XXX......'
    const over = game(specs, null)
    expect(matchStatus(over).kind).toBe('won')
    expect(play(over, { board: 1, cell: 0 })).toBe(over)
    expect(legalMoves(over)).toEqual([])
  })

  it('does not mutate the game it is given', () => {
    const g = emptyGame()
    const before = g.boards.map((b) => [...b])
    play(g, { board: 3, cell: 6 })
    expect(g.boards.map((b) => [...b])).toEqual(before)
    expect(g.turn).toBe('X')
  })
})

describe('small boards', () => {
  it('records the winner and decides the board the moment a line completes', () => {
    const next = play(oneBoard(5, 'XX.......', 5), { board: 5, cell: 2 })
    expect(next.owners[5]).toBe('X')
    expect(next.decided[5]).toBe(true)
    expect(smallWinningLine(next, 5)).toEqual([0, 1, 2])
  })

  it('decides a full board with no line, owned by nobody', () => {
    const next = play(oneBoard(3, 'XXOOOX.OX', 3), { board: 3, cell: 6 })
    expect(next.decided[3]).toBe(true)
    expect(next.owners[3]).toBeNull()
    expect(smallWinningLine(next, 3)).toBeNull()
  })

  it('never offers a cell inside a decided board', () => {
    const specs = Array<string>(9).fill(EMPTY)
    specs[0] = 'XXX......' // four empty cells remain, none playable
    const moves = legalMoves(game(specs, null))
    expect(moves.some((m) => m.board === 0)).toBe(false)
  })
})

describe('winning the match', () => {
  it('detects all eight lines of small boards', () => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]
    for (const line of lines) {
      const specs = Array<string>(9).fill(EMPTY)
      for (const board of line) specs[board] = 'OOO......'
      const g = game(specs, null)
      expect(matchStatus(g)).toEqual({ kind: 'won', winner: 'O' })
      expect(matchWinningLine(g)).toEqual(line)
    }
  })

  it('wins without every board being decided', () => {
    const specs = Array<string>(9).fill(EMPTY)
    specs[0] = 'XXX......'
    specs[1] = 'XXX......'
    specs[2] = 'XXX......'
    const g = game(specs, null)
    expect(matchStatus(g).kind).toBe('won')
    expect(g.decided.filter(Boolean).length).toBe(3)
  })

  it('counts a win on the move that decides the last board as a win', () => {
    // Eight boards already decided; X takes the ninth to complete 0/4/8.
    const specs = [
      'XXX......',
      'XXOOOXXOX',
      'XXOOOXXOX',
      'XXOOOXXOX',
      'XXX......',
      'XXOOOXXOX',
      'XXOOOXXOX',
      'XXOOOXXOX',
      'XX.......',
    ]
    const g = game(specs, 8)
    expect(matchStatus(g).kind).toBe('in-progress')

    const next = play(g, { board: 8, cell: 2 })
    expect(next.decided.every(Boolean)).toBe(true)
    expect(matchStatus(next)).toEqual({ kind: 'won', winner: 'X' })
  })

  it('is a plain draw when every board is decided with no line', () => {
    // X owns four boards, O owns three, two are drawn -- and it is still a
    // draw. Board counts are shown to the player but never decide the match.
    // X owns 0, 1, 5, 6 and O owns 2, 3, 7 -- neither set is one of the eight
    // lines, which is the point: more boards does not mean a win.
    const specs = [
      'XXX......', // X
      'XXX......', // X
      'OOO......', // O
      'OOO......', // O
      'XXOOOXXOX', // drawn
      'XXX......', // X
      'XXX......', // X
      'OOO......', // O
      'XXOOOXXOX', // drawn
    ]
    const g = game(specs, null)
    expect(boardsWon(g)).toEqual({ X: 4, O: 3 })
    expect(matchWinningLine(g)).toBeNull()
    expect(matchStatus(g)).toEqual({ kind: 'draw' })
  })

  it('always has a legal move while the match is in progress', () => {
    // Walk a whole match; the target must never strand the mover.
    let g = emptyGame()
    let guard = 0
    while (matchStatus(g).kind === 'in-progress') {
      const moves = legalMoves(g)
      expect(moves.length).toBeGreaterThan(0)
      g = play(g, moves[guard % moves.length])
      expect(++guard).toBeLessThanOrEqual(81)
    }
  })
})

describe('turn order', () => {
  it('starts from the toss winner and strictly alternates', () => {
    let g = emptyGame('O')
    const seen: Player[] = []
    for (const move of [
      { board: 0, cell: 1 },
      { board: 1, cell: 2 },
      { board: 2, cell: 3 },
      { board: 3, cell: 4 },
    ] as Move[]) {
      seen.push(g.turn)
      g = play(g, move)
    }
    expect(seen).toEqual(['O', 'X', 'O', 'X'])
    expect(g.startingPlayer).toBe('O')
  })

  it('does not consume a turn on an illegal move', () => {
    const g = play(emptyGame(), { board: 4, cell: 4 })
    expect(g.turn).toBe('O')
    expect(play(g, { board: 0, cell: 0 }).turn).toBe('O')
  })
})

describe('isPlayable', () => {
  it('is true only for the target while forced', () => {
    const forced = play(emptyGame(), { board: 0, cell: 6 })
    expect(isPlayable(forced, 6)).toBe(true)
    expect(isPlayable(forced, 0)).toBe(false)
  })

  it('is false everywhere once the match is over', () => {
    const specs = Array<string>(9).fill(EMPTY)
    specs[0] = specs[4] = specs[8] = 'XXX......'
    const over = game(specs, null)
    expect(isPlayable(over, 1)).toBe(false)
  })
})
