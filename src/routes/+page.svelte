<script lang="ts">
  import { signingIn, getAuthResult } from "../utils/firebase-client";
  import UI from "../widgets/UI.svelte";

  const authResult = getAuthResult();
</script>

<div class="application">
{#await authResult}
  <div class="heading">
    <h1>Loading...</h1>
  </div>
{:then authResult}
  <div class="heading">
    <h1>Sonorous</h1>
    {#if !authResult}
      <div>
        <button type="button" on:click={() => signingIn()}>Sign in with Google</button>
      </div>
    {/if}
  </div>
  <div class="ui-container">
    <UI />
  </div>
{/await}
</div>

<style>
  @media screen and (min-width:1024px) {
    .application {
      grid-template-rows: 8vh 92vh;
      grid-template-columns: 1fr 22fr;
      height: 100vh;
    }
    .heading {
      grid-row: 1/2;
      grid-column: 2/3;
      grid-template-columns: 10fr 1fr;
      z-index: 1;
    }
    .ui-container {
      grid-row: 2/3;
      grid-column: 1/3;
    }
  }

  .application {
    display: grid;
  }

  .heading {
    margin: 0.2rem 0;
    padding: 0.2rem;
    border-radius: 5px;
    background: rgba(255, 253, 240, 0.715);
    display: grid;
  }

  h1 {
    margin: 0;
  }

  :global(body) {
    margin: 0;
  }
</style>
