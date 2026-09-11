<script lang="ts">
  import GameCard from '../components/GameCard.svelte'
  import ThemeToggle from '../components/ThemeToggle.svelte'
  import { GAMES } from '../lib/games'
  import { isDesktopApp, quitApp } from '../lib/platform'
</script>

<main class="page">
  <!-- Outside the scroll container, so the title and the theme toggle stay put
       while the games scroll under them. -->
  <div class="header">
    <div class="topbar">
      <ThemeToggle />
    </div>

    <h1>Tabletop Tavern</h1>
  </div>

  <div class="scroller">
    <div class="content">
      <!-- The Bevy version chunked these into explicit rows of three to dodge a
           taffy layout bug (see the old src/menu.rs). CSS has no such bug, so
           this is a plain wrapping flex row -- which also happens to be what
           makes the menu work on a narrow phone. Flex (not grid) so the short
           final row stays centred, matching how the ten buttons used to look. -->
      <div class="grid">
        {#each GAMES as game (game.id)}
          <GameCard {game} />
        {/each}
      </div>

      {#if isDesktopApp}
        <button class="quit" onclick={quitApp}>Quit</button>
      {/if}
    </div>
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
    /* The page itself no longer scrolls -- .scroller does, so that the header
       above it stays put. */
    overflow: hidden;
  }

  .header {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: var(--gap-page);
    width: 100%;
    max-width: var(--grid-max);
    padding-top: var(--pad-page);
    /* Matches the row gap the title used to have above the first row of games,
       now that they're in separate containers and no gap spans the two. */
    padding-bottom: var(--gap-page);
  }

  /* Full width of the header, so the button lines up with the right edge of the
     card grid below it. In the column rather than fixed to the corner: fixed
     positioning would overlap the title once the viewport is narrow enough for
     the two to meet. */
  .topbar {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

  /*
   * The only thing that scrolls. `min-height: 0` is what lets it: a flex item
   * defaults to `min-height: auto`, which refuses to shrink below its content,
   * so without this the games would push the header off the top of the page
   * instead of scrolling under it.
   */
  .scroller {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    overflow-y: auto;
  }

  /*
   * Centred with auto margins rather than `justify-content: center`.
   *
   * With `center`, content taller than the scroll container overflows off its
   * *top*, where scrolling cannot reach it -- on a short screen that clipped
   * the first row of games away entirely. `justify-content: safe center` is the
   * textbook fix, but Vite's CSS minifier drops the `safe` keyword and silently
   * reintroduces the bug. Auto margins behave the same way and survive
   * minification: they centre when there's room and collapse to 0 when there
   * isn't.
   */
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: var(--gap-page);
    width: 100%;
    max-width: var(--grid-max);
    margin-block: auto;
    padding-bottom: var(--pad-page);
  }

  h1 {
    margin: 0;
    font-size: var(--fs-title);
    font-weight: 600;
    text-align: center;
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
    color: var(--quit-text);
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
