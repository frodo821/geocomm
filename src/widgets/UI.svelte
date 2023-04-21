<script lang="ts">
  import { onMount } from "svelte";
  import {
    degrees,
    distance,
    fromGeoPoint,
    type LatLng,
  } from "../utils/geolocation";
  import { Channel, Messenger, type ReceivedMessage } from "../utils/messenger";
  import MapIndicator from "./MapIndicator.svelte";
  import Message from "./Message.svelte";
  import { auth } from "../utils/firebase-client";

  function rand() {
    return Math.floor(Math.random() * 256);
  }

  const channels: [number, number, number] = [rand(), rand(), rand()];

  let loc: LatLng = {
    latitude: degrees(0),
    longitude: degrees(0),
  };

  const messenger = new Messenger(new Channel(...channels));
  let enableLocation = false;
  let positionWatcher: number | null = null;
  let currentContent: string = "";

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
        timeout: 5000,
      }
    );

    if (messenger.isSignedIn) {
      messenger.startListening();
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
          at: fromGeoPoint(msg.at),
          id: msg.id,
        }))}
    />
  {/if}
</div>

<div class="ui-layer">
  <div class="listener">
    <div class="channels">
      <h2>Channel</h2>
      {#key `channel-${channels[0]}-${channels[1]}-${channels[2]}`}
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
        <p>{messenger.channel.toString()}</p>
      {/key}
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
          {Math.abs(loc.latitude)}{loc.latitude >= 0 ? "N" : "S"}, {Math.abs(
            loc.longitude
          )}{loc.longitude >= 0 ? "E" : "W"}
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
      {#if messenger.isSignedIn}
        {#if replyTo !== null}
          <p>Replying:</p>
        {/if}
        <textarea rows="8" bind:value={currentContent} />
        <div class="controls">
          <button
            type="button"
            on:click={() => {
              messenger.sendMessage(currentContent, replyTo).then(() => {
                currentContent = "";
                replyTo = null;
              });
            }}
            disabled={!enableLocation || currentContent.length === 0}
          >
            Post!
          </button>
        </div>
      {/if}
    </div>
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

  .error {
    color: red;
  }

  .note {
    font-size: 0.8rem;
  }
</style>
