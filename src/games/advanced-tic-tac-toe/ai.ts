import {
  boardResult,
  currentPlayer,
  decidedBoards,
  legalMoves,
  metaCells,
  other,
  play,
  status,
  type Game,
  type Mark,
  type Move,
} from './board'
import { completes, WINNING_LINES, type Cell } from '../../lib/grid'
import type { Difficulty, DifficultyOption } from '../../lib/setup'

export type { Difficulty }

export const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'very-easy', label: 'Very Easy', blurb: 'Moves completely at random.' },
  {
    id: 'easy',
    label: 'Easy',
    blurb: 'Takes and blocks small boards, but ignores the bigger picture.',
  },
  {
    id: 'medium',
    label: 'Medium',
    blurb: 'Plays for the meta-grid and looks one move ahead.',
  },
  {
    id: 'hard',
    label: 'Hard',
    blurb: 'Searches several moves deep and watches where it sends you.',
  },
]

/** Injectable so tests can make the random difficulties deterministic. */
export type Rng = () => number

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]
}

/**
 * How much each square of the meta-grid is worth. Ultimate Tic Tac Toe rewards
 * the centre and the corners for the same reason ordinary Tic Tac Toe does:
 * they sit on more winning lines.
 */
const META_WEIGHT = [3, 2, 3, 2, 4, 2, 3, 2, 3]

/** Unreachable by any positional term, so a forced win always outranks shape. */
const WIN_SCORE = 1_000_000

/**
 * The search is bounded by a node budget rather than a clock, so the computer
 * does the same work on a slow phone as on a desktop — and, more importantly,
 * so its play is deterministic and its tests cannot flake.
 */
const NODE_BUDGET = 24_000
const MAX_DEPTH = 5

/**
 * The centre cell of the centre board: the accepted strongest opening, and by
 * far the most expensive position to search — all 81 moves are legal and the
 * position is symmetric, so the search pays the most to learn the least.
 */
const OPENING: Move = { board: 4, cell: 4 }

/** Lines where `mark` holds two cells and the third is still free. */
function openTwos(cells: readonly Cell[], mark: Mark): number {
  let count = 0
  for (const line of WINNING_LINES) {
    let mine = 0
    let blocked = false
    for (const index of line) {
      const cell = cells[index]
      if (cell === mark) mine += 1
      else if (cell !== null) blocked = true
    }
    if (!blocked && mine === 2) count += 1
  }
  return count
}

/**
 * Scores a position from `me`'s perspective without searching: who holds which
 * small boards, who is threatening to take more, and who has to move next.
 */
export function evaluate(game: Game, me: Mark): number {
  const them = other(me)
  const meta = metaCells(game)
  const decided = decidedBoards(game)
  let score = 0

  meta.forEach((holder, index) => {
    if (holder === me) score += 120 * META_WEIGHT[index]
    else if (holder === them) score -= 120 * META_WEIGHT[index]
  })

  // A meta-line two-thirds complete, with the deciding board still winnable.
  for (const line of WINNING_LINES) {
    const mine = line.filter((i) => meta[i] === me).length
    const theirs = line.filter((i) => meta[i] === them).length
    const open = line.find((i) => meta[i] === null && !decided[i])
    if (open === undefined) continue
    if (theirs === 0 && mine === 2) score += 400
    if (mine === 0 && theirs === 2) score -= 400
  }

  // Shape inside the boards still in play, weighted by how much the square of
  // the meta-grid they sit on is worth.
  game.boards.forEach((cells, index) => {
    if (decided[index]) return
    score +=
      4 * META_WEIGHT[index] * (openTwos(cells, me) - openTwos(cells, them))
    if (cells[4] === me) score += 3
    else if (cells[4] === them) score -= 3
  })

  // Handing the opponent a free choice of board is the classic blunder.
  if (game.activeBoard === null) {
    score += currentPlayer(game) === me ? 30 : -30
  }

  return score
}

/**
 * A cheap score used only to order moves, so alpha-beta prunes sooner. Keeping
 * it cheap is the point: playing each move out and evaluating the result costs
 * more than the pruning saves.
 */
