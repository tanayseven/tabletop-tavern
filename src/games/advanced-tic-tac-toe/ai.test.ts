import { describe, expect, it } from 'vitest'
import { chooseMove, evaluate, type Rng } from './ai'
import {
  currentPlayer,
  emptyGame,
  isLegal,
  legalMoves,
  play,
  status,
  type Cell,
  type Game,
  type Mark,
} from './board'
import type { Difficulty } from '../../lib/setup'

const DIFFICULTY_IDS: readonly Difficulty[] = [
  'very-easy',
  'easy',
  'medium',
  'hard',
]

/** A seeded PRNG, so every "random" difficulty plays the same game each run. */
function seeded(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cells(spec: string): Cell[] {
  return [...spec].map((c) => (c === '.' ? null : (c as Mark)))
}

const BLANK = '.........'

function game(
  overrides: Record<number, string>,
  active: number | null,
  startingPlayer: Mark = 'X',
): Game {
  return {
    boards: Array.from({ length: 9 }, (_, i) => cells(overrides[i] ?? BLANK)),
    activeBoard: active,
    startingPlayer,
  }
}

describe('chooseMove', () => {
  it.each(DIFFICULTY_IDS)('returns a legal move at %s', (difficulty) => {
    const fresh = emptyGame()
    expect(isLegal(fresh, chooseMove(fresh, 'X', difficulty, seeded(1)))).toBe(
      true,
    )
  })

  it.each(DIFFICULTY_IDS)('respects the active board at %s', (difficulty) => {
    // X was sent to board 6; every difficulty has to play there.
    const sent = play(emptyGame(), { board: 0, cell: 6 }, 'X')
    expect(currentPlayer(sent)).toBe('O')
    expect(chooseMove(sent, 'O', difficulty, seeded(7)).board).toBe(6)
  })

  it.each(DIFFICULTY_IDS)(
    'plays a whole game to a finish at %s',
    (difficulty) => {
      const rng = seeded(42)
      let current = emptyGame()
      let plies = 0

      while (status(current).kind === 'in-progress') {
        const mark = currentPlayer(current)
        const move = chooseMove(current, mark, difficulty, rng)
        expect(isLegal(current, move)).toBe(true)
        current = play(current, move, mark)
        plies += 1
        expect(plies).toBeLessThanOrEqual(81)
      }

      expect(status(current).kind).not.toBe('in-progress')
    },
  )
})

describe('easy', () => {
  it('completes a small board when it can', () => {
    // O is confined to board 3 and holds two of its top row.
    const position = game({ 0: 'X........', 3: 'OO.......' }, 3)
    expect(currentPlayer(position)).toBe('O')
    expect(chooseMove(position, 'O', 'easy', seeded(3))).toEqual({
      board: 3,
      cell: 2,
    })
  })

  it('blocks the opponent from completing one', () => {
    // Nothing to win here, but X is one cell from taking board 3.
    const position = game({ 0: 'OX.......', 3: 'XX.......' }, 3, 'O')
    expect(currentPlayer(position)).toBe('O')
    expect(chooseMove(position, 'O', 'easy', seeded(3))).toEqual({
      board: 3,
      cell: 2,
    })
  })
})

describe('hard', () => {
  it('takes the small board that wins the match', () => {
    // X already holds boards 0 and 4; board 8 completes the diagonal.
    const position = game({ 0: 'XXX......', 4: 'XXX......', 8: 'XX.......' }, 8)
    expect(currentPlayer(position)).toBe('X')

    const move = chooseMove(position, 'X', 'hard', seeded(5))
    expect(move).toEqual({ board: 8, cell: 2 })
    expect(status(play(position, move, 'X'))).toMatchObject({
      kind: 'won',
      winner: 'X',
    })
  })

  it('blocks a match-winning reply rather than handing it over', () => {
    // O holds boards 0 and 4 and needs board 8 for the diagonal. X is confined
    // to board 8, where only cells 2 and 8 are free: taking 8 sends O straight
    // back to board 8 to win, so 2 is the only move that survives.
    const position = game(
      { 0: 'OOO......', 1: 'X........', 4: 'OOO......', 8: 'OO.XXOOX.' },
      8,
    )
    expect(currentPlayer(position)).toBe('X')
    expect(legalMoves(position)).toHaveLength(2)

    expect(chooseMove(position, 'X', 'hard', seeded(9))).toEqual({
      board: 8,
      cell: 2,
    })
  })

  it('beats the random opponent', () => {
    const rng = seeded(2024)
    let wins = 0

    for (let round = 0; round < 2; round += 1) {
      let current = emptyGame('X') // 'X' is hard, 'O' moves at random
      while (status(current).kind === 'in-progress') {
        const mark = currentPlayer(current)
        const difficulty = mark === 'X' ? 'hard' : 'very-easy'
        current = play(
          current,
          chooseMove(current, mark, difficulty, rng),
          mark,
        )
      }
      const result = status(current)
      if (result.kind === 'won' && result.winner === 'X') wins += 1
    }

    expect(wins).toBe(2)
  })
})

describe('evaluate', () => {
  it('is symmetric between the two sides', () => {
    const position = game({ 0: 'XXX......', 4: 'OO.......' }, null)
    expect(evaluate(position, 'X')).toBe(-evaluate(position, 'O'))
  })

  it('prefers holding a board to not holding it', () => {
    const neither = game({}, null)
    const mine = game({ 4: 'XXX......' }, null)
    expect(evaluate(mine, 'X')).toBeGreaterThan(evaluate(neither, 'X'))
  })

  it('values the centre board above a side board', () => {
    const centre = game({ 4: 'XXX......' }, null)
    const side = game({ 1: 'XXX......' }, null)
    expect(evaluate(centre, 'X')).toBeGreaterThan(evaluate(side, 'X'))
  })
})
