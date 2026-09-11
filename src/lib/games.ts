import type { Component } from 'svelte'

export type GameStatus = 'wip' | 'ready'

export interface GameEntry {
  /** URL slug, e.g. `tic-tac-toe`. Lowercase, hyphenated, stable once shipped. */
  id: string
  title: string
  status: GameStatus
  /**
   * Lazily imports the game's root component. Required when `status` is
   * `'ready'`; the dynamic import is what keeps each game in its own chunk so
   * the menu doesn't pay for games nobody opened.
   */
  load?: () => Promise<{ default: Component }>
}

/**
 * The game catalogue. This is the single source of truth for the menu and for
 * `/game/:id` routing.
 *
 * To ship a game: add its component under `src/games/<id>/`, point `load` at it,
 * and flip `status` to `'ready'`. Nothing else needs to change.
 */
export const GAMES: readonly GameEntry[] = [
  { id: 'mini-sudoku', title: 'Mini Sudoku', status: 'wip' },
  { id: 'sudoku', title: 'Sudoku', status: 'wip' },
  { id: 'tic-tac-toe', title: 'Tic Tac Toe', status: 'wip' },
  { id: 'advanced-tic-tac-toe', title: 'Advanced Tic Tac Toe', status: 'wip' },
  { id: 'ludo', title: 'Ludo', status: 'wip' },
  { id: 'snakes-and-ladders', title: 'Snakes and Ladders', status: 'wip' },
  { id: 'chess', title: 'Chess', status: 'wip' },
  { id: 'minesweeper', title: 'Minesweeper', status: 'wip' },
  { id: 'checkers', title: 'Checkers', status: 'wip' },
  { id: 'solitaire', title: 'Solitaire', status: 'wip' },
]

export const WIP_NOTE = 'Work in progress'

export function findGame(id: string): GameEntry | undefined {
  return GAMES.find((game) => game.id === id)
}
