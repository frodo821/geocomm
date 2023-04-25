<script lang="ts">
  import { onMount } from 'svelte';

  let client: typeof import('../utils/firebase-client');
  let UI: typeof import('../widgets/UI.svelte').default;
  let authResult: Promise<any | null>;

  onMount(async () => {
    UI = (await import('../widgets/UI.svelte')).default;
    client = await import('../utils/firebase-client');
    authResult = client.getAuthResult();
  });
</script>

{#if client}
  <div class="application">
    {#await authResult}
      <div class="heading">
        <h1>Loading...</h1>
      </div>
    {:then ar}
      <div class="heading">
        <h1>Sonorous</h1>
        {#if (ar?.isAnonymous ?? true)}
          <div>
            <button type="button" on:click={() => client.signingIn()}>
              Sign in with Google
            </button>
          </div>
        {/if}
      </div>
      <div class="ui-container">
        <UI />
      </div>
    {/await}
  </div>
{:else}
  <div class="heading">
    <h1>Loading...</h1>
  </div>
{/if}

<style>
  @media screen and (min-width: 1024px) {
    .application {
      grid-template-rows: 8vh 92vh;
      grid-template-columns: 1fr 22fr;
      height: 100vh;
    }
    .heading {
      grid-row: 1/2;
      grid-column: 2/3;
      grid-template-columns: 10fr 1fr;
    }
    .ui-container {
      grid-row: 2/3;
      grid-column: 1/3;
    }
  }

  @media screen and (max-width: 1023px) {
    .application {
      display: grid;
      grid-template-rows: 7.5vh 42.5vh;
      grid-row-gap: 50vh;
    }

    .ui-container {
      height: 100%;
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
    z-index: 1;
  }

  h1 {
    margin: 0;
  }

  :global(body) {
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
</style>
