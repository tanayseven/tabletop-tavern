import { describe, expect, it } from 'vitest'
import { parseHash } from './router.svelte'

describe('parseHash', () => {
  it('treats an empty or root hash as the splash screen', () => {
    // All four are what a browser actually reports for "no route yet".
    expect(parseHash('')).toEqual({ name: 'splash' })
    expect(parseHash('#')).toEqual({ name: 'splash' })
    expect(parseHash('#/')).toEqual({ name: 'splash' })
    expect(parseHash('#//')).toEqual({ name: 'splash' })
  })

  it('parses the menu', () => {
    expect(parseHash('#/menu')).toEqual({ name: 'menu' })
    expect(parseHash('#/menu/')).toEqual({ name: 'menu' })
  })

  it('parses a game id', () => {
    expect(parseHash('#/game/tic-tac-toe')).toEqual({
      name: 'game',
      id: 'tic-tac-toe',
    })
  })

  it('ignores a query string', () => {
    expect(parseHash('#/game/chess?debug=1')).toEqual({
      name: 'game',
      id: 'chess',
    })
  })

  it('falls back to the menu rather than erroring', () => {
    // A stale bookmark or a hand-typed URL should still land somewhere useful.
    expect(parseHash('#/nope')).toEqual({ name: 'menu' })
    expect(parseHash('#/game/')).toEqual({ name: 'menu' })
    expect(parseHash('#/game/Bad_Id')).toEqual({ name: 'menu' })
    expect(parseHash('#/game/a/b')).toEqual({ name: 'menu' })
  })
})
