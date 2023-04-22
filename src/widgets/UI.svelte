<script lang="ts">
  import { onMount } from 'svelte';
  import { degrees, fromGeoPoint, type LatLng } from '../utils/geolocation';
  import { Channel, Messenger, type ReceivedMessage } from '../utils/messenger';
  import MapIndicator from './MapIndicator.svelte';
  import Message from './Message.svelte';
  import { auth } from '../utils/firebase-client';

  function rand() {
    return Math.floor(Math.random() * 256);
  }

  const channels: [number, number, number] = [rand(), rand(), rand()];

  let loc: LatLng = {
    latitude: degrees(0),
    longitude: degrees(0),
  };

  let listenerOpened = false;

  const messenger = new Messenger(new Channel(...channels));
  let enableLocation = false;
  let positionWatcher: number | null = null;
  let currentContent: string = '';

  let replyTo: string | null = null;

  let messages: ReceivedMessage[] = [];

  onMount(() => {
    positionWatcher = navigator.geolocation.watchPosition(
      (position) => {
        enableLocation = true;
        loc = {
          latitude: degrees(position.coords.latitude),
          longitude: degrees(position.coords.longitude),
        };

        messenger.location = loc;
      },
      (err) => {
        console.error(err);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 0,
      }
    );

    messenger.startListening();
    if (messenger.isSignedIn) {
      messenger.register();
    }

    (async function () {
      for await (const message of messenger) {
        messages = [...messages, message];
      }
    })();

    return () => {
      if (positionWatcher !== null) {
        navigator.geolocation.clearWatch(positionWatcher);
      }
      messenger.stopListening();
    };
  });
</script>

