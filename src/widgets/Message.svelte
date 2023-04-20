<script lang="ts">
  import { afterUpdate } from "svelte";
  import { distance, fromGeoPoint, type LatLng } from "../utils/geolocation";
  import { Channel, type ReceivedMessage } from "../utils/messenger";

  export let message: ReceivedMessage;
  export let loc: LatLng;
  export let setChannel: (channel: Channel) => void = () => {};
  export let locationEnabled: boolean = false;

  let self: HTMLDivElement;

  const parseContent = (content: string) => {
    content = content.replace(
      /[&'`"<>]/g,
      (m) =>
        ({"&": "&amp;", "'": "&#x27;", "`": "&#x60;", '"': "&quot;", "<": "&lt;", ">": "&gt;"}[m] ?? "")
    );

    return content.replace(/\+\d{1,3}\.\d{1,3}\.\d{1,3}/g, (m) => {
      return `<button class="channel-${message.id}" data-channel=${m.slice(1)}>${m}</button>`;
    });
  };

  afterUpdate(() => {
    const buttons = self.querySelectorAll(`.channel-${message.id}`);
    buttons.forEach((button) => {
      const channel = button.getAttribute('data-channel');

      if (channel === null) {
        return;
      }

      const [a, b, c] = channel.split('.').map((n) => parseInt(n));

      if (isNaN(a) || isNaN(b) || isNaN(c)) {
        return;
      }

      button.addEventListener('click', () => {
        setChannel(new Channel(a, b, c));
      });
    });
  });
</script>

<div class="message" bind:this={self}>
  <p class="username">{message.user.display_name}</p>
  <p class="content">
    {@html parseContent(message.content)}
  </p>
  <p class="channel">
    <button
      type="button"
      on:click={() =>
        setChannel(
          new Channel(message.channel_a, message.channel_b, message.channel_c)
        )}
    >
      +{message.channel_a}.{message.channel_b}.{message.channel_c}
    </button>
  </p>
  <p class="distance">
    {#if locationEnabled}
      {@const dist =
        Math.floor(distance(fromGeoPoint(message.at), loc) / 10) / 100}
      {#if dist < 1}
        {dist * 1000}m
      {:else}
        {dist}km
      {/if}
    {:else}
      不明
    {/if}
  </p>
</div>

<style>
  .message {
    border-radius: 5px;
    border: solid 2px;
    padding: 0.1rem 0.6rem;
    margin: 0.4rem 0.2rem;
    display: grid;
    grid-template-columns: 1fr 4fr 1fr;
    grid-template-rows: 1.6rem 1fr 1.6rem;
  }

  .message > p {
    margin: 0;
  }

  .message > .username {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    font-weight: bold;
  }

  .message > .content {
    grid-column: 1 / 4;
    grid-row: 2 / 3;
  }

  .message > .channel {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }

  .message > .channel > button,
  .message > .content > :global(button) {
    background: none;
    border: none;
    border-bottom: solid 1px;
    color: rgb(0, 90, 207);
  }

  .message > .channel > button:hover,
  .message > .content > :global(button:hover) {
    color: rgb(100, 131, 0);
  }

  .message > .channel > button:active,
  .message > .content > :global(button:active) {
    color: rgb(70, 0, 105);
  }

  .message > .distance {
    grid-column: 3 / 4;
    grid-row: 3 / 4;
    text-align: right;
  }
</style>
