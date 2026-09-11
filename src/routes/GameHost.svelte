<script lang="ts">
  import type { Component } from 'svelte'
  import { findGame, WIP_NOTE } from '../lib/games'
  import { router } from '../lib/router.svelte'

  let { id }: { id: string } = $props()

  const game = $derived(findGame(id))

  // Resolves to the game's component, or rejects so the `:catch` block can
  // report a genuinely broken chunk rather than silently showing nothing.
  const loading = $derived.by(async (): Promise<Component | null> => {
    if (!game?.load) return null
    const module = await game.load()
    return module.default
  })

  function back() {
    router.navigate('/menu')
  }
</script>

<div class="host">
  <header>
    <button class="back" onclick={back}>← Menu</button>
    <h1>{game?.title ?? 'Unknown game'}</h1>
  </header>

  <div class="stage">
    {#if !game}
      <p class="message">There's no game called “{id}”.</p>
    {:else if game.status === 'wip'}
      <p class="message">{WIP_NOTE}.</p>
    {:else}
      {#await loading}
        <p class="message">Loading…</p>
      {:then Game}
        {#if Game}
          <Game />
        {/if}
      {:catch}
        <p class="message">This game failed to load. Try again?</p>
      {/await}
    {/if}
  </div>
</div>

<style>
  .host {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-page);
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  header {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--gap-grid);
    padding: var(--pad-page);
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .back {
    padding: 8px 12px;
    border: none;
    background: var(--btn);
    cursor: pointer;
  }

  .back:hover {
    background: var(--btn-hover);
  }

  .stage {
    flex: 1;
    display: flex;
    padding: var(--pad-page);
    overflow: auto;
  }

  /* Auto margins rather than `justify-content: center`, for the same reason as
     the menu: a board bigger than the stage must overflow where it can still be
     scrolled to. */
  .stage > :global(*) {
    margin: auto;
  }

  .message {
    margin: 0;
    font-size: var(--fs-button);
    color: var(--text-muted);
  }
</style>
