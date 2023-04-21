<script lang="ts">
  import type * as leaflet from "leaflet";
  import { onMount } from "svelte";
  import { Channel, invAttenuation, km_per_meters } from "../utils/messenger";
  import type { LatLng } from "../utils/geolocation";

  let indicatorElement: HTMLDivElement;
  let mapping: leaflet.Map;
  let eightyPercent: leaflet.Circle;
  let selfPin: leaflet.Marker;
  let pins: Record<string, leaflet.Marker> = {};
  let leaflet: typeof import("leaflet");

  export let location: LatLng;
  export let sensitivity: number;
  export let messages: { at: LatLng, id: string, channel: Channel }[] = [];

  onMount(async () => {
    leaflet = (await import("leaflet")).default;
    mapping = leaflet.map(indicatorElement, {
      preferCanvas: true,
      maxZoom: 18,
    }).setView([location.latitude, location.longitude], 15);

    leaflet.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    }).addTo(mapping);

    eightyPercent = leaflet.circle([location.latitude, location.longitude], {
      color: 'red',
      fillColor: '#ff0033',
      fillOpacity: 0.3,
      radius: invAttenuation(0.8) * km_per_meters * sensitivity,
    }).addTo(mapping);

    selfPin = leaflet.marker([location.latitude, location.longitude], {
      icon: leaflet.divIcon({
        className: 'map-pins',
        html: '<i class="material-symbols-outlined">person_pin_circle</i>',
      }),
    }).addTo(mapping);
  });

  $: {
    if (mapping) {
      mapping.panTo([location.latitude, location.longitude]);
      eightyPercent.setLatLng([location.latitude, location.longitude]);
      selfPin.setLatLng([location.latitude, location.longitude]);
    }
  }

  $: {
    if (mapping) {
      eightyPercent.setRadius(invAttenuation(0.8) * km_per_meters * sensitivity);
    }
  }

  $: {
    if (mapping) {
      Object.keys(pins).forEach((id) => {
        mapping.removeLayer(pins[id]);
        delete pins[id];
      });

      messages.forEach(({ at, id, channel: c }) => {
        pins[id] = leaflet.marker([at.latitude, at.longitude], {
          icon: leaflet.divIcon({
            className: 'map-pins',
            html: `<i class="material-symbols-outlined" style="color:${c.color}">sms</i>`,
          }),
        }).addTo(mapping);
      });
    }
  }
</script>

<div class="indicator" bind:this={indicatorElement} />

<style>
  .indicator {
    height: 100%;
  }

  .indicator :global(.map-pins > i.material-symbols-outlined) {
    transform: translate(-25%, -75%);
    font-size: 2rem;
  }
</style>
