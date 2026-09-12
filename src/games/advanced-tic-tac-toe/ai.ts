import { pick } from '../shared/difficulty'
import type { Difficulty, DifficultyOption, Rng } from '../shared/difficulty'
import {
  CENTER,
  CORNERS,
  other,
  winningLine,
  WINNING_LINES,
  type Cell,
  type Player,
} from '../shared/grid3'
import { legalMoves, matchStatus, play, type Game, type Move } from './game'

export type { Difficulty, Rng } from '../shared/difficulty'

// Deliberately *not* Tic Tac Toe's wording. That game's Hard is a full
// minimax and genuinely unbeatable; this one looks a few moves ahead and can
// be outplayed, so the blurb must not promise perfection.
export const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'very-easy', label: 'Very Easy', blurb: 'Moves completely at random.' },
  {
    id: 'easy',
    label: 'Easy',
    blurb: 'Takes a board and blocks yours, but ignores where it sends you.',
  },
  {
    id: 'medium',
    label: 'Medium',
    blurb: 'Plays for position, and is careful about where it sends you.',
  },
  {
    id: 'hard',
    label: 'Hard',
    blurb: 'Looks several moves ahead. Strong, but not unbeatable.',
  },
]

/** How deep Hard searches, and the cap that keeps that search honest. */
export const HARD_DEPTH = 4
export const HARD_NODE_BUDGET = 30_000

export interface SearchResult {
  move: Move
  score: number
  depth: number
  nodes: number
}

const WIN_SCORE = 1_000_000

function winsBoard(
  cells: readonly Cell[],
  cell: number,
  mark: Player,
): boolean {
  const trial = [...cells]
  trial[cell] = mark
  const line = winningLine(trial)
  return line !== null && trial[line[0]] === mark
}

/** Moves that would win their small board outright for `mark`. */
function boardWinningMoves(game: Game, mark: Player): Move[] {
  return legalMoves(game).filter((move) =>
    winsBoard(game.boards[move.board], move.cell, mark),
  )
}

/** Would owning `board` complete a line of boards for `mark`? */
function completesMatch(owners: readonly Cell[], board: number, mark: Player) {
  const trial = [...owners]
  trial[board] = mark
  const line = winningLine(trial)
  return line !== null && trial[line[0]] === mark
}

/** A move that wins the whole match right now, if there is one. */
function matchWinningMove(game: Game, mark: Player): Move | null {
  for (const move of boardWinningMoves(game, mark)) {
    if (completesMatch(game.owners, move.board, mark)) return move
  }
  return null
}

/**
 * Cells that would let `mark` win `board` next turn. Used both to take a board
 * and to deny one.
 */
function threatCells(cells: readonly Cell[], mark: Player): number[] {
  const out: number[] = []
  cells.forEach((cell, index) => {
    if (cell === null && winsBoard(cells, index, mark)) out.push(index)
  })
  return out
}

function easyMove(game: Game, mark: Player, rng: Rng): Move {
  const match = matchWinningMove(game, mark)
  // Above taking an ordinary board: several board wins may be on offer and
  // only one of them ends the match.
  if (match) return match

  const take = boardWinningMoves(game, mark)
  if (take.length > 0) return pick(take, rng)

  const block = legalMoves(game).filter((move) =>
    threatCells(game.boards[move.board], other(mark)).includes(move.cell),
  )
  if (block.length > 0) return pick(block, rng)

  return pick(legalMoves(game), rng)
}

/** Count of lines in `cells` holding `n` of `mark` and none of the opponent. */
function openLines(cells: readonly Cell[], mark: Player, n: number): number {
  const them = other(mark)
  let count = 0
  for (const line of WINNING_LINES) {
    let mine = 0
    let blocked = false
    for (const index of line) {
      if (cells[index] === mark) mine++
      else if (cells[index] === them) blocked = true
    }
    if (!blocked && mine === n) count++
  }
  return count
}

interface LineCounts {
  x2: number
  x1: number
  o2: number
  o1: number
}

/**
 * Every open-line count for both marks in a single pass. `evaluate` needs four
 * of these per board across nine boards; asking `openLines` for them
 * separately rescans the same eight lines 36 times per leaf, which was the
 * dominant cost of the whole search.
 */
