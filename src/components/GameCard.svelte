<script lang="ts">
  import { WIP_NOTE, type GameEntry } from '../lib/games'
  import { router } from '../lib/router.svelte'

  let { game }: { game: GameEntry } = $props()

  const isWip = $derived(game.status === 'wip')
  const noteId = $derived(`wip-${game.id}`)

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
    border: none;
    background: var(--btn);
    color: var(--text);
    cursor: pointer;
    transition: background-color 120ms ease;
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
  }

  .card:active:not(.wip) {
    background: var(--btn-active);
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
