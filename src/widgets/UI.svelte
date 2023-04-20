<script lang="ts">
  import { onMount } from "svelte";
  import { degrees, distance, fromGeoPoint, type LatLng } from "../utils/geolocation";
  import { Channel, Messenger, type ReceivedMessage } from "../utils/messenger";

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
        alert("位置情報の取得に失敗しました。");
        enableLocation = false;
      },
      {
        enableHighAccuracy: false,
        maximumAge: 0,
        timeout: 5000,
      }
    );
    messenger.startListening();
    messenger.register();

    (async function() {
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
    <p>
      {Math.abs(loc.latitude)}{loc.latitude >= 0 ? "N" : "S"}, {Math.abs(
        loc.longitude
      )}{loc.longitude >= 0 ? "E" : "W"}
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
</div>

<div class="contents">
  <h2>メッセージ</h2>
  <div class="messages">
    {#each [...messages].reverse() as msg}
      <div class="message">
        <p class="username">{msg.user.display_name}</p>
        <p class="content">
          {msg.content}
        </p>
        <p class="channel">
          <button type="button" on:click={() => {
            channels[0] = msg.channel_a;
            channels[1] = msg.channel_b;
            channels[2] = msg.channel_c;

            messenger.channel = new Channel(...channels);
          }}>
            {msg.channel_a}.{msg.channel_b}.{msg.channel_c}
          </button>
        </p>
        <p class="distance">
          {#if enableLocation}
            {Math.floor(distance(fromGeoPoint(msg.at), loc) / 10) / 100}km
          {:else}
            不明
          {/if}
        </p>
      </div>
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

  .input-content {
    grid-column: 1 / 4;
    grid-template-rows: 1fr 1.5fr;
  }
</style>