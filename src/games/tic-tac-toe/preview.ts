/**
 * The scripted game that plays itself on the Tic Tac Toe menu card.
 *
 * It is a decoration, not a game: there is no opponent and no input, just one
 * fixed sequence of moves replayed forever. Keeping it here as data — rather
 * than as a run of the real AI against itself — means the menu costs nothing
 * to animate and always shows the same, deliberately readable game.
 *
 * The script is a legal game in which each block is a block a player would
 * actually make, except for O's sixth move: O misses the block and X takes the
 * middle column. `preview.test.ts` holds it to that, so a future edit of the
 * move list can't quietly produce an illegal or already-won board.
 */

import { winningLine, type Cell, type Line, type Player } from '../shared/grid3'

/**
 * Cell indices in play order, X first and alternating. Seven moves: X takes the
 * centre, the two trade corners and blocks, and X closes the middle column.
 */
export const SCRIPT: readonly number[] = [4, 0, 6, 2, 1, 5, 7]

/** Whose move the nth one is — X plays first, so even indices are X's. */
export function playerAt(move: number): Player {
  return move % 2 === 0 ? 'X' : 'O'
}

export interface PreviewFrame {
  cells: readonly Cell[]
  /** The three cells to highlight, set only on the final frame. */
  line: Line | null
}

/**
 * One frame per position the script passes through: an empty board, then the
 * board after each move. The animation is a walk along this list, so nothing
 * is computed while it runs.
 */
export const FRAMES: readonly PreviewFrame[] = buildFrames()

function buildFrames(): PreviewFrame[] {
  const cells: Cell[] = Array(9).fill(null)
  const frames: PreviewFrame[] = [{ cells: [...cells], line: null }]

  SCRIPT.forEach((index, move) => {
    cells[index] = playerAt(move)
    frames.push({ cells: [...cells], line: winningLine(cells) })
  })

  return frames
}

/** The finished board, which is also what a reduced-motion viewer sees. */
export const FINAL_FRAME = FRAMES[FRAMES.length - 1]

/** How long each move sits on screen before the next one lands. */
export const MOVE_MS = 420

/** The empty board at the top of the loop, so a replay reads as a new game. */
export const START_HOLD_MS = 600

/** The won board, held long enough to take in before it clears. */
export const WIN_HOLD_MS = 1800

/** How long frame `step` stays up. */
export function holdAt(step: number): number {
  if (step === 0) return START_HOLD_MS
  if (step === FRAMES.length - 1) return WIN_HOLD_MS
  return MOVE_MS
}

/** One full pass, for anyone timing the loop. */
export const TOTAL_MS = FRAMES.reduce((sum, _, step) => sum + holdAt(step), 0)
