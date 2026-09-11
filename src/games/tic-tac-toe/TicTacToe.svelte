<script lang="ts">
  import { chooseMove, DIFFICULTIES, type Difficulty } from './ai'
  import {
    currentPlayer,
    emptyBoard,
    place,
    status,
    winningLine,
    type Board,
    type Player,
  } from './board'
  import {
    back,
    EMPTY_SETUP,
    flipCoin,
    isComputer,
    roleLabel,
    roleOf,
    stepFor,
    tossWinner,
    type Coin,
    type Mode,
    type Setup,
  } from './setup'
  import { router } from '../../lib/router.svelte'

  /** How long the computer "thinks", so its move doesn't appear instantly. */
  const COMPUTER_DELAY_MS = 450

  let setup = $state<Setup>({ ...EMPTY_SETUP })
  let board = $state<Board>(emptyBoard())
  let session = $state({ gamesPlayed: 0, firstWins: 0, secondWins: 0 })

  /** Set between calling the coin and acknowledging the result. */
  let pendingToss = $state<{ call: Coin; flip: Coin } | null>(null)

  const step = $derived(stepFor(setup))
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
      `${roleLabel(setup.mode, 'first')}: ${session.firstWins}, ` +
      `${roleLabel(setup.mode, 'second')}: ${session.secondWins}`,
  )

  const awaitingComputer = $derived(
    step === 'play' && !over && isComputer(setup, turn),
  )

  function choose(mode: Mode) {
    setup = { ...setup, mode }
  }

  function chooseDifficulty(difficulty: Difficulty) {
    setup = { ...setup, difficulty }
  }

  function call(coin: Coin) {
    pendingToss = { call: coin, flip: flipCoin() }
  }

  function acknowledgeToss() {
    if (!pendingToss) return
    const { call: c, flip } = pendingToss
    let next: Setup = { ...setup, call: c, flip }

    // The computer picks its own mark, so that screen is skipped for it.
    if (tossWinner(c, flip) === 'second' && setup.mode === 'pvc') {
      next = { ...next, startingMark: Math.random() < 0.5 ? 'X' : 'O' }
    }

    setup = next
    pendingToss = null
    board = emptyBoard(next.startingMark ?? 'X')
  }

  function chooseMark(mark: Player) {
    setup = { ...setup, startingMark: mark }
    board = emptyBoard(mark)
  }

  function goBack() {
    // Clear any un-acknowledged toss first, so Back from the result panel
    // returns to the call rather than skipping the screen entirely.
    if (pendingToss) {
      pendingToss = null
      return
    }
    const previous = back(setup)
    if (previous === null) {
      router.navigate('/menu')
      return
    }
    setup = previous
  }

  function take(index: number) {
    if (over || isComputer(setup, turn)) return
    const next = place(board, index, turn)
    if (next === board) return // illegal move
    board = next
  }

  function playAgain() {
    // Same mode, difficulty and starting mark — only the board is cleared.
    board = emptyBoard(setup.startingMark ?? 'X')
  }

  // Tally each round exactly once, the moment it ends.
  let recordedFor = $state<Board | null>(null)
  $effect(() => {
    if (!over || recordedFor === board) return
    recordedFor = board

    session.gamesPlayed += 1
    if (result.kind === 'won') {
      if (roleOf(setup, result.winner) === 'first') session.firstWins += 1
      else session.secondWins += 1
    }
  })

  // Drive the computer's turn.
  $effect(() => {
    if (!awaitingComputer || !setup.difficulty) return

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

  const tossWinnerLabel = $derived(
    pendingToss
      ? roleLabel(setup.mode, tossWinner(pendingToss.call, pendingToss.flip))
      : '',
  )

  const markChooserLabel = $derived(
    setup.call && setup.flip
      ? roleLabel(setup.mode, tossWinner(setup.call, setup.flip))
      : '',
  )
</script>

<div class="game">
  {#if step === 'mode'}
    <h2>How do you want to play?</h2>
    <div class="choices">
      <button onclick={() => choose('pvp')}>Player vs Player</button>
      <button onclick={() => choose('pvc')}>Player vs Computer</button>
    </div>
  {:else if step === 'difficulty'}
    <h2>Choose a difficulty</h2>
    <div class="choices">
      {#each DIFFICULTIES as level (level.id)}
        <button class="wide" onclick={() => chooseDifficulty(level.id)}>
          <span class="level">{level.label}</span>
          <span class="blurb">{level.blurb}</span>
        </button>
      {/each}
    </div>
  {:else if step === 'toss'}
    {#if pendingToss}
      <h2>Coin toss</h2>
      <p class="toss-result" aria-live="polite">
        You called {pendingToss.call}. It was
        <strong>{pendingToss.flip}</strong>.<br />
        {tossWinnerLabel} goes first.
      </p>
      <div class="choices">
        <button onclick={acknowledgeToss}>Continue</button>
      </div>
    {:else}
      <h2>Call the coin</h2>
      <div class="choices">
        <button onclick={() => call('heads')}>Heads</button>
        <button onclick={() => call('tails')}>Tails</button>
      </div>
    {/if}
  {:else if step === 'mark'}
    <h2>{markChooserLabel}, pick your mark</h2>
    <div class="choices">
      <button class="mark" onclick={() => chooseMark('X')}>X</button>
      <button class="mark" onclick={() => chooseMark('O')}>O</button>
    </div>
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
      <div class="choices row">
        <button onclick={playAgain}>Play Again</button>
        <button onclick={() => router.navigate('/menu')}>Back to Menu</button>
      </div>
    {/if}
  {/if}

  {#if step !== 'play'}
    <button class="back" onclick={goBack}>Back</button>
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

  h2 {
    margin: 0;
    font-size: var(--fs-button);
    font-weight: 600;
    text-align: center;
  }

  .choices {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 420px;
  }

  .choices.row {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }

  .choices button {
    width: 100%;
    padding: var(--pad-btn);
    border: none;
    background: var(--btn);
    color: var(--text);
    font-size: var(--fs-button);
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  .choices.row button {
    width: auto;
    min-width: 160px;
  }

  .choices button:hover {
    background: var(--btn-hover);
  }

  .choices button:active {
    background: var(--btn-active);
  }

  .wide {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .level {
    font-size: var(--fs-button);
  }

  .blurb {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .mark {
    font-size: 2rem !important;
    font-weight: 600;
  }

  .toss-result {
    margin: 0;
    text-align: center;
    font-size: 1.125rem;
    line-height: 1.6;
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

  .back {
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 1rem;
    cursor: pointer;
    text-decoration: underline;
  }

  .back:hover {
    color: var(--text);
  }

  @media (prefers-reduced-motion: reduce) {
    .cell,
    .choices button {
      transition: none;
    }
  }
</style>
