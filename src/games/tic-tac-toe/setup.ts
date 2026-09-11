import type { Difficulty } from './ai'
import type { Player } from './board'

export type Mode = 'pvp' | 'pvc'
export type Coin = 'heads' | 'tails'

/** Who the toss picked: the human ("first") or their opponent ("second"). */
export type Role = 'first' | 'second'

export interface Setup {
  /** `null` until the mode is chosen — the first setup screen. */
  mode: Mode | null
  /** Only ever set for `pvc`. */
  difficulty: Difficulty | null
  call: Coin | null
  flip: Coin | null
  /** The mark the toss winner chose; whoever holds it moves first. */
  startingMark: Player | null
}

export const EMPTY_SETUP: Setup = {
  mode: null,
  difficulty: null,
  call: null,
  flip: null,
  startingMark: null,
}

/**
 * The caller wins the toss if the flip matches their call, otherwise the other
 * side does. The human always calls.
 */
export function tossWinner(call: Coin, flip: Coin): Role {
  return call === flip ? 'first' : 'second'
}

export function flipCoin(rng: () => number = Math.random): Coin {
  return rng() < 0.5 ? 'heads' : 'tails'
}

/** Label for each side, which differs between hot-seat and computer play. */
export function roleLabel(mode: Mode | null, role: Role): string {
  if (mode === 'pvc') return role === 'first' ? 'Player' : 'Computer'
  return role === 'first' ? 'Player 1' : 'Player 2'
}

/**
 * Which role owns `mark`. The toss winner picked `startingMark`, so they own
 * it and the other side owns the opposite mark.
 */
export function roleOf(setup: Setup, mark: Player): Role {
  const winner =
    setup.call && setup.flip ? tossWinner(setup.call, setup.flip) : 'first'
  if (mark === setup.startingMark) return winner
  return winner === 'first' ? 'second' : 'first'
}

/** True when the computer should be the one to move `mark`. */
export function isComputer(setup: Setup, mark: Player): boolean {
  return setup.mode === 'pvc' && roleOf(setup, mark) === 'second'
}

export type Step = 'mode' | 'difficulty' | 'toss' | 'mark' | 'play'

/**
 * The screen to show, given how far the setup has been filled in.
 *
 * Difficulty is skipped for hot-seat play, and the mark choice is skipped when
 * the computer wins the toss — it picks for itself.
 */
export function stepFor(setup: Setup): Step {
  if (setup.mode === null) return 'mode'
  if (setup.mode === 'pvc' && setup.difficulty === null) return 'difficulty'
  if (setup.call === null || setup.flip === null) return 'toss'
  if (setup.startingMark === null) return 'mark'
  return 'play'
}

/**
 * The setup a Back button should return to, or `null` to leave for the menu.
 *
 * Stepping back from the mark choice also clears the toss, so it is re-flipped
 * rather than replayed — per the design doc.
 */
export function back(setup: Setup): Setup | null {
  switch (stepFor(setup)) {
    case 'mode':
      return null
    case 'difficulty':
      return { ...setup, mode: null }
    case 'toss':
      // Hot-seat play has no difficulty screen, so its previous screen is mode.
      return setup.mode === 'pvc'
        ? { ...setup, difficulty: null }
        : { ...setup, mode: null }
    case 'mark':
    case 'play':
      return { ...setup, call: null, flip: null, startingMark: null }
  }
}
