import { describe, expect, it } from 'vitest'
import { findGame, GAMES } from './games'

describe('game registry', () => {
  it('has unique ids', () => {
    const ids = GAMES.map((game) => game.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses url-safe slugs', () => {
    // The router's `/game/:id` pattern only matches this shape, so an id that
    // breaks the rule would produce a card that silently routes nowhere.
    for (const game of GAMES) {
      expect(game.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('gives every ready game a loader', () => {
    for (const game of GAMES.filter((g) => g.status === 'ready')) {
      expect(game.load, `${game.id} is ready but has no load()`).toBeTypeOf(
        'function',
      )
    }
  })

  it('does not give work-in-progress games a loader', () => {
    for (const game of GAMES.filter((g) => g.status === 'wip')) {
      expect(game.load).toBeUndefined()
    }
  })

  it('finds games by id and reports misses', () => {
    expect(findGame('tic-tac-toe')?.title).toBe('Tic Tac Toe')
    expect(findGame('nonexistent')).toBeUndefined()
  })
})
