/**
 * The difficulty vocabulary shared by every game with a computer opponent.
 *
 * Only the *names* are shared. The `DIFFICULTIES` list itself stays with each
 * game, because the blurbs describe that game's opponent: "plays perfectly"
 * is true of Tic Tac Toe's Hard and false of any game too large to solve.
 */

export type Difficulty = 'very-easy' | 'easy' | 'medium' | 'hard'

export interface DifficultyOption {
  id: Difficulty
  label: string
  blurb: string
}

/** Injectable so tests can make the random difficulties deterministic. */
export type Rng = () => number

/** Uniform choice. `() => 0` picks the first item, which is what tests use. */
export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]
}
