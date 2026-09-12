/**
 * The 3x3 line geometry, shared by every game built on a noughts-and-crosses
 * grid.
 *
 * Everything here works on a bare `Cell[]` rather than on any game's board
 * type, which is what lets one copy serve two *levels* of the same game:
 * Advanced Tic Tac Toe asks these questions of the nine cells inside a small
 * board and of the nine board owners above them, and they are the same
 * questions.
 */

export type Player = 'X' | 'O'
export type Cell = Player | null

/** Three indices that win, in the order rows/columns/diagonals are listed. */
export type Line = readonly [number, number, number]

export type Status =
  { kind: 'in-progress' } | { kind: 'won'; winner: Player } | { kind: 'draw' }

export const CELL_COUNT = 9
export const CENTER = 4
export const CORNERS: readonly number[] = [0, 2, 6, 8]
export const SIDES: readonly number[] = [1, 3, 5, 7]

export const WINNING_LINES: readonly Line[] = [
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

/**
 * The completed line of three indices, if any — exposed separately from
 * `statusOf` so a caller drawing a strike-through knows exactly which three
 * cells to span rather than just that someone won.
 */
export function winningLine(cells: readonly Cell[]): Line | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line
    const mark = cells[a]
    if (mark && mark === cells[b] && mark === cells[c]) return line
  }
  return null
}

export function isFull(cells: readonly Cell[]): boolean {
  return cells.every((cell) => cell !== null)
}

export function statusOf(cells: readonly Cell[]): Status {
  const line = winningLine(cells)
  // Checked before fullness, so a win on the very last move counts as a win
  // rather than a draw.
  if (line) return { kind: 'won', winner: cells[line[0]]! }
  if (isFull(cells)) return { kind: 'draw' }
  return { kind: 'in-progress' }
}

export function emptyCells(cells: readonly Cell[]): number[] {
  const out: number[] = []
  cells.forEach((cell, i) => {
    if (cell === null) out.push(i)
  })
  return out
}

/** 1-based row/column of an index, for aria labels and status text. */
export function coords(index: number): { row: number; column: number } {
  return { row: Math.floor(index / 3) + 1, column: (index % 3) + 1 }
}
