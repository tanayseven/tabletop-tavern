<script lang="ts">
  import { chooseMove, DIFFICULTIES } from './ai'
  import {
    currentPlayer,
    emptyBoard,
    place,
    status,
    winningLine,
    type Board,
  } from './board'
  import GameSetup from '../../components/GameSetup.svelte'
  import RoundEnd from '../../components/RoundEnd.svelte'
  import { isComputer, roleLabel, roleOf, type Setup } from '../../lib/setup'
  import { router } from '../../lib/router.svelte'

  /** How long the computer "thinks", so its move doesn't appear instantly. */
  const COMPUTER_DELAY_MS = 450

  /** `null` until the setup flow completes; the board is unreachable before. */
  let setup = $state<Setup | null>(null)
  let board = $state<Board>(emptyBoard())
  let session = $state({ gamesPlayed: 0, firstWins: 0, secondWins: 0 })

  const result = $derived(status(board))
  const over = $derived(result.kind !== 'in-progress')
  const line = $derived(winningLine(board))
  const turn = $derived(currentPlayer(board))

  const statusText = $derived(
    result.kind === 'won'
      ? `${result.winner} wins!`
      : result.kind === 'draw'
        ? "It's a draw!"
        : `${turn}'s turn`,
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
    board = emptyBoard(ready.startingMark ?? 'X')
  }

  function take(index: number) {
    if (over || awaitingComputer) return
    const next = place(board, index, turn)
    if (next === board) return // illegal move
    board = next
  }

  function playAgain() {
    // Same mode, difficulty and starting mark — only the board is cleared.
    board = emptyBoard(setup?.startingMark ?? 'X')
  }

  // Tally each round exactly once, the moment it ends.
  let recordedFor = $state<Board | null>(null)
  $effect(() => {
    if (!setup || !over || recordedFor === board) return
    recordedFor = board

    session.gamesPlayed += 1
    if (result.kind === 'won') {
      if (roleOf(setup, result.winner) === 'first') session.firstWins += 1
      else session.secondWins += 1
    }
  })

  // Drive the computer's turn.
  $effect(() => {
    if (!awaitingComputer || !setup?.difficulty) return

    const snapshot = board
    const mark = turn
    const difficulty = setup.difficulty
    const timer = setTimeout(() => {
      // Guard against the board having moved on (reset, navigation) while the
      // timer was pending.
      if (board !== snapshot) return
      board = place(snapshot, chooseMove(snapshot, mark, difficulty), mark)
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
    <p class="status" aria-live="polite">{statusText}</p>

    <div class="board" role="grid" aria-label="Tic Tac Toe board">
      {#each board.cells as cell, index (index)}
        <button
          class="cell"
          class:winning={line?.includes(index)}
          disabled={cell !== null || over || awaitingComputer}
          aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}${cell ? `: ${cell}` : ': empty'}`}
          onclick={() => take(index)}
        >
          {cell ?? ''}
        </button>
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
  }

  .score {
    margin: 0;
    font-size: 18px;
    color: #bfbfbf; /* srgb(0.75, 0.75, 0.75) */
    text-align: center;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    /* Square, and never taller than the space available -- which is what keeps
       the whole board visible in a phone's landscape orientation. */
    width: min(90vw, 55vh, 420px);
    aspect-ratio: 1;
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--btn);
    color: var(--text);
    font-size: clamp(2rem, 12vw, 4rem);
    font-weight: 600;
    line-height: 1;
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

  @media (prefers-reduced-motion: reduce) {
    .cell {
      transition: none;
    }
  }
</style>
