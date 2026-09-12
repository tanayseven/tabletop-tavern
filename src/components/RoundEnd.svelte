<script lang="ts">
  import { router } from '../lib/router.svelte'

  interface Props {
    /** Starts a fresh round on the same setup. */
    onplayagain: () => void
  }

  let { onplayagain }: Props = $props()
</script>

<!-- The two options every finished round offers. Shared so both Tic Tac Toe
     games end the same way. -->
<div class="choices">
  <button onclick={onplayagain}>Play Again</button>
  <button onclick={() => router.navigate('/menu')}>Back to Menu</button>
</div>

<style>
  .choices {
    display: flex;
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  button {
    min-width: 160px;
    padding: var(--pad-btn);
    border: none;
    background: var(--btn);
    color: var(--text);
    font-size: var(--fs-button);
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  button:hover {
    background: var(--btn-hover);
  }

  button:active {
    background: var(--btn-active);
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
</style>