function lineCounts(cells: readonly Cell[]): LineCounts {
  const counts: LineCounts = { x2: 0, x1: 0, o2: 0, o1: 0 }
  for (const line of WINNING_LINES) {
    let x = 0
    let o = 0
    for (const index of line) {
      const cell = cells[index]
      if (cell === 'X') x++
      else if (cell === 'O') o++
    }
    if (o === 0) {
      if (x === 2) counts.x2++
      else if (x === 1) counts.x1++
    }
    if (x === 0) {
      if (o === 2) counts.o2++
      else if (o === 1) counts.o1++
    }
  }
  return counts
}

const BOARD_VALUE = (board: number) =>
  board === CENTER ? 120 : CORNERS.includes(board) ? 60 : 30
const CELL_VALUE = (cell: number) =>
  cell === CENTER ? 40 : CORNERS.includes(cell) ? 15 : 5

/**
 * Medium's judgement of a single move, exported so each term can be tested on
 * its own rather than through whichever move happens to come out on top. Hard
 * uses it to rank its *root* moves, but orders deeper nodes with the much
 * cheaper `orderKey` — see there.
 */
export function scoreMove(game: Game, mark: Player, move: Move): number {
  const them = other(mark)
  const cells = game.boards[move.board]
  let score = 0

  const takesBoard = winsBoard(cells, move.cell, mark)
  if (takesBoard) {
    if (completesMatch(game.owners, move.board, mark)) return WIN_SCORE
    score += 600 + BOARD_VALUE(move.board)

    const owners = [...game.owners]
    owners[move.board] = mark
    score += 250 * openLines(owners, mark, 2)
  }

  // Denying a board the opponent could otherwise complete. Worth most when
  // that board would have won them the match.
  if (threatCells(cells, them).includes(move.cell)) {
    score += completesMatch(game.owners, move.board, them) ? 5000 : 400
  }

  score += CELL_VALUE(move.cell)

  const after = [...cells]
  after[move.cell] = mark
  score += 25 * (openLines(after, mark, 2) - openLines(cells, mark, 2))

  // Where this move sends the opponent -- the terms that make this feel like
  // Ultimate rather than nine unrelated games.
  const next = play(game, move)
  if (next !== game) {
    if (next.target === null) {
      score -= 300
    } else {
      const targetCells = next.boards[next.target]
      if (threatCells(targetCells, them).length > 0) score -= 450
      if (openLines(targetCells, mark, 2) > 0) score += 60
    }
  }

  return score
}

function bestBy(
  moves: readonly Move[],
  score: (move: Move) => number,
  rng: Rng,
): Move {
  const scored = moves.map((move) => ({ move, value: score(move) }))
  const best = Math.max(...scored.map((s) => s.value))
  return pick(
    scored.filter((s) => s.value === best).map((s) => s.move),
    rng,
  )
}

/**
 * Hard's judgement of a whole position, from `mark`'s point of view. Exported
 * so the weighting can be tested directly.
 */
export function evaluate(game: Game, mark: Player, ply = 0): number {
  const result = matchStatus(game)
  if (result.kind === 'won') {
    return result.winner === mark ? WIN_SCORE - ply : ply - WIN_SCORE
  }
  if (result.kind === 'draw') return 0

  const them = other(mark)
  // `sign` folds the X/O split into one pass: everything below is counted for
  // X and flipped at the end if we are judging for O.
  const sign = mark === 'X' ? 1 : -1
  let score = 0

  const meta = lineCounts(game.owners)
  score += sign * (600 * (meta.x2 - meta.o2) + 100 * (meta.x1 - meta.o1))

  game.owners.forEach((owner, board) => {
    if (owner === mark) score += 250 + BOARD_VALUE(board)
    else if (owner === them) score -= 250 + BOARD_VALUE(board)
  })

  game.boards.forEach((cells, board) => {
    if (game.decided[board]) return
    const counts = lineCounts(cells)
    score += sign * (8 * (counts.x2 - counts.o2) + 2 * (counts.x1 - counts.o1))
    if (cells[CENTER] === mark) score += 6
    else if (cells[CENTER] === them) score -= 6
  })

  // Having the free move is worth something; handing it over costs the same.
  if (game.target === null) score += game.turn === mark ? 40 : -40

  return score
}

