import {
  emptyCells as emptyCellsOf,
  other,
  statusOf,
  winningLine as winningLineOf,
} from '../shared/grid3'
import type { Cell, Line, Player, Status } from '../shared/grid3'

// The 3x3 line geometry lives in `../shared/grid3` because Advanced Tic Tac
// Toe needs the same questions asked of a bare cell array, at two nesting
// levels. What stays here is the part that is this game's own: a board that
// knows who moves first, and the rule for placing a mark on it.
export { WINNING_LINES } from '../shared/grid3'
export { other }
export type { Cell, Line, Player, Status } from '../shared/grid3'

export interface Board {
  readonly cells: readonly Cell[]
  /** Who moves first. Not always X — the coin-toss winner picks their mark. */
  readonly startingPlayer: Player
}

/** A fresh, empty board where `startingPlayer` moves first. */
export function emptyBoard(startingPlayer: Player = 'X'): Board {
  return { cells: Array<Cell>(9).fill(null), startingPlayer }
}

/**
 * The completed line of three cell indices, if any — the same line `status`
 * reports as a win, exposed separately so a caller drawing a strike-through
 * knows exactly which three cells to span rather than just that someone won.
 */
export function winningLine(board: Board): Line | null {
  return winningLineOf(board.cells)
}

export function status(board: Board): Status {
  return statusOf(board.cells)
}

export function emptyCells(board: Board): number[] {
  return emptyCellsOf(board.cells)
}

/** Whose turn it is: the starting player on even plies, their opponent on odd. */
export function currentPlayer(board: Board): Player {
  const placed = board.cells.filter((cell) => cell !== null).length
  return placed % 2 === 0 ? board.startingPlayer : other(board.startingPlayer)
}

/**
 * Returns the board after `player` plays `index`. Returns the *same* board
 * reference if the move is illegal — the cell is taken, or the round is already
 * decided — so callers can detect a no-op without duplicating the guards.
 */
export function place(board: Board, index: number, player: Player): Board {
  if (status(board).kind !== 'in-progress') return board
  if (board.cells[index] !== null) return board

  const cells = [...board.cells]
  cells[index] = player
  return { ...board, cells }
}
