import {
  emptyIndices,
  isFull,
  other,
  winningLine as lineIn,
  WINNING_LINES,
  type Cell,
  type Line,
  type Mark,
} from '../../lib/grid'

export { other, WINNING_LINES }
export type { Cell, Line }

/** This game's name for a mark. */
export type Player = Mark

export type Status =
  { kind: 'in-progress' } | { kind: 'won'; winner: Player } | { kind: 'draw' }

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
  return lineIn(board.cells)
}

export function status(board: Board): Status {
  const line = winningLine(board)
  // Checked before fullness, so a win on the very last move counts as a win
  // rather than a draw.
  if (line) return { kind: 'won', winner: board.cells[line[0]]! }
  if (isFull(board.cells)) return { kind: 'draw' }
  return { kind: 'in-progress' }
}

export function emptyCells(board: Board): number[] {
  return emptyIndices(board.cells)
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
