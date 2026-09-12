<script lang="ts">
  import {
    back,
    EMPTY_SETUP,
    flipCoin,
    roleLabel,
    stepFor,
    tossWinner,
    type Coin,
    type Difficulty,
    type DifficultyOption,
    type Mode,
    type Setup,
  } from '../lib/setup'
  import type { Mark } from '../lib/grid'

  interface Props {
    /** The difficulty ladder for this game — the blurbs are game-specific. */
    difficulties: readonly DifficultyOption[]
    /** Called once the setup is complete and the round can start. */
    onready: (setup: Setup) => void
    /** Called when Back steps off the first screen. */
    oncancel: () => void
  }

  let { difficulties, onready, oncancel }: Props = $props()

  let setup = $state<Setup>({ ...EMPTY_SETUP })

  /** Set between calling the coin and acknowledging the result. */
  let pendingToss = $state<{ call: Coin; flip: Coin } | null>(null)

  const step = $derived(stepFor(setup))

  /**
   * Commit a change, handing the finished setup to the parent the moment it is
   * complete. Done here rather than in an effect so the handover happens on the
   * click that completed it, in a predictable order.
   */
  function advance(next: Setup) {
    setup = next
    if (stepFor(next) === 'play') onready(next)
  }

  function chooseMode(mode: Mode) {
    advance({ ...setup, mode })
  }

  function chooseDifficulty(difficulty: Difficulty) {
    advance({ ...setup, difficulty })
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

    pendingToss = null
    advance(next)
  }

  function chooseMark(mark: Mark) {
    advance({ ...setup, startingMark: mark })
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
      oncancel()
      return
    }
    setup = previous
  }

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

<div class="setup">
  {#if step === 'mode'}
    <h2>How do you want to play?</h2>
    <div class="choices">
      <button onclick={() => chooseMode('pvp')}>Player vs Player</button>
      <button onclick={() => chooseMode('pvc')}>Player vs Computer</button>
    </div>
  {:else if step === 'difficulty'}
    <h2>Choose a difficulty</h2>
    <div class="choices">
      {#each difficulties as level (level.id)}
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
  {/if}

  <button class="back" onclick={goBack}>Back</button>
</div>

<style>
  .setup {
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
    .choices button {
      transition: none;
    }
  }
</style>
