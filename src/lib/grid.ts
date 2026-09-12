/**
 * The 3x3 primitives both Tic Tac Toe games are built from: a mark, a nine-cell
 * grid, and the eight lines that win one.
 *
 * Ultimate Tic Tac Toe uses them twice over — once per small board, and again
 * for the meta-grid of boards already won — which is why they live here rather
 * than inside either game.
 */

export type Mark = 'X' | 'O'
export type Cell = Mark | null

/** Three cell indices that win a grid. */
export type Line = readonly [number, number, number]

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

export function other(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X'
}

export function emptyIndices(cells: readonly Cell[]): number[] {
  const out: number[] = []
  cells.forEach((cell, i) => {
    if (cell === null) out.push(i)
  })
  return out
}

export function isFull(cells: readonly Cell[]): boolean {
  return cells.every((cell) => cell !== null)
}

/**
 * The completed line, if any — exposed separately from the winner so a caller
 * drawing a strike-through knows exactly which three cells to span.
 */
export function winningLine(cells: readonly Cell[]): Line | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line
    const mark = cells[a]
    if (mark && mark === cells[b] && mark === cells[c]) return line
  }
  return null
}

export function winnerOf(cells: readonly Cell[]): Mark | null {
  const line = winningLine(cells)
  return line ? cells[line[0]]! : null
}

/** The lines running through each cell, so a "would this move win?" check
 * looks at three lines instead of all eight. */
export const LINES_THROUGH: readonly (readonly Line[])[] = Array.from(
  { length: 9 },
  (_, index) => WINNING_LINES.filter((line) => line.includes(index)),
)

/** True if `mark` played at `index` would complete a line on this grid. */
export function completes(
  cells: readonly Cell[],
  index: number,
  mark: Mark,
): boolean {
  if (cells[index] !== null) return false
  return LINES_THROUGH[index].some((line) =>
    line.every((i) => i === index || cells[i] === mark),
  )
}
