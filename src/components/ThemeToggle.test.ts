import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import ThemeToggle from './ThemeToggle.svelte'

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

// jsdom has no matchMedia, so theme.svelte reports the system as light -- which
// is the state a first-time player on a light desktop sees.
describe('ThemeToggle', () => {
  it('offers the palette that is not showing', () => {
    render(ThemeToggle)
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument()
  })

  it('switches the palette and then offers the way back', async () => {
    render(ThemeToggle)
    await userEvent.click(screen.getByRole('button'))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('names the action rather than the icon', () => {
    render(ThemeToggle)
    const button = screen.getByRole('button')

    // The visible word is "Dark"; on its own that would be the button's
    // accessible name, leaving a screen-reader user to guess what pressing it
    // does. The aria-label says the action instead.
    expect(button).toHaveTextContent('Dark')
    expect(button).toHaveAccessibleName('Switch to dark theme')
  })
})
