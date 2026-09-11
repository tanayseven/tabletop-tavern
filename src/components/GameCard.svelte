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

<div class="slot">
  <button
    class="card"
    class:wip={isWip}
    aria-disabled={isWip}
    aria-describedby={isWip ? noteId : undefined}
    aria-label={game.title}
    onclick={open}
  >
    <!-- The button carries an explicit aria-label so its accessible name is the
         title alone. Without it the note below would be appended to the name,
         leaving screen-reader users with "Sudoku Work in progress" as the
         button's identity rather than as its description. -->
    <span class="title">{game.title}</span>
    {#if isWip}
      <!-- Rendered once and shown two different ways: as a hover popover where
           there's a real pointer, and as inline text where there isn't. On a
           phone a hover-only tooltip would leave every card unexplained. -->
      <span class="note" id={noteId}>{WIP_NOTE}</span>
    {/if}
  </button>
</div>

<style>
  .slot {
    position: relative;
    /* display:flex so the card fills the slot's full height. The grid stretches
       every slot in a row to match its tallest, so without this a short title
       like "Ludo" sits next to a wrapped "Snakes and Ladders" as a shorter
       button, leaving the row visibly ragged. */
    display: flex;
    flex: 0 1 200px;
    min-width: 140px;
  }

  .card {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: var(--pad-btn);
    border: none;
    background: var(--btn);
    color: var(--text);
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  .title {
    font-size: var(--fs-button);
    /* Long titles like "Advanced Tic Tac Toe" must not blow out a 140px card. */
    overflow-wrap: anywhere;
  }

  .card:hover:not(.wip) {
    background: var(--btn-hover);
  }

  .card:active:not(.wip) {
    background: var(--btn-active);
  }

  .card.wip {
    cursor: not-allowed;
    color: var(--text-muted);
  }

  .note {
    font-size: var(--fs-note);
    color: var(--text-muted);
  }

  /* Where hover exists, promote the note into the tooltip the Bevy build had:
     same 16px text, 8px/4px padding and 85%-black background, floating above
     the card. */
  @media (hover: hover) and (pointer: fine) {
    .note {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 1;
      padding: 4px 8px;
      white-space: nowrap;
      background: var(--tooltip-bg);
      color: var(--text);
      opacity: 0;
      transition: opacity 120ms ease;
      pointer-events: none;
    }

    .card:hover .note,
    .card:focus-visible .note {
      opacity: 1;
    }

    .card.wip:hover {
      background: var(--btn-hover);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .note {
      transition: none;
    }
  }
</style>
