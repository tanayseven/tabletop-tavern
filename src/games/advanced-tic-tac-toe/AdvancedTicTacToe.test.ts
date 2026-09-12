import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import AdvancedTicTacToe from './AdvancedTicTacToe.svelte'

/**
 * Tic Tac Toe has no component test, but this game does: which cells are
 * playable right now is real logic, it changes on every move, and a bug in it
 * is invisible to the rules tests. jsdom has no layout, so everything about
 * sizing stays in the e2e spec.
 */

/** Walks the pre-game screens into a hot-seat match with X to move first. */
async function startHotSeat() {
  const user = userEvent.setup()
  render(AdvancedTicTacToe)

  await user.click(screen.getByRole('button', { name: 'Player vs Player' }))
  await user.click(screen.getByRole('button', { name: 'Heads' }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: /^X$/ }))
  return user
}

function board() {
  return screen.getByRole('group', { name: 'Advanced Tic Tac Toe board' })
}

function cells(): HTMLButtonElement[] {
  return Array.from(board().querySelectorAll('button'))
}

/** Cells are laid out board-major, so board b cell c is at b * 9 + c. */
function cellAt(b: number, c: number): HTMLButtonElement {
  return cells()[b * 9 + c]
}

function enabledBoards(): number[] {
  const boards = new Set<number>()
  cells().forEach((cell, index) => {
    if (!cell.disabled) boards.add(Math.floor(index / 9))
  })
  return [...boards].sort((a, b) => a - b)
}

describe('AdvancedTicTacToe', () => {
  beforeEach(() => {
    location.hash = '#/game/advanced-tic-tac-toe'
  })

  it('renders all 81 cells', async () => {
    await startHotSeat()
    expect(cells()).toHaveLength(81)
  })

  it('opens every board on the first move', async () => {
    await startHotSeat()
    expect(enabledBoards()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('restricts play to the board the last cell pointed at', async () => {
    const user = await startHotSeat()
    // Cell 6 of any board sends the opponent to board 6.
    await user.click(cellAt(4, 6))

    expect(enabledBoards()).toEqual([6])
    expect(cellAt(6, 0).disabled).toBe(false)
    expect(cellAt(0, 0).disabled).toBe(true)
  })

  it('leaves the cell just played filled and unclickable', async () => {
    const user = await startHotSeat()
    await user.click(cellAt(4, 6))

    expect(cellAt(4, 6).textContent?.trim()).toBe('X')
    expect(cellAt(4, 6).disabled).toBe(true)
  })

  it('opens every undecided board when the target is already won', async () => {
    const user = await startHotSeat()

    // X takes board 0 down its left column (cells 0, 3, 6). X can only reach
    // board 0 when O has just played a cell 0 somewhere, which is what the
    // alternation below arranges.
    const moves: [number, number][] = [
      [4, 1], // X
      [1, 0], // O -> sends X to board 0
      [0, 0], // X
      [0, 1], // O
      [1, 3], // X
      [3, 0], // O -> sends X to board 0
      [0, 3], // X
      [3, 1], // O
      [1, 6], // X
      [6, 0], // O -> sends X to board 0
      [0, 6], // X wins board 0
      [6, 2], // O
    ]
    for (const [b, c] of moves) await user.click(cellAt(b, c))

    expect(
      screen.getByRole('group', { name: /top-left board, won by X/ }),
    ).toBeInTheDocument()

    // Cell 0 points back at board 0, which is now decided -- so O is freed
    // rather than trapped, and every board except board 0 opens up.
    await user.click(cellAt(2, 0))
    expect(enabledBoards()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(screen.getByText(/play in any board/)).toBeInTheDocument()
  })

  it('names where to play in the status line', async () => {
    const user = await startHotSeat()
    expect(screen.getByText(/play in any board/)).toBeInTheDocument()

    await user.click(cellAt(0, 4))
    expect(screen.getByText(/play in the centre board/)).toBeInTheDocument()
  })

  it('gives every cell both its board and its own position', async () => {
    await startHotSeat()
    const label = cellAt(4, 0).getAttribute('aria-label')
    expect(label).toContain('centre board')
    expect(label).toContain('row 1, column 1')
    expect(label).toContain('empty')
  })

  it('describes a board that must be played in', async () => {
    const user = await startHotSeat()
    await user.click(cellAt(4, 8))
    expect(
      screen.getByRole('group', { name: /bottom-right board, play here/ }),
    ).toBeInTheDocument()
  })

  it('keeps the endgame buttons mounted but inert while playing', async () => {
    await startHotSeat()
    const playAgain = screen.getByRole('button', {
      name: 'Play Again',
      hidden: true,
    })
    // Present in the DOM -- that is what reserves its space in the column --
    // but inert, so it is out of the focus order until the match ends.
    expect(playAgain).toBeInTheDocument()

    const row = playAgain.closest('.endgame') as HTMLElement
    expect(row).toHaveClass('hidden')
    // Svelte sets `inert` as a DOM property rather than an attribute, so this
    // asserts the property; `toHaveAttribute('inert')` would fail even though
    // the row really is inert.
    expect(row.inert).toBe(true)
  })
})
