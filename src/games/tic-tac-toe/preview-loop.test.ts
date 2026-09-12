import { render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Preview from './Preview.svelte'
import { FRAMES, holdAt, playerAt, SCRIPT } from './preview'

/** The nine cells, as the text they show ('' for an empty one). */
function board(container: HTMLElement): string[] {
  return [...container.querySelectorAll('.cell')].map((cell) =>
    (cell.textContent ?? '').trim(),
  )
}

function winningCells(container: HTMLElement): number[] {
  return [...container.querySelectorAll('.cell')].flatMap((cell, index) =>
    cell.classList.contains('winning') ? [index] : [],
  )
}

/** Advance past frame `step`, so the next one is on screen. */
async function pastFrame(step: number) {
  await vi.advanceTimersByTimeAsync(holdAt(step))
}

describe('menu preview animation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is hidden from the accessibility tree', () => {
    // It renders inside the card's button, so anything it exposed would be
    // folded into that button's name.
    const { container } = render(Preview)
    expect(container.querySelector('.preview')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  it('starts on an empty board', () => {
    const { container } = render(Preview)
    expect(board(container)).toEqual(Array(9).fill(''))
  })

  it('plays the script one move at a time', async () => {
    const { container } = render(Preview)

    for (const [move, index] of SCRIPT.entries()) {
      await pastFrame(move)
      expect(board(container)[index]).toBe(playerAt(move))
      // Only the moves played so far, so the whole board doesn't appear at once.
      expect(board(container).filter(Boolean)).toHaveLength(move + 1)
    }
  })

  it('highlights the winning line once the game is won', async () => {
    const { container } = render(Preview)
    for (const step of SCRIPT.keys()) await pastFrame(step)

    expect(winningCells(container)).toEqual([
      ...FRAMES[FRAMES.length - 1].line!,
    ])
  })

  it('clears the board and starts over', async () => {
    const { container } = render(Preview)
    for (const step of FRAMES.keys()) await pastFrame(step)

    expect(board(container)).toEqual(Array(9).fill(''))
    expect(winningCells(container)).toEqual([])
  })

  it('stops animating once it is gone', async () => {
    const { container, unmount } = render(Preview)
    await pastFrame(0)
    const afterFirstMove = board(container)

    unmount()
    await vi.advanceTimersByTimeAsync(60_000)
    // Nothing scheduled survives, so a menu that has been navigated away from
    // isn't still ticking.
    expect(vi.getTimerCount()).toBe(0)
    expect(afterFirstMove.filter(Boolean)).toHaveLength(1)
  })
})
