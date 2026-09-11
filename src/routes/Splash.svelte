<script lang="ts">
  import { router } from '../lib/router.svelte'
  import { TOTAL_MS } from './splash-timeline'

  const SEEN_KEY = 'tt:splash-seen'

  /**
   * The Bevy build ran the splash once per process. A SPA would otherwise
   * replay it every time the player navigated back to `#/`, so remember it for
   * the session. Players who prefer reduced motion skip it entirely.
   */
  function shouldSkip(): boolean {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    try {
      return sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      // Private browsing / disabled storage: just show the splash.
      return false
    }
  }

  function done() {
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Not being able to remember is harmless.
    }
    // `replace` so Back from the menu doesn't land on the splash again.
    router.replace('/menu')
  }

  $effect(() => {
    if (shouldSkip()) {
      done()
      return
    }
    const timer = setTimeout(done, TOTAL_MS)
    // Cleanup matters: without it, a player who skips ahead gets bounced back
    // to the menu seconds later, mid-game.
    return () => clearTimeout(timer)
  })
</script>

<!-- Any key or click skips the timeline: a returning player shouldn't sit
     through seven seconds of splash every time. -->
<svelte:window onkeydown={done} />

<div
  class="splash"
  style="--total: {TOTAL_MS}ms"
  onclick={done}
  role="presentation"
>
  <p class="kicker">Welcome to the</p>
  <h1>Tabletop Tavern</h1>
</div>

<style>
  .splash {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: var(--gap-page);
    padding: var(--pad-page);
    background: var(--bg-splash);
    cursor: pointer;
    animation: splash-fade var(--total) linear forwards;
  }

  .kicker {
    margin: 0;
    font-size: 2rem;
    color: var(--text);
  }

  h1 {
    margin: 0;
    font-size: var(--fs-splash);
    font-weight: 600;
    letter-spacing: 0.02em;
    text-align: center;
    color: var(--text);
  }

  /* Keyframe offsets must be literal percentages -- `var()` is not allowed in
     a keyframe selector -- so these mirror the timeline constants above:
     3s fade in (3/7 = 42.86%), hold to 5s (5/7 = 71.43%), then fade out.
     The `splash timeline` test in Splash.test.ts fails if they drift apart. */
  @keyframes splash-fade {
    0% {
      opacity: 0;
    }
    42.86% {
      opacity: 1;
    }
    71.43% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .splash {
      animation: none;
    }
  }
</style>
