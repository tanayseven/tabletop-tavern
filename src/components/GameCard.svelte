<script lang="ts">
  import { WIP_NOTE, type GameEntry } from '../lib/games'
  import { router } from '../lib/router.svelte'

  let { game }: { game: GameEntry } = $props()

  const isWip = $derived(game.status === 'wip')
  const noteId = $derived(`wip-${game.id}`)
  // Capitalised so it can be used as a component in the markup below.
  const Preview = $derived(game.preview)

  function open() {
    if (isWip) return
    router.navigate(`/game/${game.id}`)
  }
</script>

<button
  class="card"
  class:wip={isWip}
  aria-disabled={isWip}
  aria-describedby={isWip ? noteId : undefined}
  aria-label={game.title}
  onclick={open}
>
  <!-- The button carries an explicit aria-label so its accessible name is the
       title alone. Without it the "Coming soon" note would be folded into the
       name, leaving screen-reader users with "Sudoku Coming soon" as the
       button's identity rather than as its description. -->
  {#if isWip}
    <span class="note" id={noteId}>{WIP_NOTE}</span>
  {:else if Preview}
    <!-- Decorative, and `aria-hidden` inside itself: a card that shows a game
         playing must still announce as just its title. -->
    <Preview />
  {/if}
  <span class="title">{game.title}</span>
</button>

<style>
  .card {
    /* --card-width / --card-height are defined in app.css, because the grid
       needs them to size its columns. */
    width: 100%;
    height: var(--card-height);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--pad-btn);
    border: 2px solid var(--border);
    background: var(--btn);
    color: var(--text);
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }

  .title {
    /* A fixed fraction of the already-clamped height, so the label grows and
       shrinks in lockstep with the button rather than drifting out of
       proportion at the extremes where the clamp has taken over. */
    font-size: calc(var(--card-height) * 0.12);
    /* `margin-top: auto` pushes the name to the bottom of the button, whether
       or not the "Coming soon" note sits above it. */
    margin-top: auto;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .note {
    font-size: 14px;
    color: var(--text-muted);
    text-align: center;
  }

  .card:hover:not(.wip) {
    background: var(--btn-hover);
    border-color: var(--btn-active);
  }

  /* The amber fill is dark enough in light mode and light enough in dark mode
     that the card's usual body colour stops contrasting; --btn-active-text is
     the ink that goes with it. */
  .card:active:not(.wip) {
    background: var(--btn-active);
    border-color: var(--btn-active);
    color: var(--btn-active-text);
  }

  .card.wip {
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }
  }
</style>
