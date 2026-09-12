<script lang="ts">
  import { chooseMove, DIFFICULTIES } from './ai'
  import {
    currentPlayer,
    emptyGame,
    boardResult,
    play,
    playableBoards,
    status,
    type Game,
    type Move,
  } from './board'
  import GameSetup from '../../components/GameSetup.svelte'
  import RoundEnd from '../../components/RoundEnd.svelte'
  import { isComputer, roleLabel, roleOf, type Setup } from '../../lib/setup'
  import { router } from '../../lib/router.svelte'

  /** How long the computer "thinks", so its move doesn't appear instantly. */
  const COMPUTER_DELAY_MS = 350

  /** Spoken and written names for each square of the meta-grid. */
  const BOARD_NAMES = [
    'top-left',
    'top-middle',
    'top-right',
    'middle-left',
    'centre',
    'middle-right',
    'bottom-left',
    'bottom-middle',
    'bottom-right',
  ]

  /** `null` until the setup flow completes; the board is unreachable before. */
  let setup = $state<Setup | null>(null)
  let game = $state<Game>(emptyGame())
  let session = $state({ gamesPlayed: 0, firstWins: 0, secondWins: 0 })

  const result = $derived(status(game))
  const over = $derived(result.kind !== 'in-progress')
  const turn = $derived(currentPlayer(game))
  const playable = $derived(playableBoards(game))
  const metaLine = $derived(result.kind === 'won' ? result.line : null)
  const claims = $derived(game.boards.map((cells) => boardResult(cells)))

  const statusText = $derived(
    result.kind === 'won'
      ? `${result.winner} wins the match!`
      : result.kind === 'draw'
        ? "It's a draw!"
        : `${turn}'s turn`,
  )

  const hintText = $derived(
    over
      ? ''
      : game.activeBoard === null
        ? 'Free choice — play in any open board'
        : `Play in the ${BOARD_NAMES[game.activeBoard]} board`,
  )

  const scoreText = $derived(
    `Games played: ${session.gamesPlayed} — ` +
      `${roleLabel(setup?.mode ?? null, 'first')}: ${session.firstWins}, ` +
      `${roleLabel(setup?.mode ?? null, 'second')}: ${session.secondWins}`,
  )

  const awaitingComputer = $derived(
    setup !== null && !over && isComputer(setup, turn),
  )

  function start(ready: Setup) {
    setup = ready
    game = emptyGame(ready.startingMark ?? 'X')
  }

  function take(move: Move) {
    if (over || awaitingComputer) return
    const next = play(game, move, turn)
    if (next === game) return // illegal move
    game = next
  }

  function playAgain() {
    // Same mode, difficulty and starting mark — only the boards are cleared.
    game = emptyGame(setup?.startingMark ?? 'X')
  }

  function cellLabel(board: number, cell: number): string {
    const mark = game.boards[board][cell]
    const row = Math.floor(cell / 3) + 1
    const column = (cell % 3) + 1
    return (
      `${BOARD_NAMES[board]} board, row ${row}, column ${column}` +
      `${mark ? `: ${mark}` : ': empty'}`
    )
  }

  // Tally each round exactly once, the moment it ends.
  let recordedFor = $state<Game | null>(null)
  $effect(() => {
    if (!setup || !over || recordedFor === game) return
    recordedFor = game

    session.gamesPlayed += 1
    if (result.kind === 'won') {
      if (roleOf(setup, result.winner) === 'first') session.firstWins += 1
      else session.secondWins += 1
    }
  })

  // Drive the computer's turn.
  $effect(() => {
    if (!awaitingComputer || !setup?.difficulty) return

    const snapshot = game
    const mark = turn
    const difficulty = setup.difficulty
    const timer = setTimeout(() => {
      // Guard against the game having moved on (reset, navigation) while the
      // timer was pending.
      if (game !== snapshot) return
      game = play(snapshot, chooseMove(snapshot, mark, difficulty), mark)
    }, COMPUTER_DELAY_MS)

    return () => clearTimeout(timer)
  })
</script>

<div class="game">
  {#if setup === null}
    <GameSetup
      difficulties={DIFFICULTIES}
      onready={start}
      oncancel={() => router.navigate('/menu')}
    />
  {:else}
    <p class="status" aria-live="polite">
      {statusText}{hintText ? ` — ${hintText}` : ''}
    </p>

    <div class="meta" role="grid" aria-label="Ultimate Tic Tac Toe board">
      {#each game.boards as cells, board (board)}
        {@const claim = claims[board]}
        <div
          class="mini"
          class:open={!over && playable.includes(board)}
          class:settled={claim.kind !== 'in-progress'}
          class:deciding={metaLine?.includes(board)}
        >
          {#each cells as cell, index (index)}
            <button
              class="cell"
              class:winning={claim.kind === 'won' && claim.line.includes(index)}
              disabled={cell !== null ||
                over ||
                awaitingComputer ||
                !playable.includes(board)}
              aria-label={cellLabel(board, index)}
              onclick={() => take({ board, cell: index })}
            >
              {cell ?? ''}
            </button>
          {/each}

          {#if claim.kind === 'won'}
            <span class="claim" aria-hidden="true">{claim.winner}</span>
          {/if}
        </div>
      {/each}
    </div>

    <p class="score">{scoreText}</p>

    {#if over}
      <RoundEnd onplayagain={playAgain} />
    {/if}
  {/if}
</div>

<style>
  .game {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap-grid);
    width: 100%;
  }

  .status {
    margin: 0;
    font-size: var(--fs-button);
    min-height: 1.3em;
    text-align: center;
  }

  .score {
    margin: 0;
    font-size: 18px;
    color: #bfbfbf; /* srgb(0.75, 0.75, 0.75) */
    text-align: center;
  }

  /* Square, and never taller than the space available -- the same sizing the
     plain Tic Tac Toe board uses, so both games survive a phone in landscape. */
  .meta {
    display: grid;
    /* Rows as well as columns. With `aspect-ratio` alone the rows size
       themselves from their content, which came out taller than the square the
       aspect-ratio reserved -- so the board overflowed its own box and the
       scoreboard below it was drawn over the bottom row. */
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 8px;
    width: min(92vw, 62vh, 460px);
    aspect-ratio: 1;
  }

  .mini {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 2px;
    padding: 2px;
    /* Grid items refuse to shrink below their content by default, which would
       push the nine boards back out past the square above. */
    min-width: 0;
    min-height: 0;
    /* Dimmed by default: the boards you *can* play in are the ones that light
       up, which is the whole navigational trick of this game. */
    background: #0f0f13;
    opacity: 0.45;
    transition:
      opacity 120ms ease,
      box-shadow 120ms ease;
  }

  .mini.open {
    opacity: 1;
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .mini.settled {
    opacity: 1;
  }

  .mini.deciding {
    box-shadow: 0 0 0 3px var(--btn-active);
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 0;
    border: none;
    background: var(--btn);
    color: var(--text);
    /* Nine boards across, so each cell is a ninth of the width -- sized off the
       same clamp as the plain board's cells, divided down. */
    font-size: clamp(0.7rem, 3.2vw, 1.25rem);
    font-weight: 600;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  .cell:hover:not(:disabled) {
    background: var(--btn-hover);
  }

  .cell:disabled {
    cursor: default;
  }

  .cell.winning {
    background: var(--btn-active);
  }

  /* The claimed mark, drawn over the small board that earned it. */
  .claim {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(2rem, 11vw, 4.5rem);
    font-weight: 700;
    color: var(--text);
    opacity: 0.82;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .cell,
    .mini {
      transition: none;
    }
  }
</style>
