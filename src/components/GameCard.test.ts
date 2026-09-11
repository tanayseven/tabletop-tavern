import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import GameCard from './GameCard.svelte'
import { WIP_NOTE, type GameEntry } from '../lib/games'

// Synthetic entries rather than real ones from the registry, so these tests
// keep testing card behaviour as games move from 'wip' to 'ready' over time.
const READY: GameEntry = {
  id: 'test-game',
  title: 'Test Game',
  status: 'ready',
  load: async () => ({ default: (() => {}) as never }),
}

const WIP: GameEntry = { id: 'wip-game', title: 'Wip Game', status: 'wip' }

describe('GameCard', () => {
  beforeEach(() => {
    location.hash = '#/menu'
  })

  it('navigates to a playable game when clicked', async () => {
    render(GameCard, { game: READY })
    await userEvent.click(screen.getByRole('button', { name: 'Test Game' }))
    expect(location.hash).toBe('#/game/test-game')
  })

  it('does not mark a playable game as disabled', () => {
    render(GameCard, { game: READY })
    const button = screen.getByRole('button', { name: 'Test Game' })
    expect(button).toHaveAttribute('aria-disabled', 'false')
    expect(button).not.toHaveAccessibleDescription(WIP_NOTE)
  })

  it('does not navigate for a work-in-progress game', async () => {
    render(GameCard, { game: WIP })
    await userEvent.click(screen.getByRole('button', { name: 'Wip Game' }))
    expect(location.hash).toBe('#/menu')
  })

  it('describes a work-in-progress game without renaming it', () => {
    render(GameCard, { game: WIP })
    // The note must be the description, not part of the name: otherwise a
    // screen reader announces "Wip Game Work in progress" as the identity.
    const button = screen.getByRole('button', { name: 'Wip Game' })
    expect(button).toHaveAccessibleName('Wip Game')
    expect(button).toHaveAccessibleDescription(WIP_NOTE)
  })
})
