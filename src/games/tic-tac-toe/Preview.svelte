<script lang="ts">
  import { FINAL_FRAME, FRAMES, holdAt } from './preview'

  /**
   * A miniature game playing itself on the menu card.
   *
   * Decorative only: it is `aria-hidden`, has no controls, and nothing about it
   * reaches the card's accessible name. A screen reader still hears just the
   * game's title.
   *
   * The timing lives entirely in `preview.ts` and is applied with setTimeout,
   * so there is no CSS timeline to keep in step with it. The only animation in
   * the stylesheet below is the per-mark pop, which runs once when a mark's
   * element is created and has no counterpart in TypeScript.
   */

  const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

  let step = $state(0)
  let reduced = $state(false)

  const frame = $derived(reduced ? FINAL_FRAME : FRAMES[step])

  // Guarded because jsdom -- and not every webview -- implements matchMedia.
  $effect(() => {
    if (typeof matchMedia !== 'function') return

    const query = matchMedia(REDUCED_MOTION)
    reduced = query.matches

    const onChange = (event: MediaQueryListEvent) => {
      reduced = event.matches
      // Restart from an empty board rather than resuming mid-game, so turning
      // motion back on doesn't drop the viewer into the middle of a position.
      step = 0
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  })

  // Each frame schedules the next, so a frame's hold time is its own. Reading
  // `step` is what re-runs this effect, and the cleanup cancels the pending
  // timer whenever it does -- including on unmount, so a menu that has gone
  // away stops animating.
  $effect(() => {
    if (reduced) return

    const timer = setTimeout(() => {
      step = (step + 1) % FRAMES.length
    }, holdAt(step))

    return () => clearTimeout(timer)
  })
</script>

<div class="preview" aria-hidden="true">
  {#each frame.cells as cell, index (index)}
    <div class="cell" class:winning={frame.line?.includes(index)}>
      {#if cell}
        <!-- Created the moment the cell is played and destroyed when the loop
             clears the board, which is what replays the pop on every pass. -->
        <span class="mark" class:x={cell === 'X'} class:o={cell === 'O'}>
          {cell}
        </span>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* The same visual language as the real board: the grid colour shows through
     the gaps and the padding frames it, with the cells sitting on top. */
  .preview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 2px;
    padding: 2px;
    background: var(--game-grid);
    /* A fraction of the already-clamped card height, like the title below it,
       so the board tracks the button instead of drifting at the extremes. */
    height: calc(var(--card-height) * 0.42);
    aspect-ratio: 1;
    /* The card is a flex column, so without this the board is stretched to the
       card's width by `align-items: center`'s cross-axis sizing and stops
       being square. */
    flex: none;
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--game-bg);
    overflow: hidden;
  }

  .mark {
    font-size: calc(var(--card-height) * 0.09);
    font-weight: 600;
    line-height: 1;
    animation: pop 200ms ease-out;
  }

  /* Hue *and* lightness apart, so the two marks stay distinguishable for a
     red-green colour-blind viewer and in greyscale. */
  .mark.x {
    color: var(--game-x);
  }

  .mark.o {
    color: var(--game-o);
  }

  /* A heavier wash than the real board's, which carries the highlight in an
     inset ring instead. At this size a ring is thinner than the grid lines
     around it and disappears, so the fill has to do the work on its own. */
  .cell.winning {
    background: color-mix(
      in srgb,
      var(--game-win-highlight) 45%,
      var(--game-bg)
    );
  }

  @keyframes pop {
    from {
      transform: scale(0.4);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mark {
      animation: none;
    }
  }
</style>
