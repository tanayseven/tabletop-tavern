import { describe, expect, it } from 'vitest'
import {
  FINAL_FRAME,
  FRAMES,
  holdAt,
  MOVE_MS,
  playerAt,
  SCRIPT,
  START_HOLD_MS,
  TOTAL_MS,
  WIN_HOLD_MS,
} from './preview'
import { statusOf, winningLine } from '../shared/grid3'

describe('menu preview script', () => {
  it('is a legal sequence of moves', () => {
    for (const index of SCRIPT) {
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(9)
    }
    // No cell played twice -- otherwise a mark would appear to change owner
    // halfway through the loop.
    expect(new Set(SCRIPT).size).toBe(SCRIPT.length)
  })

  it('alternates from X', () => {
    expect(playerAt(0)).toBe('X')
    expect(playerAt(1)).toBe('O')
    expect(playerAt(SCRIPT.length - 1)).toBe('X')
  })

  it('builds one frame per position, starting empty', () => {
    expect(FRAMES).toHaveLength(SCRIPT.length + 1)
    expect(FRAMES[0].cells.every((cell) => cell === null)).toBe(true)

    FRAMES.forEach((frame, step) => {
      const played = frame.cells.filter((cell) => cell !== null)
      expect(played).toHaveLength(step)
    })
  })

  it('stays undecided until the last move', () => {
    // The point of the animation is watching a game finish. A win partway
    // through would leave the rest of the script playing on a decided board.
    for (const frame of FRAMES.slice(0, -1)) {
      expect(statusOf(frame.cells).kind).toBe('in-progress')
      expect(frame.line).toBeNull()
    }
  })

  it('ends on a win, with the line to highlight', () => {
    expect(statusOf(FINAL_FRAME.cells)).toEqual({ kind: 'won', winner: 'X' })
    expect(FINAL_FRAME.line).toEqual(winningLine(FINAL_FRAME.cells))
    expect(FINAL_FRAME).toBe(FRAMES[FRAMES.length - 1])
  })

  it('holds the empty and finished boards longer than a move', () => {
    expect(holdAt(0)).toBe(START_HOLD_MS)
    expect(holdAt(FRAMES.length - 1)).toBe(WIN_HOLD_MS)
    expect(holdAt(1)).toBe(MOVE_MS)

    expect(START_HOLD_MS).toBeGreaterThan(MOVE_MS)
    expect(WIN_HOLD_MS).toBeGreaterThan(MOVE_MS)
  })

  it('reports the length of one pass', () => {
    const moves = FRAMES.length - 2 // every frame but the first and the last
    expect(TOTAL_MS).toBe(START_HOLD_MS + moves * MOVE_MS + WIN_HOLD_MS)
  })
})
