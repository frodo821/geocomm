<script lang="ts">
  import { afterUpdate } from "svelte";
  import { distance, fromGeoPoint, type LatLng } from "../utils/geolocation";
  import { Channel, Messenger, type ReceivedMessage } from "../utils/messenger";

  export let message: ReceivedMessage;
  export let loc: LatLng;
  export let messenger: Messenger;
  export let locationEnabled: boolean = false;
  export let onMessageDeleted: (id: string) => void = () => {};
  export let onReplySelected: (id: string | null) => void = () => {};
  export let onChannelChanged: () => void = () => {};
  export let replyTo: string | null = null;

  let self: HTMLDivElement;

  const parseContent = (content: string) => {
    content = content.replace(
      /[&'`"<>]/g,
      (m) =>
        ({
          "&": "&amp;",
          "'": "&#x27;",
          "`": "&#x60;",
          '"': "&quot;",
          "<": "&lt;",
          ">": "&gt;",
        }[m] ?? "")
    );

    return content.replace(/\+\d{1,3}\.\d{1,3}\.\d{1,3}/g, (m) => {
      return `<button class="channel-${message.id}" data-channel=${m.slice(
        1
      )}>${m}</button>`;
    });
  };

  afterUpdate(() => {
    const buttons = self.querySelectorAll(`.channel-${message.id}`);
    buttons.forEach((button) => {
      const channel = button.getAttribute("data-channel");

      if (channel === null) {
        return;
      }

      const [a, b, c] = channel.split(".").map((n) => parseInt(n));

      if (isNaN(a) || isNaN(b) || isNaN(c)) {
        return;
      }

      button.addEventListener("click", () => {
        messenger.channel = new Channel(a, b, c);
        onChannelChanged();
      });
    });
  });
</script>

<div class="message" bind:this={self} class:reply-to={replyTo === message.id}>
  <p class="username">{message.user.display_name}</p>
  <div class="content">
    {#if message.replied_message !== null}
      {@const msg = message.replied_message}
      <div class="replying">
        <p class="username">
          from: {msg.user.display_name}
          <button
            type="button"
            class="change-channel"
            on:click={() => {
              messenger.channel = new Channel(
                msg.channel_a,
                msg.channel_b,
                msg.channel_c
              );
              onChannelChanged();
            }}
          >
            +{msg.channel_a}.{msg.channel_b}.{msg.channel_c}
          </button>
        </p>
        <div class="replying-content">
          {@html parseContent(msg.content)}
        </div>
      </div>
    {/if}
    <div class="self-content">
      {@html parseContent(message.content)}
    </div>
  </div>
  <p class="channel">
    <button
      type="button"
      class="change-channel"
      on:click={() => {
        messenger.channel = new Channel(
          message.channel_a,
          message.channel_b,
          message.channel_c
        );
        onChannelChanged();
      }}
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
  <div class="controls">
    {#if messenger.uid !== null}
      <button
        type="button"
        on:click={() => {
          if (replyTo === message.id) {
            onReplySelected(null);
          } else {
            onReplySelected(message.id);
          }
        }}
        class="material-symbols-outlined controls-button"
      >
        {#if replyTo === message.id}
          cancel
        {:else}
          reply
        {/if}
      </button>
    {/if}
    {#if message.user_id === messenger.uid}
      <button
        type="button"
        on:click={() => {
          if (confirm("削除しますか？")) {
            messenger.deleteMessage(message.id);
            onMessageDeleted(message.id);
          }
        }}
        class="material-symbols-outlined controls-button"
      >
        delete
      </button>
    {/if}
  </div>
</div>

<style>
  .message {
    border-radius: 5px;
    border: solid 2px;
    padding: 0.1rem 0.6rem;
    margin: 0.4rem 0.2rem;
    display: grid;
    grid-template-columns: 4fr 2fr 1fr;
    grid-template-rows: 1.6rem 1fr 1.6rem;
    grid-row-gap: 0.1rem;
  }

  .message.reply-to {
    border-color: rgb(0, 207, 76);
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
    padding: 0.2rem 0.1rem;
  }

  .message > .channel {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }

  button.change-channel,
  .message > .content :global(button) {
    background: none;
    border: none;
    border-bottom: solid 1px;
    color: rgb(0, 90, 207);
    cursor: pointer;
  }

  button.change-channel:hover,
  .message > .content :global(button:hover) {
    color: rgb(100, 131, 0);
  }

  button.change-channel:active,
  .message > .content :global(button:active) {
    color: rgb(70, 0, 105);
  }

  .message > .distance {
    grid-column: 3 / 4;
    grid-row: 3 / 4;
    text-align: right;
  }

  .content > .replying {
    border: solid 2px;
    border-radius: 5px;
    padding: 0.2rem;
    margin: 0.4rem 0;
  }

  .content > .replying p.username {
    margin: 0;
    position: relative;
    top: -1rem;
    left: 4px;
    background: white;
    width: fit-content;
    padding: 0 0.3rem;
  }

  .content > .replying .replying-content {
    padding: 0.2rem 0.4rem;
    margin-top: -1rem;
  }

  .controls {
    grid-row: 3/4;
    grid-column: 1/3;
    border-top: solid 1px;
    display: grid;
    justify-content: flex-start;
    grid-auto-flow: column;
  }

  button.controls-button {
    background: none;
    border: none;
    user-select: none;
    transition: 250ms;
  }

  button.controls-button:hover {
    color: rgb(0, 159, 171);
  }

  button.controls-button:active {
    color: rgba(52, 117, 122, 0.5);
  }
</style>
