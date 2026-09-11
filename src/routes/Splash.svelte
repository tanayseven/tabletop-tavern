<script lang="ts">
  import { router } from '../lib/router.svelte'

  const DURATION_MS = 2000
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
    const timer = setTimeout(done, DURATION_MS)
    // Cleanup matters: without it, a player who skips ahead gets bounced back
    // to the menu two seconds later, mid-game.
    return () => clearTimeout(timer)
  })
</script>

<svelte:window onkeydown={done} />

<!-- Skippable, but not announced: it's a courtesy, not a control worth
     interrupting a screen reader for. The page is only up for two seconds. -->
<div class="splash" onclick={done} role="presentation">
  <h1>Tabletop Tavern</h1>
</div>

<style>
  .splash {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--pad-page);
    background: var(--bg-splash);
    cursor: pointer;
  }

  h1 {
    margin: 0;
    font-size: var(--fs-splash);
    font-weight: 600;
    letter-spacing: 0.02em;
    text-align: center;
    color: var(--text);
    animation: fade-in 400ms ease-out both;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    h1 {
      animation: none;
    }
  }
</style>
