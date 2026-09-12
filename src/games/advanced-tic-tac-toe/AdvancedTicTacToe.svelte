<script lang="ts">
  import { coords, type Player } from '../shared/grid3'
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
  } from '../shared/setup'
  import type { Difficulty } from '../shared/difficulty'
  import { router } from '../../lib/router.svelte'
  import { chooseMove, DIFFICULTIES } from './ai'
  import {
    boardsWon,
    emptyGame,
    isPlayable,
    matchStatus,
    matchWinningLine,
    play,
    type Game,
    type Move,
  } from './game'

  /** How long the computer "thinks", so its move doesn't appear instantly. */
  const COMPUTER_DELAY_MS = 450

  /** Read aloud and printed in the status line, so it names a place. */
  const POSITIONS = [
    'top-left',
    'top-centre',
    'top-right',
    'middle-left',
    'centre',
    'middle-right',
    'bottom-left',
    'bottom-centre',
    'bottom-right',
  ]

  let setup = $state<Setup>({ ...EMPTY_SETUP })
  let game = $state<Game>(emptyGame())
  let session = $state({ gamesPlayed: 0, firstWins: 0, secondWins: 0 })

  /** Set between calling the coin and acknowledging the result. */
  let pendingToss = $state<{ call: Coin; flip: Coin } | null>(null)

  const step = $derived(stepFor(setup))
  const result = $derived(matchStatus(game))
  const over = $derived(result.kind !== 'in-progress')
  const metaLine = $derived(matchWinningLine(game))
  const turn = $derived(game.turn)
  const won = $derived(boardsWon(game))

  const statusText = $derived(
    result.kind === 'won'
      ? `${result.winner} wins the match!`
      : result.kind === 'draw'
        ? "It's a draw!"
        : `${turn}'s turn — play in ${
            game.target === null
              ? 'any board'
              : `the ${POSITIONS[game.target]} board`
          }`,
  )

  const scoreText = $derived(
    `Games played: ${session.gamesPlayed} — ` +
      `${roleLabel(setup.mode, 'first')}: ${session.firstWins}, ` +
      `${roleLabel(setup.mode, 'second')}: ${session.secondWins}`,
  )

  // Shown because it is interesting, never because it decides anything: all
  // boards decided with no line is a draw whatever these read.
  const boardsText = $derived(`Boards won — X: ${won.X}, O: ${won.O}`)

  const awaitingComputer = $derived(
    step === 'play' && !over && isComputer(setup, turn),
  )

  function describeBoard(index: number): string {
    const owner = game.owners[index]
    if (owner) return `${POSITIONS[index]} board, won by ${owner}`
    if (game.decided[index]) return `${POSITIONS[index]} board, drawn`
    if (!over && isPlayable(game, index)) {
      return `${POSITIONS[index]} board, play here`
    }
    const free = game.boards[index].filter((cell) => cell === null).length
    return `${POSITIONS[index]} board, ${free} cells free`
  }

  function cellLabel(board: number, cell: number): string {
    const { row, column } = coords(cell)
    const mark = game.boards[board][cell]
    // Both positions, because neither alone identifies a cell among 81 -- and
    // the glyph on its own would announce merely as "X".
    return (
      `${POSITIONS[board]} board, row ${row}, column ${column}` +
      `${mark ? `: ${mark}` : ': empty'}`
    )
  }

  function canPlay(board: number, cell: number): boolean {
    return (
      !over &&
      !awaitingComputer &&
      game.boards[board][cell] === null &&
      isPlayable(game, board)
    )
  }

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
    game = emptyGame(next.startingMark ?? 'X')
  }

  function chooseMark(mark: Player) {
    setup = { ...setup, startingMark: mark }
    game = emptyGame(mark)
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

  function take(move: Move) {
    if (over || isComputer(setup, turn)) return
    const next = play(game, move)
    if (next === game) return // illegal move
    game = next
  }

  function playAgain() {
    // Same mode, difficulty and starting mark — only the board is cleared.
    game = emptyGame(setup.startingMark ?? 'X')
  }

  // Tally each match exactly once, the moment it ends.
  let recordedFor = $state<Game | null>(null)
  $effect(() => {
    if (!over || recordedFor === game) return
    recordedFor = game

    session.gamesPlayed += 1
    if (result.kind === 'won') {
      if (roleOf(setup, result.winner) === 'first') session.firstWins += 1
      else session.secondWins += 1
    }
  })

  // Drive the computer's turn. Note the search runs *after* the delay, so its
  // cost is on top of it rather than hidden by it -- which is why Hard is
  // bounded by a node budget.
  $effect(() => {
    if (!awaitingComputer || !setup.difficulty) return

    const snapshot = game
    const mark = turn
    const difficulty = setup.difficulty
    const timer = setTimeout(() => {
      // Guard against the game having moved on (reset, navigation) while the
      // timer was pending.
      if (game !== snapshot) return
      game = play(snapshot, chooseMove(snapshot, mark, difficulty))
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

    <!-- `group` rather than `grid`: three levels of nesting don't map onto
         ARIA's grid/row/gridcell model, and the DOM order here is board-major
         rather than visual-row-major -- better for this game, but not what
         `grid` promises a screen reader. -->
    <div class="board" role="group" aria-label="Advanced Tic Tac Toe board">
      {#each game.boards as cells, board (board)}
        <div
          class="board-cell small"
          class:target={!over && game.target === board}
          class:owner-x={game.owners[board] === 'X'}
          class:owner-o={game.owners[board] === 'O'}
          class:drawn={game.decided[board] && game.owners[board] === null}
          class:winning={metaLine?.includes(board)}
          role="group"
          aria-label={describeBoard(board)}
        >
          {#each cells as cell, index (index)}
            <button
              class="board-cell cell"
              class:x={cell === 'X'}
              class:o={cell === 'O'}
              class:last={game.lastMove?.board === board &&
                game.lastMove?.cell === index}
              disabled={!canPlay(board, index)}
              aria-label={cellLabel(board, index)}
              onclick={() => take({ board, cell: index })}
            >
              {cell ?? ''}
            </button>
          {/each}

          {#if game.owners[board]}
            <!-- Absolutely positioned, so a glyph this large never takes part
                 in sizing the tracks underneath it. -->
            <span
              class="owner"
              class:x={game.owners[board] === 'X'}
              class:o={game.owners[board] === 'O'}
              aria-hidden="true">{game.owners[board]}</span
            >
          {/if}
        </div>
      {/each}
    </div>

    <p class="score">{scoreText}</p>
    <p class="score boards">{boardsText}</p>

    <!-- Always rendered, only hidden, so the row keeps its space in the column.
         Inserting it at game over grew the centred column and shunted the board
         upwards mid-game. `inert` keeps the hidden buttons out of the focus
         order and the accessibility tree. -->
    <div class="choices row endgame" class:hidden={!over} inert={!over}>
      <button onclick={playAgain}>Play Again</button>
      <button onclick={() => router.navigate('/menu')}>Back to Menu</button>
    </div>
  {/if}

  {#if step !== 'play'}
    <button class="back" onclick={goBack}>Back</button>
  {/if}
</div>

<style>
  /* Same shape as Tic Tac Toe's screen; see that component for why the pre-game
     screens stay on the shell tokens while the board takes the --game-* set. */
  .game {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap-grid);
    width: 100%;
    color: var(--game-text);
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
    border: 1px solid var(--border);
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

  .endgame.hidden {
    visibility: hidden;
  }

  .choices button:hover {
    background: var(--btn-hover);
  }

  .choices button:active {
    background: var(--btn-active);
    color: var(--btn-active-text);
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
    text-align: center;
  }

  .score {
    margin: 0;
    font-size: 18px;
    color: var(--text-muted);
    text-align: center;
  }

  .score.boards {
    font-size: 16px;
  }

  /* Deliberately the same sizing rule as Tic Tac Toe's board, so there is one
     rule to reason about across both games. Nine times the cells in the same
     square makes each one small -- about 39px in the 600x900 desktop window
     and 29px at the 400x600 minimum -- which is accepted rather than solved by
     growing this board past the other one. */
  .board {
    --board-size: min(90vw, 55vh, 420px);
    display: grid;
    /* Both axes, at *both* nesting levels. Implicit rows are content-sized, so
       a textless cell's row is short and grows the moment a mark lands in it. */
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 8px;
    padding: 8px;
    background: var(--game-grid);
    width: var(--board-size);
    aspect-ratio: 1;
  }

  /* A grid item defaults to min-width/min-height: auto and refuses to shrink
     below its content. At this cell size the owner glyph would blow out a
     track and un-square the board, so every item in either grid opts out. */
  .board-cell {
    min-width: 0;
    min-height: 0;
  }

  .small {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 3px;
    padding: 3px;
    /* Lighter than the outer lines, so the eye reads nine boards rather than
       one grid of eighty-one. No aspect-ratio: the outer rows are already 1fr
       inside a square, and adding it would fight the track distribution. */
    background: color-mix(in srgb, var(--game-grid) 45%, var(--game-bg));
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--game-bg);
    color: var(--game-text);
    /* Derived from the board rather than the viewport, so the glyph tracks the
       square it sits in at every size. */
    font-size: calc(var(--board-size) / 16);
    font-weight: 600;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  .cell.x {
    color: var(--game-x);
  }

  .cell.o {
    color: var(--game-o);
  }

  .cell:hover:not(:disabled) {
    background: color-mix(in srgb, var(--game-grid) 12%, var(--game-bg));
  }

  .cell:disabled {
    cursor: default;
  }

  /* The opponent's last move is easy to lose among 81 cells, and it is the
     thing that explains which board you have been sent to. */
  .cell.last {
    box-shadow: inset 0 0 0 2px
      color-mix(in srgb, var(--game-grid) 55%, var(--game-bg));
  }

  /* The board you must play in. On a free move no ring is drawn at all --
     ringing six boards is noise -- and the status line says so instead. */
  .small.target {
    box-shadow: inset 0 0 0 3px var(--game-win-highlight);
  }

  /* Deliberately no opacity fade on the boards you cannot play in. Two reasons:
     with a target set eight of the nine boards are unplayable, so fading is the
     normal state and carries no signal; and opacity blends a board into
     whatever sits behind it, which is --game-grid -- dark in the light palette
     but light in the dark one, so the same rule darkened the cells in one theme
     and washed them out in the other. The ring below carries "play here"
     instead, identically in both. */

  /* A won board keeps its marks: they are the history of how it was won. The
     tint carries the owner, and the glyph carries it again for anyone who
     cannot separate the two hues. */
  .small.owner-x .cell {
    background: color-mix(in srgb, var(--game-x) 18%, var(--game-bg));
  }

  .small.owner-o .cell {
    background: color-mix(in srgb, var(--game-o) 18%, var(--game-bg));
  }

  .small.drawn .cell {
    background: color-mix(in srgb, var(--game-grid) 18%, var(--game-bg));
  }

  .owner {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: calc(var(--board-size) / 6);
    font-weight: 700;
    line-height: 1;
    opacity: 0.5;
    pointer-events: none;
  }

  .owner.x {
    color: var(--game-x);
  }

  .owner.o {
    color: var(--game-o);
  }

  /* The three boards that won the match, mirroring the winning-cell ring one
     level up. No clash with .target: the match is over, so nothing is a target. */
  .small.winning {
    box-shadow: inset 0 0 0 4px var(--game-win-highlight);
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
