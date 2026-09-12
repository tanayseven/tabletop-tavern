import {
  emptyIndices,
  isFull,
  other,
  winningLine,
  type Cell,
  type Line,
  type Mark,
} from '../../lib/grid'

export { other, winningLine }
export type { Cell, Line, Mark }

/**
 * Ultimate Tic Tac Toe: nine small boards arranged as a 3x3 meta-grid.
 *
 * The twist is that you don't choose which small board to play in — the *cell*
 * your opponent just played dictates it. Play the centre cell of any board and
 * your opponent must answer in the centre board. Win a small board and you
 * claim its square on the meta-grid; three claimed squares in a line wins the
 * match.
 */

/** A move names the small board and the cell within it. */
export interface Move {
  readonly board: number
  readonly cell: number
}

export type Result =
  | { kind: 'in-progress' }
  | { kind: 'won'; winner: Mark; line: Line }
  | { kind: 'draw' }

export interface Game {
  /** Nine small boards, each of nine cells, in reading order. */
  readonly boards: readonly (readonly Cell[])[]
  /**
   * The board the mover is confined to, or `null` when they may choose any
   * undecided one — which happens on the opening move, and whenever the board
   * they were sent to has already been won or filled.
   */
  readonly activeBoard: number | null
  /** Who moves first. Not always X — the coin-toss winner picks their mark. */
  readonly startingPlayer: Mark
}

export function emptyGame(startingPlayer: Mark = 'X'): Game {
  return {
    boards: Array.from({ length: 9 }, () => Array<Cell>(9).fill(null)),
    activeBoard: null,
    startingPlayer,
  }
}

/** The outcome of one small board. */
export function boardResult(cells: readonly Cell[]): Result {
  const line = winningLine(cells)
  // Checked before fullness, so a win on the very last cell counts as a win
  // rather than a draw.
  if (line) return { kind: 'won', winner: cells[line[0]]!, line }
  if (isFull(cells)) return { kind: 'draw' }
  return { kind: 'in-progress' }
}

/** A board nobody can play in any more: won outright, or full. */
export function isDecided(cells: readonly Cell[]): boolean {
  return boardResult(cells).kind !== 'in-progress'
}

/**
 * Everything derived from a position: who holds each small board, which boards
 * are closed, and the match result.
 *
 * Deriving these means scanning 80-odd lines, and the search asks for them
 * several times per node, so they are computed once per position and cached.
 * A `Game` is immutable and every move builds a new one, so the cache can never
 * go stale; a `WeakMap` lets the abandoned branches of a search be collected.
 */
interface Derived {
  readonly meta: readonly Cell[]
  readonly decided: readonly boolean[]
  readonly result: Result
}

const derivedCache = new WeakMap<Game, Derived>()

function derive(game: Game): Derived {
  const cached = derivedCache.get(game)
  if (cached) return cached

  const meta: Cell[] = []
  const decided: boolean[] = []
  for (const cells of game.boards) {
    const line = winningLine(cells)
    meta.push(line ? cells[line[0]]! : null)
    decided.push(line !== null || isFull(cells))
  }

  const metaLine = winningLine(meta)
  const result: Result = metaLine
    ? { kind: 'won', winner: meta[metaLine[0]]!, line: metaLine }
    : decided.every(Boolean)
      ? { kind: 'draw' }
      : { kind: 'in-progress' }

  const value = { meta, decided, result }
  derivedCache.set(game, value)
  return value
}

/**
 * The meta-grid: who holds each small board, as a nine-cell grid of its own. A
 * drawn board stays `null`, so it can never form part of a winning meta-line.
 */
export function metaCells(game: Game): readonly Cell[] {
  return derive(game).meta
}

/** Which small boards are closed to further play, by index. */
export function decidedBoards(game: Game): readonly boolean[] {
  return derive(game).decided
}

/** The boards the mover may legally play in right now. */
export function playableBoards(game: Game): number[] {
  const { decided, result } = derive(game)
  if (result.kind !== 'in-progress') return []
  if (game.activeBoard !== null && !decided[game.activeBoard]) {
    return [game.activeBoard]
  }
  const out: number[] = []
  decided.forEach((closed, index) => {
    if (!closed) out.push(index)
  })
  return out
}

export function legalMoves(game: Game): Move[] {
  return playableBoards(game).flatMap((board) =>
    emptyIndices(game.boards[board]).map((cell) => ({ board, cell })),
  )
}

export function isLegal(game: Game, move: Move): boolean {
  return (
    playableBoards(game).includes(move.board) &&
    game.boards[move.board][move.cell] === null
  )
}

export function status(game: Game): Result {
  return derive(game).result
}

/** Whose turn it is: the starting player on even plies, their opponent on odd. */
export function currentPlayer(game: Game): Mark {
  const placed = game.boards.reduce(
    (total, cells) => total + cells.filter((cell) => cell !== null).length,
    0,
  )
  return placed % 2 === 0 ? game.startingPlayer : other(game.startingPlayer)
}

/**
 * Returns the game after `mark` plays `move`. Returns the *same* game reference
 * if the move is illegal — wrong board, taken cell, or the match already
 * decided — so callers can detect a no-op without duplicating the guards.
 */
export function play(game: Game, move: Move, mark: Mark): Game {
  if (!isLegal(game, move)) return game

  const boards = game.boards.map((cells, index) => {
    if (index !== move.board) return cells
    const next = [...cells]
    next[move.cell] = mark
    return next
  })

  // The cell just played names the board the opponent is sent to -- unless that
  // board is already settled, in which case they get a free choice.
  const sentTo = move.cell
  return {
    ...game,
    boards,
    activeBoard: isDecided(boards[sentTo]) ? null : sentTo,
  }
}