/**
 * Cheap move ordering for inside the search. Deliberately *not* `scoreMove`:
 * that one plays the move out and rescans several lines, which at hundreds of
 * thousands of calls costs far more than the extra cutoffs it buys. Taking or
 * denying a board first is most of the ordering benefit anyway.
 */
function orderKey(game: Game, mover: Player, move: Move): number {
  const cells = game.boards[move.board]
  if (winsBoard(cells, move.cell, mover)) return 1000 + BOARD_VALUE(move.board)
  if (winsBoard(cells, move.cell, other(mover))) return 500
  return CELL_VALUE(move.cell)
}

interface Budget {
  nodes: number
  limit: number
}

class BudgetExhausted extends Error {}

function negamax(
  game: Game,
  mark: Player,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  budget: Budget,
): number {
  if (++budget.nodes > budget.limit) throw new BudgetExhausted()

  if (depth === 0 || matchStatus(game).kind !== 'in-progress') {
    return evaluate(game, mark, ply)
  }

  const ordered = legalMoves(game)
    .map((move) => ({ move, order: orderKey(game, game.turn, move) }))
    .sort((a, b) => b.order - a.order)
    .map((m) => m.move)

  let best = -Infinity
  let a = alpha
  for (const move of ordered) {
    const score = -negamax(
      play(game, move),
      other(mark),
      depth - 1,
      ply + 1,
      -beta,
      -a,
      budget,
    )
    if (score > best) best = score
    if (best > a) a = best
    if (a >= beta) break
  }
  return best
}

/**
 * Iteratively deepened alpha-beta, bounded by a *node* count rather than a
 * clock. A node budget is machine-independent, so the same position yields the
 * same move on CI and on a laptop; a time budget would make every test of Hard
 * flaky. When the budget runs out mid-iteration that iteration is abandoned
 * and the best move from the last completed depth stands.
 *
 * No transposition table: unlike a single 3x3 board, positions here are 81
 * cells plus a target and almost never repeat, so the key would cost more to
 * build than the lookups save. Spend the budget on move ordering instead.
 */
export function search(
  game: Game,
  mark: Player,
  opts: { depth?: number; nodeBudget?: number; rng?: Rng } = {},
): SearchResult {
  const maxDepth = opts.depth ?? HARD_DEPTH
  const rng = opts.rng ?? Math.random
  const budget: Budget = {
    nodes: 0,
    limit: opts.nodeBudget ?? HARD_NODE_BUDGET,
  }

  const moves = legalMoves(game)
  let best: SearchResult = {
    move: bestBy(moves, (move) => scoreMove(game, mark, move), rng),
    score: 0,
    depth: 0,
    nodes: 0,
  }

  for (let depth = 2; depth <= maxDepth; depth++) {
    try {
      const scored = moves.map((move) => ({
        move,
        value: -negamax(
          play(game, move),
          other(mark),
          depth - 1,
          1,
          -Infinity,
          Infinity,
          budget,
        ),
      }))
      const top = Math.max(...scored.map((s) => s.value))
      best = {
        // Randomness only ever breaks ties between equally-rated root moves;
        // the search itself is deterministic.
        move: pick(
          scored.filter((s) => s.value === top).map((s) => s.move),
          rng,
        ),
        score: top,
        depth,
        nodes: budget.nodes,
      }
    } catch (error) {
      if (error instanceof BudgetExhausted) break
      throw error
    }
  }

  return { ...best, nodes: budget.nodes }
}

/**
 * Picks the mover's next move at the given difficulty. Callers must check the
 * match is still in progress first — a decided match has no move.
 */
export function chooseMove(
  game: Game,
  mark: Player,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): Move {
  const moves = legalMoves(game)

  switch (difficulty) {
    case 'very-easy':
      return pick(moves, rng)
    case 'easy':
      return easyMove(game, mark, rng)
    case 'medium':
      return bestBy(moves, (move) => scoreMove(game, mark, move), rng)
    case 'hard':
      return search(game, mark, { rng }).move
  }
}
