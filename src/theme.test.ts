import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The palette, as specified. Everything below checks that app.css still says
 * exactly this, that the light and dark sets cover the same tokens, and that
 * no component has gone around them with a literal colour.
 */
const LIGHT = {
  '--tavern-bg': '#f5e9d3',
  '--tavern-surface': '#e8d2a8',
  '--tavern-primary': '#b8722e',
  '--tavern-accent': '#7a2e2e',
  '--tavern-text-primary': '#3b2415',
  '--tavern-text-secondary': '#6b5138',
  '--tavern-border': '#a8825a',
  '--game-bg': '#ede0c8',
  '--game-grid': '#4a3320',
  '--game-x': '#7a2e2e',
  '--game-o': '#2e6b5e',
  '--game-win-highlight': '#c67f2e',
  '--game-text': '#3b2415',
}

const DARK = {
  '--tavern-bg': '#1e1712',
  '--tavern-surface': '#2c2115',
  '--tavern-primary': '#e0a040',
  '--tavern-accent': '#a8452f',
  '--tavern-text-primary': '#f0e4d0',
  '--tavern-text-secondary': '#b8a183',
  '--tavern-border': '#4a3826',
  '--game-bg': '#201a14',
  '--game-grid': '#b8a183',
  '--game-x': '#d9614a',
  '--game-o': '#4fa88f',
  '--game-win-highlight': '#e0a040',
  '--game-text': '#f0e4d0',
}

// Read from the project root: under jsdom, `import.meta.url` is an http: URL,
// so it can't be handed to readFileSync.
const css = readFileSync('src/app.css', 'utf8')

/** The custom properties declared in the block opened by `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  expect(start, `${selector} is missing from app.css`).toBeGreaterThan(-1)

  const body = css.slice(start + selector.length)
  const end = body.indexOf('}')
  const declarations = body.slice(0, end)

  return Object.fromEntries(
    [...declarations.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  )
}

/** Only the palette entries, dropping the roles that share the light block. */
function palette(declarations: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(declarations).filter(([name]) => name in LIGHT),
  )
}

const LIGHT_BLOCK = ':root {'
const SYSTEM_DARK_BLOCK = ":root:not([data-theme='light']) {"
const FORCED_DARK_BLOCK = ":root[data-theme='dark'] {"

describe('theme tokens', () => {
  it('defines the light palette', () => {
    expect(palette(block(LIGHT_BLOCK))).toEqual(LIGHT)
  })

  it('defines the dark palette for the system preference', () => {
    expect(palette(block(SYSTEM_DARK_BLOCK))).toEqual(DARK)
  })

  // The dark palette has to be written out twice -- CSS cannot share one
  // declaration block between a media query and an attribute selector -- so a
  // manual override would otherwise be free to drift from the system default.
  it('gives the manual override the same dark palette', () => {
    expect(block(FORCED_DARK_BLOCK)).toEqual(block(SYSTEM_DARK_BLOCK))
  })

  it('covers the same tokens in both modes', () => {
    expect(Object.keys(DARK).sort()).toEqual(Object.keys(LIGHT).sort())
  })

  // index.html paints the background before the stylesheet has loaded, so it is
  // the one place that cannot reference a token.
  it('matches the anti-flash background in index.html', () => {
    const html = readFileSync('index.html', 'utf8')
    const backgrounds = [...html.matchAll(/background:\s*(#[0-9a-f]{6})/g)].map(
      (m) => m[1],
    )

    expect(backgrounds).toEqual([LIGHT['--tavern-bg'], DARK['--tavern-bg']])
  })
})

/** Every .svelte file under src/, recursively. */
function components(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return components(path)
    return entry.name.endsWith('.svelte') ? [path] : []
  })
}

describe('components', () => {
  // A literal colour in a component is invisible to a palette swap, and to dark
  // mode: it stays whatever it was written as in both.
  it.each(components('src'))('%s uses tokens, not literal colours', (path) => {
    const styles = [
      ...readFileSync(path, 'utf8').matchAll(/<style>([\s\S]*?)<\/style>/g),
    ]
      .map((m) => m[1])
      .join('\n')

    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/)
  })
})
