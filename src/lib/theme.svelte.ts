/**
 * Which of the two palettes is live.
 *
 * The palettes themselves are in `app.css`. All this does is set `data-theme`
 * on <html>, which that file keys off. With no stored choice the attribute is
 * absent and the CSS falls through to `prefers-color-scheme`, so the system
 * preference stays the default until the player overrides it.
 *
 * The usual way to apply a stored theme before the first paint is a tiny inline
 * script in `index.html`. Tauri's CSP is `script-src 'self'`, which blocks that
 * (and the CSP should stay as it is), so `initTheme()` runs from `main.ts`
 * instead. That is early enough: the stylesheet is already linked by then, so
 * the attribute is set before Svelte renders anything.
 */

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'tt:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The player's stored choice, or null if they've never made one. */
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    // Private browsing / disabled storage: fall back to the system preference.
    return null
  }
}

/**
 * Guarded because not every webview implements matchMedia -- and neither does
 * jsdom, so the component tests reach this too. Light is the palette's default,
 * so it's also the right answer when the preference can't be read.
 */
function systemTheme(): Theme {
  if (typeof matchMedia !== 'function') return 'light'
  return matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

const state = $state<{ choice: Theme | null; system: Theme }>({
  choice: storedTheme(),
  system: systemTheme(),
})

function apply() {
  // Removing the attribute rather than writing "system" hands the decision back
  // to the media query, which is the state the CSS is written around.
  if (state.choice) document.documentElement.dataset.theme = state.choice
  else delete document.documentElement.dataset.theme
}

/** Apply the stored choice and start following the system preference. */
export function initTheme() {
  apply()
  if (typeof matchMedia !== 'function') return
  matchMedia(DARK_QUERY).addEventListener('change', (event) => {
    state.system = event.matches ? 'dark' : 'light'
  })
}

export const theme = {
  /** The palette actually showing: the player's choice, else the system's. */
  get current(): Theme {
    return state.choice ?? state.system
  },

  /** False until the player has overridden the system preference. */
  get isExplicit(): boolean {
    return state.choice !== null
  },

  set(next: Theme) {
    state.choice = next
    apply()
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not being able to remember the choice is harmless; it still applies
      // for this session.
    }
  },

  /** Switch to the other palette. */
  toggle() {
    theme.set(theme.current === 'dark' ? 'light' : 'dark')
  },
}
