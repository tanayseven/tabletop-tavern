import {
  emptyCells,
  isFull,
  other,
  statusOf,
  winningLine,
  type Cell,
  type Line,
  type Player,
  type Status,
} from '../shared/grid3'

export const BOARD_COUNT = 9
export const CELLS_PER_BOARD = 9

/** A move names both the small board and the cell inside it. */
export interface Move {
  readonly board: number
  readonly cell: number
}

/**
 * A match of Ultimate Tic Tac Toe: nine small boards, plus the one rule that
 * ties them together — the cell you play inside a small board names the small
 * board your opponent must play in next.
 *
 * Small boards are bare cell arrays rather than wrapped in a board type,
 * because nothing about a small board needs to know who moves first. Turn
 * order is a property of the match, which is why `startingPlayer` sits here
 * and nowhere else.
 */
export interface Game {
  readonly boards: readonly (readonly Cell[])[]
  /**
   * Who owns each small board; `null` for unowned, which includes drawn ones.
   * Deliberately a `Cell[]` and not a three-state union, so it can be handed
   * straight to the shared geometry to find the match-winning line.
   */
  readonly owners: readonly Cell[]
  /** Won *or* full: the boards that accept no further moves. */
  readonly decided: readonly boolean[]
  /** The board the mover must play in; `null` means any undecided board. */
  readonly target: number | null
  readonly turn: Player
  /** Match-level only — whoever won the coin toss. */
  readonly startingPlayer: Player
  readonly lastMove: Move | null
}

function emptyBoards(): Cell[][] {
  return Array.from({ length: BOARD_COUNT }, () =>
    Array<Cell>(CELLS_PER_BOARD).fill(null),
  )
}

function ownerOf(cells: readonly Cell[]): Cell {
  const result = statusOf(cells)
  return result.kind === 'won' ? result.winner : null
}

function isDecided(cells: readonly Cell[]): boolean {
  return winningLine(cells) !== null || isFull(cells)
}

export function emptyGame(startingPlayer: Player = 'X'): Game {
  return {
    boards: emptyBoards(),
    owners: Array<Cell>(BOARD_COUNT).fill(null),
    decided: Array<boolean>(BOARD_COUNT).fill(false),
    target: null,
    turn: startingPlayer,
    startingPlayer,
    lastMove: null,
  }
}

/**
 * Builds a game from its boards, recomputing `owners` and `decided` rather
 * than trusting them. Together with `play` this is the only way to make a
 * `Game`, which is what stops a test fixture from being internally
 * inconsistent.
 */
export function gameOf(init: {
  boards: readonly (readonly Cell[])[]
  target: number | null
  turn: Player
  startingPlayer?: Player
  lastMove?: Move | null
}): Game {
  const boards = init.boards.map((cells) => [...cells])
  return {
    boards,
    owners: boards.map(ownerOf),
    decided: boards.map(isDecided),
    target: init.target,
    turn: init.turn,
    startingPlayer: init.startingPlayer ?? init.turn,
    lastMove: init.lastMove ?? null,
  }
}

export function boardStatus(game: Game, board: number): Status {
  return statusOf(game.boards[board])
}

export function smallWinningLine(game: Game, board: number): Line | null {
  return winningLine(game.boards[board])
}

export function matchStatus(game: Game): Status {
  const line = winningLine(game.owners)
  // Checked before every board being decided, so a match won on the move that
  // decides the final board is a win rather than a draw.
  if (line) return { kind: 'won', winner: game.owners[line[0]]! }
  if (game.decided.every(Boolean)) return { kind: 'draw' }
  return { kind: 'in-progress' }
}

export function matchWinningLine(game: Game): Line | null {
  return winningLine(game.owners)
}

/**
 * The boards that may be played in right now: just the target when the mover
 * is forced there, every undecided board when the target is `null`.
 *
 * Empty only once the match is over, which is why the game can never stall:
 * being sent to a decided board always degrades to a free move.
 */
export function playableBoards(game: Game): number[] {
  if (matchStatus(game).kind !== 'in-progress') return []
  if (game.target !== null && !game.decided[game.target]) return [game.target]
  return game.decided.flatMap((done, index) => (done ? [] : [index]))
}

export function isPlayable(game: Game, board: number): boolean {
  return playableBoards(game).includes(board)
}

export function legalMoves(game: Game): Move[] {
  return playableBoards(game).flatMap((board) =>
    emptyCells(game.boards[board]).map((cell) => ({ board, cell })),
  )
}

/** Small boards owned by each mark. Shown to the player, never a tiebreak. */
export function boardsWon(game: Game): Record<Player, number> {
  return {
    X: game.owners.filter((owner) => owner === 'X').length,
    O: game.owners.filter((owner) => owner === 'O').length,
  }
}

export function sameMove(a: Move, b: Move): boolean {
  return a.board === b.board && a.cell === b.cell
}

/** A stable key for `{#each}` blocks and test fixtures. */
export function moveKey(move: Move): number {
  return move.board * CELLS_PER_BOARD + move.cell
}

/**
 * Returns the game after the mover plays `move`. Returns the *same* game
 * reference if the move is illegal — wrong board, occupied cell, or the match
 * is already decided — so callers can detect a no-op without duplicating the
 * guards, exactly as Tic Tac Toe's `place` does.
 */
export function play(game: Game, move: Move): Game {
  if (!isPlayable(game, move.board)) return game
  if (game.boards[move.board][move.cell] !== null) return game

  const cells = [...game.boards[move.board]]
  cells[move.cell] = game.turn
  const boards = [...game.boards]
  boards[move.board] = cells

  const owners = [...game.owners]
  owners[move.board] = ownerOf(cells)
  const decided = [...game.decided]
  decided[move.board] = isDecided(cells)

  return {
    boards,
    owners,
    decided,
    // Read *after* the board just played in has been re-decided, so winning or
    // filling the very board this move would have sent the opponent to grants
    // them a free move rather than trapping them in a finished board.
    target: decided[move.cell] ? null : move.cell,
    turn: other(game.turn),
    startingPlayer: game.startingPlayer,
    lastMove: move,
  }
}