function moveOrder(
  game: Game,
  move: Move,
  mover: Mark,
  decided: readonly boolean[],
): number {
  const cells = game.boards[move.board]
  let score = 0

  if (completes(cells, move.cell, mover)) score += 500
  // The cell the opponent would have taken that board with, so playing it
  // blocks them.
  if (completes(cells, move.cell, other(mover))) score += 200

  // Where it sends them. A settled board hands over a free choice, which is the
  // classic blunder; otherwise, the less the board is worth, the better.
  if (decided[move.cell]) score -= 300
  else score -= META_WEIGHT[move.cell] * 10

  return score
}

function orderedMoves(game: Game, mover: Mark): Move[] {
  const decided = decidedBoards(game)
  return legalMoves(game)
    .map((move) => ({ move, rank: moveOrder(game, move, mover, decided) }))
    .sort((a, b) => b.rank - a.rank)
    .map((entry) => entry.move)
}

interface Budget {
  nodes: number
}

function search(
  game: Game,
  me: Mark,
  depth: number,
  alpha: number,
  beta: number,
  budget: Budget,
): number {
  const result = status(game)
  if (result.kind === 'won') {
    // `depth` is what's left to search, so a win found sooner scores higher --
    // the computer neither stalls a forced win nor hurries into a loss.
    return result.winner === me ? WIN_SCORE + depth : -(WIN_SCORE + depth)
  }
  if (result.kind === 'draw') return 0
  if (depth === 0 || budget.nodes >= NODE_BUDGET) return evaluate(game, me)

  const mover = currentPlayer(game)
  const maximizing = mover === me
  let best = maximizing ? -Infinity : Infinity

  for (const move of orderedMoves(game, mover)) {
    budget.nodes += 1
    const score = search(
      play(game, move, mover),
      me,
      depth - 1,
      alpha,
      beta,
      budget,
    )
    if (maximizing) {
      best = Math.max(best, score)
      alpha = Math.max(alpha, score)
    } else {
      best = Math.min(best, score)
      beta = Math.min(beta, score)
    }
    if (beta <= alpha) break // the other side would never allow this line
  }

  return best
}

/** The best move at a given search depth, with ties broken at random. */
function bestMove(game: Game, mark: Mark, depth: number, rng: Rng): Move {
  // Nothing played yet: every move is legal and the position is symmetric, so
  // searching all 81 branches buys nothing the opening already knows.
  if (legalMoves(game).length === 81) return OPENING

  const budget: Budget = { nodes: 0 }
  const scored = orderedMoves(game, mark).map((move) => ({
    move,
    score: search(
      play(game, move, mark),
      mark,
      depth - 1,
      -Infinity,
      Infinity,
      budget,
    ),
  }))
  const best = Math.max(...scored.map((entry) => entry.score))
  return pick(
    scored.filter((entry) => entry.score === best).map((entry) => entry.move),
    rng,
  )
}

/** A move that wins the small board it's played on, if there is one. */
function smallBoardWin(game: Game, mark: Mark): Move | null {
  for (const move of legalMoves(game)) {
    const after = play(game, move, mark)
    const result = boardResult(after.boards[move.board])
    if (result.kind === 'won' && result.winner === mark) return move
  }
  return null
}

/**
 * Picks `mark`'s next move at the given difficulty. Callers must check the
 * match is still in progress first — a decided game has no move.
 */
export function chooseMove(
  game: Game,
  mark: Mark,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): Move {
  const moves = legalMoves(game)

  switch (difficulty) {
    case 'very-easy':
      return pick(moves, rng)

    case 'easy': {
      const win = smallBoardWin(game, mark)
      if (win) return win

      // Block by taking the cell the opponent would have won that board with.
      const block = smallBoardWin(game, other(mark))
      if (block) return block

      return pick(moves, rng)
    }

    case 'medium':
      // Deep enough to see the opponent's immediate reply, shallow enough to
      // walk into anything further out.
      return bestMove(game, mark, 2, rng)

    case 'hard':
      return bestMove(game, mark, MAX_DEPTH, rng)
  }
}
