import type { Component } from 'svelte'
import TicTacToePreview from '../games/tic-tac-toe/Preview.svelte'

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
  /**
   * An optional decoration for the game's menu card — a miniature, silent
   * demonstration of the game. Unlike `load` this is imported eagerly: it is
   * menu chrome, shown before anyone clicks anything, so deferring it would
   * only make the card appear empty and then fill in.
   *
   * It must be purely decorative (`aria-hidden`, no controls), because it
   * renders inside the card's button.
   */
  preview?: Component
}

/**
 * The game catalogue. This is the single source of truth for the menu and for
 * `/game/:id` routing.
 *
 * To ship a game: add its component under `src/games/<id>/`, point `load` at it,
 * and flip `status` to `'ready'`. Nothing else needs to change.
 *
 * Order is deliberate -- playable games come first.
 */
export const GAMES: readonly GameEntry[] = [
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    status: 'ready',
    load: () => import('../games/tic-tac-toe/TicTacToe.svelte'),
    preview: TicTacToePreview,
  },
  {
    id: 'advanced-tic-tac-toe',
    title: 'Advanced Tic Tac Toe',
    status: 'ready',
    load: () =>
      import('../games/advanced-tic-tac-toe/AdvancedTicTacToe.svelte'),
  },
  { id: 'mini-sudoku', title: 'Mini Sudoku', status: 'wip' },
  { id: 'sudoku', title: 'Sudoku', status: 'wip' },
  { id: 'ludo', title: 'Ludo', status: 'wip' },
  { id: 'snakes-and-ladders', title: 'Snakes and Ladders', status: 'wip' },
  { id: 'chess', title: 'Chess', status: 'wip' },
  { id: 'minesweeper', title: 'Minesweeper', status: 'wip' },
  { id: 'checkers', title: 'Checkers', status: 'wip' },
  { id: 'solitaire', title: 'Solitaire', status: 'wip' },
]

export const WIP_NOTE = 'Coming soon'

export function findGame(id: string): GameEntry | undefined {
  return GAMES.find((game) => game.id === id)
}
