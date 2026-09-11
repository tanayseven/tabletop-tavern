/**
 * A hash router.
 *
 * Hash routing (rather than the History API) is deliberate: the app ships to a
 * web server, to Tauri's custom protocol on desktop and mobile, and to itch.io's
 * html5 player, which serves from a subdirectory. A hash needs no rewrite rules
 * or base-path configuration on any of them.
 */

export type Route =
  { name: 'splash' } | { name: 'menu' } | { name: 'game'; id: string }

export function parseHash(hash: string): Route {
  // Tolerate '', '#', '#/', and a trailing slash, and ignore any query string.
  const path = hash.replace(/^#/, '').split('?')[0].replace(/\/+$/, '')

  if (path === '' || path === '/') return { name: 'splash' }
  if (path === '/menu') return { name: 'menu' }

  const game = /^\/game\/([a-z0-9-]+)$/.exec(path)
  if (game) return { name: 'game', id: game[1] }

  // Unknown routes fall back to the menu rather than erroring; a stale
  // bookmark should still land somewhere useful.
  return { name: 'menu' }
}

const state = $state({ route: parseHash(location.hash) })

function sync() {
  state.route = parseHash(location.hash)
}

window.addEventListener('hashchange', sync)

export const router = {
  get route(): Route {
    return state.route
  },

  /** Navigate to a path such as `/menu` or `/game/tic-tac-toe`. */
  navigate(path: string) {
    const next = `#${path}`
    if (location.hash === next) return
    location.hash = next
  },

  /**
   * Navigate without leaving a history entry. Used by the splash screen so that
   * pressing Back from the menu doesn't drop the player back into the splash.
   */
  replace(path: string) {
    history.replaceState(null, '', `#${path}`)
    sync()
  },
}
