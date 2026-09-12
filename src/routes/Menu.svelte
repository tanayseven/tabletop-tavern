<script lang="ts">
  import GameCard from '../components/GameCard.svelte'
  import { GAMES } from '../lib/games'
  import { isDesktopApp, quitApp } from '../lib/platform'
</script>

<main class="page">
  <div class="content">
    <h1>Tabletop Tavern</h1>

    <!-- The only scrolling element on the screen: the title above and Quit
         below stay put while the cards move. -->
    <div class="scroller">
      <!-- The Bevy version chunked these into explicit rows of three to dodge
           a taffy layout bug (see the old src/menu.rs). CSS has no such bug, so
           this is a plain grid -- which also happens to be what makes the menu
           work on a narrow phone. -->
      <div class="grid">
        {#each GAMES as game (game.id)}
          <GameCard {game} />
        {/each}
      </div>
    </div>

    {#if isDesktopApp}
      <button class="quit" onclick={quitApp}>Quit</button>
    {/if}
  </div>
</main>

<style>
  .page {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--pad-page);
    /* Plus the iOS notch/home-indicator insets, which the Bevy build never
       had to think about. */
    padding-top: max(var(--pad-page), env(safe-area-inset-top));
    padding-bottom: max(var(--pad-page), env(safe-area-inset-bottom));
    background: var(--bg-page);
    /* The page itself never scrolls -- only the card list does, so the title
       and Quit stay put. */
    overflow: hidden;
  }

  /*
   * Centred with auto margins rather than `justify-content: center`.
   *
   * With `center`, content taller than the viewport overflows off the *top* of
   * the scroll container, where scrolling cannot reach it -- on a short phone
   * screen that clipped the title away entirely. `justify-content: safe center`
   * is the textbook fix, but Vite's CSS minifier drops the `safe` keyword and
   * silently reintroduces the bug. Auto margins behave the same way and survive
   * minification: they centre when there's room and collapse to 0 when there
   * isn't.
   *
   * `max-height` is what caps this at the viewport once the cards no longer
   * fit; past that point the auto margins collapse and .scroller takes over.
   */
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: var(--gap-page);
    width: 100%;
    max-width: var(--grid-max);
    max-height: 100%;
    min-height: 0;
    margin-block: auto;
    padding-block: var(--pad-page);
  }

  h1 {
    flex: none;
    margin: 0;
    font-size: var(--fs-title);
    font-weight: 600;
    text-align: center;
  }

  /* The one scrolling element on the screen. `min-height: 0` is what lets it
     shrink below the height of the cards inside it -- without it a flex item
     refuses to go under its content size and the overflow escapes back onto
     the page. The padding keeps focus rings on the outermost cards from being
     clipped by the scroll container's edge. */
  .scroller {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 6px;
    overflow: hidden auto;
    overscroll-behavior: contain;
  }

  /* Two per row, as an explicit grid rather than a wrapping flex row. The cards
     are clamped to a minimum width, so a wrapping row would fit three or four
     per line on a wide window instead of the intended two. */
  .grid {
    display: grid;
    /* Explicit column widths rather than `auto`: a card sized as a percentage
       of an `auto` column is circular, and collapses the card to its text. */
    grid-template-columns: repeat(2, var(--card-width));
    justify-content: center;
    row-gap: 32px;
    column-gap: var(--gap-grid);
    width: 100%;
    max-width: var(--grid-max);
    /* Same auto-margin trick as .content: centre the cards in the scroller
       when they fit, collapse to the top edge when they don't. */
    margin-block: auto;
  }

  /* Two 220px cards plus the gap don't fit a phone, so drop to one column
     before they start overflowing. The Bevy build never had to handle this. */
  @media (max-width: 520px) {
    .grid {
      grid-template-columns: minmax(0, var(--card-width));
    }
  }

  .quit {
    flex: none;
    width: 200px;
    max-width: 100%;
    margin-top: var(--gap-grid);
    padding: var(--pad-btn);
    border: none;
    font-size: var(--fs-button);
    background: var(--quit);
    color: var(--text);
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  .quit:hover {
    background: var(--quit-hover);
  }

  .quit:active {
    background: var(--quit-active);
  }

  @media (prefers-reduced-motion: reduce) {
    .quit {
      transition: none;
    }
  }
</style>