<div class="map-layer">
  {#if enableLocation}
    <MapIndicator
      location={loc}
      sensitivity={messenger.sensitivity}
      messages={messages
        .filter((msg) => msg.user_id !== auth.currentUser?.uid)
        .map((msg) => ({
          at: msg.at ? fromGeoPoint(msg.at) : null,
          id: msg.id,
          channel: new Channel(msg.channel_a, msg.channel_b, msg.channel_c),
        }))}
    />
  {/if}
</div>

<div
  class="ui-layer"
  style={`--channel-color: rgb(${channels.join()})`}
  class:not-signed-in={!messenger.isSignedIn}
>
  <div class="listener" class:open={listenerOpened}>
    <div class="channels">
      <h2>Channel</h2>
      <p class="channel-ranges">
        <input
          type="range"
          min="0"
          max="256"
          step="1"
          bind:value={channels[0]}
          on:input={() => (messenger.channel = new Channel(...channels))}
        />
        <input
          type="range"
          min="0"
          max="256"
          step="1"
          bind:value={channels[1]}
          on:input={() => (messenger.channel = new Channel(...channels))}
        />
        <input
          type="range"
          min="0"
          max="256"
          step="1"
          bind:value={channels[2]}
          on:input={() => (messenger.channel = new Channel(...channels))}
        />
      </p>
      <p class="channel">
        <span class="channel-name"
          >+{channels[0]}.{channels[1]}.{channels[2]}</span
        >
        <span
          class="color-display"
          style="background: var(--channel-color, transparent)"
        />
      </p>
    </div>
    <div class="sensitivity">
      <h2>Receive Range Control</h2>
      <p class="sensi-range">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          bind:value={messenger.sensitivity}
        />
        <span>{messenger.sensitivity}</span>
      </p>
    </div>
    <div class="location">
      <h2>Your Location</h2>
      {#if enableLocation}
        <p>
          {Math.abs(loc.latitude)}{loc.latitude >= 0 ? 'N' : 'S'}, {Math.abs(
            loc.longitude
          )}{loc.longitude >= 0 ? 'E' : 'W'}
        </p>
        <p class="note">
          地図の赤い丸の範囲内のメッセージは80%以上の確率で受信できます。
        </p>
      {:else}
        <p class="error">
          現在位置が取得できていません。現在位置が取得できるまで、投稿はできません。
        </p>
      {/if}
    </div>
    <div class="input-content">
      {#if replyTo !== null}
        <p>Replying:</p>
      {/if}
      <textarea rows="8" bind:value={currentContent} />
      <div class="controls">
        <button
          type="button"
          on:click={() => {
            messenger.sendMessage(currentContent, replyTo).then(() => {
              currentContent = '';
              replyTo = null;
              listenerOpened = false;
            });
          }}
          disabled={!enableLocation || currentContent.length === 0}
          class="material-symbols-outlined send-button"
        >
          send
        </button>
        <button
          class="material-symbols-outlined close-button"
          on:click={() => {
            listenerOpened = false;
            replyTo = null;
          }}
        >
          close
        </button>
      </div>
    </div>
  </div>
  <div class="floating-button-listner-open">
    <button
      class="material-symbols-outlined"
      on:click={() => {
        listenerOpened = true;
      }}
    />
  </div>
  <div class="contents">
    <h2 class="contents-heading">Timeline</h2>
    <div class="messages-scroll-wrapper">
      <div class="messages">
        {#each [...messages].reverse() as msg}
          <Message
            {loc}
            {messenger}
            {replyTo}
            message={msg}
            locationEnabled={enableLocation}
            onReplySelected={(id) => {
              replyTo = id;
              if (id !== null) {
                listenerOpened = true;
              }
            }}
            onMessageDeleted={() => {
              messages = messages.filter((m) => m.id !== msg.id);
            }}
            onChannelChanged={() => {
              channels[0] = messenger.channel.channel_a;
              channels[1] = messenger.channel.channel_b;
              channels[2] = messenger.channel.channel_c;
            }}
          />
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  @media screen and (min-width: 1024px) {
    .ui-layer {
      grid-template-columns: 1fr 2fr 1fr;
      grid-template-rows: 100%;
      margin-top: 2rem;
      height: calc(100% - 2rem);
    }
    .messages {
      max-height: calc(100% - 4rem);
    }
    .input-content textarea {
      width: calc(100% - 0.8rem);
    }
    .contents {
      grid-column: 3/4;
    }
    .listener {
      margin: 0.4rem;
      position: relative;
    }
    .listener::before {
      content: '';
      position: absolute;
      top: -0.4rem;
      bottom: -0.4rem;
      right: -0.4rem;
      left: -0.4rem;
      border-radius: 8px;
      background: var(--channel-color, transparent);
      z-index: -2;
    }
    .listener::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      left: 0;
      border-radius: 5px;
      background: white;
      z-index: -1;
    }

    .controls .close-button,
    .floating-button-listner-open {
      display: none;
    }
  }

  @media screen and (max-width: 1023px) {
    .listener.listener {
      transform: translate(3.6rem, -3.6rem) scale(0);
      transition: 250ms;
      transform-origin: bottom left;
      position: absolute;
      background: rgba(255, 255, 255, 0.6);
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      display: flex;
      flex-flow: column;
      justify-content: end;
      padding-bottom: 0.6rem;
    }

    .listener.open.open {
      transform: translate(0%, 0%) scale(1);
    }

    .contents.contents {
      transition: 250ms;
      transform: scale(1);
      background: rgba(255, 255, 255, 0.8);
      height: calc(42.5vh - 0.8rem);
      z-index: 0;
    }

    .listener.open ~ .contents {
      transform: scale(0);
    }

    .floating-button-listner-open {
      position: absolute;
      bottom: 2.5rem;
      right: 2.5rem;
      z-index: 1;
    }

    .floating-button-listner-open > button.material-symbols-outlined {
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: none;
      background: none;
      transition: 250ms;
      transform: scale(1.5) rotate(0deg);
    }

    .floating-button-listner-open > button.material-symbols-outlined::after {
      content: 'edit';
      position: relative;
      display: block;
      z-index: 1;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      padding: 0;
      padding-left: 0.1rem;
      padding-top: 0.1rem;
      background: white;
      border: none;
      margin-top: 0.25rem;
      margin-left: 0.25rem;
      font-size: 1.8rem;
      left: -4px;
      top: -4px;
    }

    .floating-button-listner-open > button.material-symbols-outlined::before {
      content: '';
      background: var(--channel-color, transparent);
      display: block;
      width: 2.5rem;
      height: 2.5rem;
      position: absolute;
      z-index: 0;
      border-radius: 50%;
      left: -4px;
      top: -4px;
    }

    .listener.open
      ~ .floating-button-listner-open
      > button.material-symbols-outlined {
      transform: scale(0) rotate(450deg);
    }

    .input-content {
      display: grid;
    }

    .input-content .controls {
      display: flex;
      flex-flow: row wrap;
      justify-content: end;
      padding: 0.4rem 0.2rem;
    }

    .input-content .controls button {
      font-weight: bold;
      border: none;
      background: none;
      font-size: 2rem;
    }

    .input-content .controls button:disabled {
      opacity: 0.5;
    }

    .input-content .controls button.send-button:hover {
      color: rgb(105, 105, 105);
    }

    .input-content .controls button.close-button:hover {
      color: rgb(255, 106, 106);
    }

    .input-content .controls button.send-button:active {
      color: rgb(56, 30, 78);
    }

    .input-content .controls button.close-button:active {
      color: rgb(143, 0, 0);
    }

    .input-content .controls button.send-button {
      color: black;
    }

    .input-content .controls button.close-button {
      color: red;
    }

    .not-signed-in .input-content textarea {
      display: none;
    }

    .not-signed-in .input-content .controls button.send-button {
      display: none;
    }
  }

  .map-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .ui-layer {
    display: grid;
  }

  .listener {
    display: grid;
    background: white;
    padding: 0.4rem;
    border-radius: 5px;
    z-index: 1;
    grid-auto-rows: min-content;
  }

  .input-content textarea {
    resize: none;
  }

  .listener h2 {
    margin: 0.2rem 0;
  }

  .listener p {
    margin: 0.2rem 0;
  }

  p.channel-ranges {
    display: grid;
  }

  p.sensi-range {
    display: grid;
    grid-template-columns: 2fr 1fr;
  }

  .contents {
    background: white;
    padding: 0.4rem;
    border-radius: 5px;
    z-index: 1;
    display: grid;
    grid-template-rows: 5rem;
  }

  .messages-scroll-wrapper {
    overflow: auto;
    height: 100%;
  }

  .ui-layer :global(.color-display) {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: solid 1px black;
  }

  .error {
    color: red;
  }

  .note {
    font-size: 0.8rem;
  }
</style>
