import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The module reads localStorage and the system preference once, at import, so
 * each test sets the world up and then imports a fresh copy of it.
 */
async function load(options: { stored?: string; systemDark?: boolean } = {}) {
  vi.resetModules()
  localStorage.clear()
  delete document.documentElement.dataset.theme

  if (options.stored !== undefined) {
    localStorage.setItem('tt:theme', options.stored)
  }

  if (options.systemDark !== undefined) {
    // jsdom has no matchMedia at all, so there is nothing to spy on.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: options.systemDark! && query.includes('dark'),
      addEventListener: () => {},
    }))
  }

  return import('./theme.svelte')
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('theme', () => {
  it('follows the system preference until the player chooses', async () => {
    const { theme } = await load({ systemDark: true })

    expect(theme.current).toBe('dark')
    expect(theme.isExplicit).toBe(false)
  })

  it('leaves data-theme off while no choice has been made', async () => {
    const { initTheme } = await load({ systemDark: true })
    initTheme()

    // Absent, rather than set to the system's answer: the CSS is written around
    // the attribute being missing, so the media query stays in charge.
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('switches to the other palette and records the choice', async () => {
    const { theme } = await load({ systemDark: false })

    theme.toggle()

    expect(theme.current).toBe('dark')
    expect(theme.isExplicit).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('tt:theme')).toBe('dark')
  })

  it('switches back again', async () => {
    const { theme } = await load({ systemDark: false })

    theme.toggle()
    theme.toggle()

    expect(theme.current).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('restores a stored choice over the system preference', async () => {
    const { theme, initTheme } = await load({
      stored: 'light',
      systemDark: true,
    })
    initTheme()

    expect(theme.current).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('ignores a stored value that is not a theme', async () => {
    const { theme } = await load({ stored: 'solarized', systemDark: true })

    expect(theme.current).toBe('dark')
    expect(theme.isExplicit).toBe(false)
  })

  it('falls back to light where matchMedia does not exist', async () => {
    // No systemDark, so nothing is stubbed and jsdom's missing matchMedia
    // stands in for a webview that doesn't implement it.
    const { theme, initTheme } = await load()

    expect(theme.current).toBe('light')
    expect(() => initTheme()).not.toThrow()
  })

  it('still applies a choice when storage is unavailable', async () => {
    const { theme } = await load({ systemDark: false })
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('private browsing')
      })

    expect(() => theme.toggle()).not.toThrow()
    expect(theme.current).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    setItem.mockRestore()
  })
})

describe('theme, following the system', () => {
  let listener: ((event: { matches: boolean }) => void) | null = null

  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (
        _: string,
        fn: (event: { matches: boolean }) => void,
      ) => (listener = fn),
    }))
  })

  it('tracks a change of system preference while unchosen', async () => {
    const { theme, initTheme } = await import('./theme.svelte')
    initTheme()

    expect(theme.current).toBe('light')
    listener!({ matches: true })
    expect(theme.current).toBe('dark')
  })

  it('ignores a change of system preference once chosen', async () => {
    const { theme, initTheme } = await import('./theme.svelte')
    initTheme()
    theme.set('light')

    listener!({ matches: true })

    expect(theme.current).toBe('light')
  })
})
