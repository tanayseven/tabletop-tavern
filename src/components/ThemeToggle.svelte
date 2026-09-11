<script lang="ts">
  import { theme } from '../lib/theme.svelte'

  const next = $derived(theme.current === 'dark' ? 'light' : 'dark')

  // The icon shows the palette you'd switch *to*, which is also what the label
  // says -- a sun to go light, a moon to go dark.
  const label = $derived(`Switch to ${next} theme`)
</script>

<!-- An explicit aria-label, because the visible word alone ("Dark") would read
     as the button's name rather than as what pressing it does. -->
<button class="toggle" onclick={() => theme.toggle()} aria-label={label}>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {#if next === 'light'}
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 1.8v2.6M12 19.6v2.6M4.4 4.4l1.9 1.9M17.7 17.7l1.9 1.9M1.8 12h2.6M19.6 12h2.6M4.4 19.6l1.9-1.9M17.7 6.3l1.9-1.9"
      />
    {:else}
      <path d="M20.5 14.8A8.8 8.8 0 0 1 9.2 3.5a8.8 8.8 0 1 0 11.3 11.3Z" />
    {/if}
  </svg>
  <span>{next === 'dark' ? 'Dark' : 'Light'}</span>
</button>

<style>
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    background: var(--btn);
    color: var(--text);
    font-size: var(--fs-note);
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease;
  }

  .toggle:hover {
    background: var(--btn-hover);
    border-color: var(--btn-active);
  }

  .toggle:active {
    background: var(--btn-active);
    border-color: var(--btn-active);
    color: var(--btn-active-text);
  }

  svg {
    /* Scales with the label rather than sitting at a fixed pixel size. */
    width: 1.15em;
    height: 1.15em;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle {
      transition: none;
    }
  }
</style>
