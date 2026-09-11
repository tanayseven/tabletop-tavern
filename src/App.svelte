<script lang="ts">
  import GameHost from './routes/GameHost.svelte'
  import Menu from './routes/Menu.svelte'
  import Splash from './routes/Splash.svelte'
  import { router } from './lib/router.svelte'

  const route = $derived(router.route)
</script>

{#if route.name === 'splash'}
  <Splash />
{:else if route.name === 'game'}
  <!-- Keyed so switching between two games remounts rather than reusing one
       game's state in the other. -->
  {#key route.id}
    <GameHost id={route.id} />
  {/key}
{:else}
  <Menu />
{/if}
