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
  let enableLocation = true;
  let positionWatcher: number | null = null;
  let currentContent: string = "";

  let messages: ReceivedMessage[] = [];

  onMount(() => {
    positionWatcher = navigator.geolocation.watchPosition(
      (position) => {
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

    messenger.startListening();
    messenger.register();

    (async function () {
      for await (const message of messenger) {
        console.log(message);
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

<div class="listener">
  <div class="channels">
    <h2>チャンネル</h2>
    <p>
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
  </div>
  <div class="sensitivity">
    <h2>感度</h2>
    <p>
      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        bind:value={messenger.sensitivity}
      />
    </p>
    <p>{messenger.sensitivity}</p>
  </div>
  <div class="location">
    <h2>現在位置</h2>
    {#if !enableLocation}
      <p class="error">
        現在位置が取得できていません。現在位置が取得できるまで、投稿はできません。
      </p>
    {/if}
    <p>
      {Math.abs(loc.latitude)}{loc.latitude >= 0 ? "N" : "S"}, {Math.abs(
        loc.longitude
      )}{loc.longitude >= 0 ? "E" : "W"}
    </p>
    <p class="note">
      地図の赤い丸の範囲内のメッセージは80%以上の確率で受信できます。
    </p>
  </div>
  <div class="input-content">
    <textarea cols="80" rows="10" bind:value={currentContent} />
    <div class="controls">
      <button
        type="button"
        on:click={() => {
          messenger.sendMessage(currentContent).then(() => {
            currentContent = "";
          });
        }}
        disabled={!enableLocation || currentContent.length === 0}
      >
        投稿する
      </button>
    </div>
  </div>

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

<div class="contents">
  <h2>メッセージ</h2>
  <div class="messages">
    {#each [...messages].reverse() as msg}
      <Message
        {loc}
        message={msg}
        locationEnabled={enableLocation}
        setChannel={(channel) => {
          channels[0] = channel.channel_a;
          channels[1] = channel.channel_b;
          channels[2] = channel.channel_c;

          messenger.channel = channel;
        }}
      />
    {/each}
  </div>
</div>

<style>
  .listener {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    position: sticky;
    top: 0;
    background: white;
  }

  .error {
    color: red;
  }

  .note {
    font-size: 0.8rem;
  }

  .input-content {
    grid-column: 1 / 3;
    grid-template-rows: 1fr 1.5fr;
  }
</style>
