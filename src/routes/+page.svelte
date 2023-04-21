<script lang="ts">
  import { signingIn, getAuthResult } from "../utils/firebase-client";
  import UI from "../widgets/UI.svelte";

  const authResult = getAuthResult();
</script>

{#await authResult}
  <h1>Loading...</h1>
{:then authResult}
  <h1>Sonorous</h1>
  {#if !authResult}
    <div>
      <button type="button" on:click={() => signingIn()}>Sign in with Google</button>
    </div>
  {/if}
  <UI />
{/await}
