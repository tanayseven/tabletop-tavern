import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import Menu from './Menu.svelte'
import { GAMES, WIP_NOTE } from '../lib/games'

describe('Menu', () => {
  beforeEach(() => {
    location.hash = '#/menu'
  })

  it('lists every game in the registry', () => {
    render(Menu)
    for (const game of GAMES) {
      expect(
        screen.getByRole('button', { name: game.title }),
      ).toBeInTheDocument()
    }
  })

  it('marks work-in-progress games as disabled and explains why', () => {
    render(Menu)
    const sudoku = screen.getByRole('button', { name: 'Sudoku' })

    // aria-disabled rather than `disabled`: the button stays focusable so a
    // keyboard user can reach it and hear the reason it can't be played yet.
    expect(sudoku).toHaveAttribute('aria-disabled', 'true')
    expect(sudoku).toHaveAccessibleDescription(WIP_NOTE)
  })

  it('does not navigate when a work-in-progress game is clicked', async () => {
    render(Menu)
    await userEvent.click(screen.getByRole('button', { name: 'Chess' }))
    expect(location.hash).toBe('#/menu')
  })

  it('hides Quit outside the desktop app', () => {
    // jsdom has no __TAURI_INTERNALS__, so platform.ts reports a browser --
    // which is the case the old `cfg(not(target_arch = "wasm32"))` gate covered.
    render(Menu)
    expect(
      screen.queryByRole('button', { name: 'Quit' }),
    ).not.toBeInTheDocument()
  })
})
