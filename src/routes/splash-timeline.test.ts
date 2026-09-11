import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  FADE_IN_PCT,
  HOLD_END_PCT,
  TOTAL_MS,
  FADE_IN_MS,
  HOLD_MS,
  FADE_OUT_MS,
} from './splash-timeline'

describe('splash timeline', () => {
  it('keeps the 3s / 2s / 2s phases carried over from the Bevy splash', () => {
    expect([FADE_IN_MS, HOLD_MS, FADE_OUT_MS]).toEqual([3000, 2000, 2000])
    expect(TOTAL_MS).toBe(7000)
  })

  // Splash.svelte has to hardcode its @keyframes offsets, because `var()` is
  // not allowed in a keyframe selector. This pins the two representations
  // together: change a phase duration and this fails until the CSS follows.
  it('matches the hardcoded @keyframes offsets in Splash.svelte', () => {
    // Read from the project root: under jsdom, `import.meta.url` is an http:
    // URL, so it can't be handed to readFileSync.
    const css = readFileSync('src/routes/Splash.svelte', 'utf8')
    const offsets = [...css.matchAll(/^\s*([\d.]+)%\s*\{/gm)].map((m) =>
      Number(m[1]),
    )

    expect(offsets).toContain(Number(FADE_IN_PCT.toFixed(2)))
    expect(offsets).toContain(Number(HOLD_END_PCT.toFixed(2)))
  })
})
