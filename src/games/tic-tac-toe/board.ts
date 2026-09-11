export type Player = 'X' | 'O'
export type Cell = Player | null

export type Status =
  { kind: 'in-progress' } | { kind: 'won'; winner: Player } | { kind: 'draw' }

export interface Board {
  readonly cells: readonly Cell[]
  /** Who moves first. Not always X — the coin-toss winner picks their mark. */
  readonly startingPlayer: Player
}

export const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
]

export function other(player: Player): Player {
  return player === 'X' ? 'O' : 'X'
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
export function winningLine(
  board: Board,
): readonly [number, number, number] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line
    const mark = board.cells[a]
    if (mark && mark === board.cells[b] && mark === board.cells[c]) return line
  }
  return null
}

export function status(board: Board): Status {
  const line = winningLine(board)
  // Checked before fullness, so a win on the very last move counts as a win
  // rather than a draw.
  if (line) return { kind: 'won', winner: board.cells[line[0]]! }
  if (board.cells.every((cell) => cell !== null)) return { kind: 'draw' }
  return { kind: 'in-progress' }
}

export function emptyCells(board: Board): number[] {
  const out: number[] = []
  board.cells.forEach((cell, i) => {
    if (cell === null) out.push(i)
  })
  return out
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
