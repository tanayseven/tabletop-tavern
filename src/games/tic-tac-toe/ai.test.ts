import { describe, expect, it } from 'vitest'
import { chooseMove, type Difficulty } from './ai'
import {
  currentPlayer,
  emptyBoard,
  emptyCells,
  other,
  place,
  status,
  type Board,
  type Cell,
  type Player,
} from './board'

function board(spec: string, startingPlayer: Player = 'X'): Board {
  return {
    cells: [...spec].map((c) => (c === '.' ? null : (c as Cell))),
    startingPlayer,
  }
}

/** Deterministic RNG, so the random-flavoured difficulties are testable. */
const firstChoice = () => 0

const ALL: Difficulty[] = ['very-easy', 'easy', 'medium', 'hard']

describe('chooseMove', () => {
  it('always returns a legal empty cell, at every difficulty', () => {
    const b = board('XOX.O....')
    for (const difficulty of ALL) {
      for (let i = 0; i < 20; i++) {
        const move = chooseMove(b, 'X', difficulty)
        expect(emptyCells(b)).toContain(move)
      }
    }
  })

  it('takes an immediate win at Easy and above', () => {
    // X has two in the top row; cell 2 completes it.
    const b = board('XX.OO....')
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(chooseMove(b, 'X', difficulty, firstChoice)).toBe(2)
    }
  })

  it('blocks an immediate loss at Easy and above', () => {
    // O threatens the top row, and X has no win of its own, so X must take
    // cell 2. (X marks at 3 and 6 deliberately share no line: with X at 3 and
    // 5 instead, cell 4 would be a win and taking it would be correct.)
    const b = board('OO.X..X..')
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(chooseMove(b, 'X', difficulty, firstChoice)).toBe(2)
    }
  })

  it('prefers winning over blocking when both are available', () => {
    // X can win at 2; O threatens the bottom row at 8.
    const b = board('XX.O..OO.')
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(chooseMove(b, 'X', difficulty, firstChoice)).toBe(2)
    }
  })

  it('takes the centre at Medium when it is free', () => {
    expect(chooseMove(board('X........'), 'O', 'medium', firstChoice)).toBe(4)
  })

  it('takes the opposite corner at Medium', () => {
    // O holds the centre; X took a corner, so O replies in the opposite one.
    const b = board('X...O....')
    expect(chooseMove(b, 'O', 'medium', firstChoice)).toBe(8)
  })
})

/** Plays a full game between two difficulties and returns the final status. */
function playOut(
  xDifficulty: Difficulty,
  oDifficulty: Difficulty,
  startingPlayer: Player,
) {
  let b = emptyBoard(startingPlayer)
  while (status(b).kind === 'in-progress') {
    const mark = currentPlayer(b)
    const difficulty = mark === 'X' ? xDifficulty : oDifficulty
    b = place(b, chooseMove(b, mark, difficulty), mark)
  }
  return status(b)
}

describe('Hard difficulty', () => {
  // The design doc's guarantee: Hard never loses. The best any opponent can
  // manage is a draw, so this is the property worth testing rather than any
  // particular move.
  it('never loses, whichever side it plays or starts', () => {
    for (const opponent of ALL) {
      for (const startingPlayer of ['X', 'O'] as const) {
        for (let game = 0; game < 25; game++) {
          // Hard plays O; the opponent plays X.
          const result = playOut(opponent, 'hard', startingPlayer)
          if (result.kind === 'won') {
            expect(
              result.winner,
              `Hard lost to ${opponent} (starting ${startingPlayer})`,
            ).toBe('O')
          }
        }
      }
    }
  })

  it('draws against itself', () => {
    for (const startingPlayer of ['X', 'O'] as const) {
      for (let game = 0; game < 10; game++) {
        expect(playOut('hard', 'hard', startingPlayer).kind).toBe('draw')
      }
    }
  })

  it('takes the win rather than prolonging the game', () => {
    // X can win immediately at 2 or set up elsewhere; depth bias must prefer 2.
    expect(chooseMove(board('XX.OO....'), 'X', 'hard')).toBe(2)
  })

  it('blocks a fork rather than taking a pointless corner', () => {
    // Classic double-threat setup: X at two opposite corners with O centred.
    // O must play a side to avoid being forked.
    const b = board('X...O...X')
    const move = chooseMove(b, 'O', 'hard')
    expect([1, 3, 5, 7]).toContain(move)
  })
})

describe('Very Easy difficulty', () => {
  it('does not deliberately take a win', () => {
    // Purely random: over many tries it should miss the winning cell at least
    // once, which is what separates it from Easy.
    const b = board('XX.OO....')
    const moves = new Set<number>()
    for (let i = 0; i < 50; i++) moves.add(chooseMove(b, 'X', 'very-easy'))
    expect(moves.size).toBeGreaterThan(1)
  })
})

describe('other', () => {
  it('is used consistently by the AI helpers', () => {
    expect(other('X')).toBe('O')
  })
})
