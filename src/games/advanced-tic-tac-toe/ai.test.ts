import { describe, expect, it } from 'vitest'
import type { Difficulty, Rng } from '../shared/difficulty'
import { other, type Cell, type Player } from '../shared/grid3'
import { chooseMove, evaluate, HARD_NODE_BUDGET, scoreMove, search } from './ai'
import {
  emptyGame,
  gameOf,
  legalMoves,
  matchStatus,
  play,
  type Game,
  type Move,
} from './game'

const EMPTY = '.........'
const LEVELS: Difficulty[] = ['very-easy', 'easy', 'medium', 'hard']

/** The deterministic rng the rest of the suite uses: always the first option. */
const firstChoice: Rng = () => 0

/**
 * Hard runs a real search, so anything that calls it many times needs room.
 * One search is roughly 150ms; these budgets are generous multiples of that,
 * not a measurement of it.
 */
const HARD_TIMEOUT_MS = 30_000
const PLAYOUT_TIMEOUT_MS = 60_000

/** A small seeded generator, so play-outs vary but stay reproducible. */
function seeded(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

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

function withBoards(entries: Record<number, string>, target: number | null) {
  const specs = Array<string>(9).fill(EMPTY)
  for (const [index, spec] of Object.entries(entries)) specs[+index] = spec
  return game(specs, target)
}

function isLegal(g: Game, move: Move): boolean {
  return legalMoves(g).some(
    (m) => m.board === move.board && m.cell === move.cell,
  )
}

describe('every difficulty returns a legal move', () => {
  const forced = play(emptyGame(), { board: 4, cell: 0 })
  const free = withBoards({ 0: 'XXX......' }, null)

  for (const level of LEVELS) {
    it(
      `${level} stays legal when forced and when free`,
      () => {
        for (let seed = 1; seed <= 20; seed++) {
          expect(
            isLegal(forced, chooseMove(forced, 'O', level, seeded(seed))),
          ).toBe(true)
          expect(
            isLegal(free, chooseMove(free, 'O', level, seeded(seed))),
          ).toBe(true)
        }
      },
      HARD_TIMEOUT_MS,
    )
  }
})

describe('easy and above', () => {
  const levels: Difficulty[] = ['easy', 'medium', 'hard']

  for (const level of levels) {
    it(`${level} takes a small board when it can`, () => {
      // X owns nothing yet; cell 2 of board 0 completes the top row.
      const g = withBoards({ 0: 'XX.OO....' }, 0)
      expect(chooseMove(g, 'X', level, firstChoice)).toEqual({
        board: 0,
        cell: 2,
      })
    })

    it(`${level} blocks the opponent's small board`, () => {
      // O threatens cell 2 of board 0 and X has no win of its own available.
      const g = withBoards({ 0: 'OO.X..X..' }, 0)
      expect(chooseMove(g, 'X', level, firstChoice)).toEqual({
        board: 0,
        cell: 2,
      })
    })

    it(`${level} prefers the match-winning board over another board`, () => {
      // X already owns boards 0 and 1. Board 2 completes the top line; board 5
      // is an equally available board win that wins nothing overall.
      const g = withBoards(
        { 0: 'XXX......', 1: 'XXX......', 2: 'XX.OO....', 5: 'XX.OO....' },
        null,
      )
      const move = chooseMove(g, 'X', level, firstChoice)
      expect(move).toEqual({ board: 2, cell: 2 })
      expect(matchStatus(play(g, move))).toEqual({ kind: 'won', winner: 'X' })
    })
  }
})

describe('scoreMove (medium judgement)', () => {
  it('prefers the centre cell among otherwise equal moves', () => {
    const g = emptyGame()
    const centre = scoreMove(g, 'X', { board: 4, cell: 4 })
    const side = scoreMove(g, 'X', { board: 4, cell: 1 })
    expect(centre).toBeGreaterThan(side)
  })

  it('values taking the centre board over a side board', () => {
    const g = withBoards({ 4: 'XX.OO....', 1: 'XX.OO....' }, null)
    expect(scoreMove(g, 'X', { board: 4, cell: 2 })).toBeGreaterThan(
      scoreMove(g, 'X', { board: 1, cell: 2 }),
    )
  })

  it('rates handing over a free move below sending them to a board', () => {
    // Board 0 is decided, so cell 0 hands O a free choice; cell 1 does not.
    const g = withBoards({ 0: 'XXX......', 3: EMPTY }, 3)
    const free = scoreMove(g, 'X', { board: 3, cell: 0 })
    const forced = scoreMove(g, 'X', { board: 3, cell: 1 })
    expect(free).toBeLessThan(forced)
  })

  it('avoids sending the opponent where they have an immediate win', () => {
    // Cell 1 sends O to board 1, where O can win at once. Cell 2 sends them to
    // board 2, which is empty.
    const g = withBoards({ 1: 'OO.......', 3: EMPTY }, 3)
    const intoDanger = scoreMove(g, 'X', { board: 3, cell: 1 })
    const intoSafety = scoreMove(g, 'X', { board: 3, cell: 2 })
    expect(intoDanger).toBeLessThan(intoSafety)
  })

  it('rates blocking a match loss above winning an ordinary board', () => {
    // O owns boards 0 and 1 and can take board 2 -- that would end the match.
    // X can instead take board 5 outright.
    const g = withBoards(
      { 0: 'OOO......', 1: 'OOO......', 2: 'OO.XX....', 5: 'XX.OO....' },
      null,
    )
    const block = scoreMove(g, 'X', { board: 2, cell: 2 })
    const takeOwn = scoreMove(g, 'X', { board: 5, cell: 2 })
    expect(block).toBeGreaterThan(takeOwn)
  })
})

describe('evaluate', () => {
  it('is symmetric: a position good for X is bad for O', () => {
    const g = withBoards({ 0: 'XXX......', 4: 'XX.......' }, null)
    expect(evaluate(g, 'X')).toBe(-evaluate(g, 'O'))
  })

  it('scores a won match above any ordinary position', () => {
    const won = withBoards(
      { 0: 'XXX......', 4: 'XXX......', 8: 'XXX......' },
      null,
    )
    const ordinary = withBoards({ 0: 'XXX......' }, null)
    expect(evaluate(won, 'X')).toBeGreaterThan(evaluate(ordinary, 'X'))
    expect(evaluate(won, 'O')).toBeLessThan(evaluate(ordinary, 'O'))
  })

  it('prefers a faster win, so a forced win is not stalled', () => {
    const won = withBoards(
      { 0: 'XXX......', 4: 'XXX......', 8: 'XXX......' },
      null,
    )
    expect(evaluate(won, 'X', 0)).toBeGreaterThan(evaluate(won, 'X', 5))
  })
})

describe('hard', () => {
  it('takes a match win in one', () => {
    const g = withBoards(
      { 0: 'XXX......', 1: 'XXX......', 2: 'XX.OO....' },
      null,
    )
    const move = chooseMove(g, 'X', 'hard', firstChoice)
    expect(matchStatus(play(g, move))).toEqual({ kind: 'won', winner: 'X' })
  })

  it('blocks a forced match loss', () => {
    // O owns boards 0 and 1 and needs cell 2 of board 2 for the top line.
    // Every other board is drawn, so any X move pointing at one of them hands
    // O a free move -- and O would spend it on that winning cell. Only cell 2
    // both denies the line and sends O back into board 2, so it is the unique
    // move that does not lose. A threat is only "immediate" in this game when
    // the opponent can actually be sent to it.
    const drawn = 'XXOOOXXOX'
    const g = game(
      [
        'OOO......',
        'OOO......',
        'OO.X..X..',
        drawn,
        drawn,
        drawn,
        drawn,
        drawn,
        drawn,
      ],
      2,
    )
    expect(matchStatus(g).kind).toBe('in-progress')
    expect(chooseMove(g, 'X', 'hard', firstChoice)).toEqual({
      board: 2,
      cell: 2,
    })
  })

  it('is deterministic for the same position and rng', () => {
    const g = play(emptyGame(), { board: 4, cell: 4 })
    const first = chooseMove(g, 'O', 'hard', seeded(7))
    const again = chooseMove(g, 'O', 'hard', seeded(7))
    expect(again).toEqual(first)
  })

  it('never exceeds its node budget', () => {
    // The empty board is the widest position there is: 81 root moves.
    const result = search(emptyGame(), 'X', { rng: firstChoice })
    expect(result.nodes).toBeLessThanOrEqual(HARD_NODE_BUDGET)
    expect(isLegal(emptyGame(), result.move)).toBe(true)
  })

  it('respects a smaller budget and still returns a legal move', () => {
    const g = play(emptyGame(), { board: 4, cell: 4 })
    const result = search(g, 'O', { nodeBudget: 50, rng: firstChoice })
    expect(result.nodes).toBeLessThanOrEqual(50 + 1)
    expect(isLegal(g, result.move)).toBe(true)
  })
})

/**
 * The most valuable test here: it catches an opponent returning an illegal
 * move, a target that never advances, and a move that silently does nothing --
 * the three ways this engine could hang the UI.
 */
describe('play-outs always terminate', () => {
  function playOut(x: Difficulty, o: Difficulty, seed: number) {
    const rng = seeded(seed)
    let g = emptyGame()
    let moves = 0

    while (matchStatus(g).kind === 'in-progress') {
      const mark: Player = g.turn
      const move = chooseMove(g, mark, mark === 'X' ? x : o, rng)
      expect(isLegal(g, move)).toBe(true)

      const next = play(g, move)
      // A same-reference result would mean an illegal move slipped through and
      // the loop would spin forever.
      expect(next).not.toBe(g)
      expect(next.turn).toBe(other(mark))

      g = next
      moves++
      expect(moves).toBeLessThanOrEqual(81)
    }

    return { result: matchStatus(g), moves }
  }

  for (const x of LEVELS) {
    for (const o of LEVELS) {
      it(
        `${x} vs ${o} reaches a legal finish`,
        () => {
          const { result, moves } = playOut(x, o, 12345 + LEVELS.indexOf(x))
          expect(['won', 'draw']).toContain(result.kind)
          expect(moves).toBeGreaterThan(0)
        },
        PLAYOUT_TIMEOUT_MS,
      )
    }
  }

  it(
    'hard beats or draws very-easy in the overwhelming majority',
    () => {
      let good = 0
      for (let seed = 1; seed <= 10; seed++) {
        const rng = seeded(seed * 31)
        let g = emptyGame()
        while (matchStatus(g).kind === 'in-progress') {
          const level: Difficulty = g.turn === 'X' ? 'hard' : 'very-easy'
          g = play(g, chooseMove(g, g.turn, level, rng))
        }
        const result = matchStatus(g)
        if (
          result.kind === 'draw' ||
          (result.kind === 'won' && result.winner === 'X')
        ) {
          good++
        }
      }
      // Deliberately not "hard never loses" -- a bounded search can be outplayed.
      expect(good).toBeGreaterThanOrEqual(9)
    },
    PLAYOUT_TIMEOUT_MS,
  )
})
