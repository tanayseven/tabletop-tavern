import {
  emptyCells,
  other,
  place,
  status,
  type Board,
  type Player,
} from './board'

export type Difficulty = 'very-easy' | 'easy' | 'medium' | 'hard'

export const DIFFICULTIES: readonly {
  id: Difficulty
  label: string
  blurb: string
}[] = [
  { id: 'very-easy', label: 'Very Easy', blurb: 'Moves completely at random.' },
  {
    id: 'easy',
    label: 'Easy',
    blurb: 'Takes a win and blocks a loss, otherwise moves at random.',
  },
  {
    id: 'medium',
    label: 'Medium',
    blurb: "Plays solid positions, but can miss a double-threat you've set up.",
  },
  {
    id: 'hard',
    label: 'Hard',
    blurb: 'Plays perfectly. The best you can do is draw.',
  },
]

/** Injectable so tests can make the random difficulties deterministic. */
export type Rng = () => number

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]
}

/** A move that would complete one of `mark`'s lines right now, if any. */
function winningMove(board: Board, mark: Player): number | null {
  for (const index of emptyCells(board)) {
    const trial = place(board, index, mark)
    const result = status(trial)
    if (result.kind === 'won' && result.winner === mark) return index
  }
  return null
}

const CENTER = 4
const CORNERS = [0, 2, 6, 8]
const SIDES = [1, 3, 5, 7]
const OPPOSITE_CORNER: readonly (readonly [number, number])[] = [
  [0, 8],
  [2, 6],
  [6, 2],
  [8, 0],
]

function mediumMove(board: Board, mark: Player, rng: Rng): number {
  const win = winningMove(board, mark)
  if (win !== null) return win

  const block = winningMove(board, other(mark))
  if (block !== null) return block

  if (board.cells[CENTER] === null) return CENTER

  // Take the corner opposite one the opponent holds — the standard reply that
  // keeps them from building a diagonal fork.
  const oppositeCorners = OPPOSITE_CORNER.filter(
    ([occupied, opposite]) =>
      board.cells[occupied] === other(mark) && board.cells[opposite] === null,
  ).map(([, opposite]) => opposite)
  if (oppositeCorners.length > 0) return pick(oppositeCorners, rng)

  const freeCorners = CORNERS.filter((i) => board.cells[i] === null)
  if (freeCorners.length > 0) return pick(freeCorners, rng)

  const freeSides = SIDES.filter((i) => board.cells[i] === null)
  if (freeSides.length > 0) return pick(freeSides, rng)

  return emptyCells(board)[0]
}

/**
 * Scores `board` from `maximizingFor`'s perspective assuming both sides play
 * optimally. `depth` biases toward faster wins and slower losses, so the AI
 * neither stalls a forced win nor hurries into a forced loss.
 */
function minimax(
  board: Board,
  mark: Player,
  maximizingFor: Player,
  depth: number,
  memo: Map<string, number>,
): number {
  // Tic Tac Toe has many transpositions -- the same position reached by
  // different move orders -- and re-searching them made a full Hard-vs-Hard
  // game take seconds. Within one search `depth` is fixed by how many cells
  // are filled, so the position and side to move identify a node completely.
  const key = `${board.cells.map((c) => c ?? '.').join('')}${mark}`
  const cached = memo.get(key)
  if (cached !== undefined) return cached

  const result = status(board)
  let score: number
  if (result.kind === 'won') {
    score = result.winner === maximizingFor ? 10 - depth : depth - 10
  } else if (result.kind === 'draw') {
    score = 0
  } else {
    const scores = emptyCells(board).map((index) =>
      minimax(
        place(board, index, mark),
        other(mark),
        maximizingFor,
        depth + 1,
        memo,
      ),
    )
    score = mark === maximizingFor ? Math.max(...scores) : Math.min(...scores)
  }

  memo.set(key, score)
  return score
}

function hardMove(board: Board, mark: Player, rng: Rng): number {
  const memo = new Map<string, number>()
  const scored = emptyCells(board).map((index) => ({
    index,
    score: minimax(place(board, index, mark), other(mark), mark, 1, memo),
  }))
  const best = Math.max(...scored.map((s) => s.score))
  // Choose randomly among equally-optimal moves so a perfect opponent still
  // varies its play rather than replaying one scripted game.
  return pick(
    scored.filter((s) => s.score === best).map((s) => s.index),
    rng,
  )
}

/**
 * Picks `mark`'s next move at the given difficulty. Callers must check the
 * round is still in progress first — an ended or full board has no move.
 */
export function chooseMove(
  board: Board,
  mark: Player,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): number {
  switch (difficulty) {
    case 'very-easy':
      return pick(emptyCells(board), rng)
    case 'easy': {
      const win = winningMove(board, mark)
      if (win !== null) return win
      const block = winningMove(board, other(mark))
      if (block !== null) return block
      return pick(emptyCells(board), rng)
    }
    case 'medium':
      return mediumMove(board, mark, rng)
    case 'hard':
      return hardMove(board, mark, rng)
  }
}
