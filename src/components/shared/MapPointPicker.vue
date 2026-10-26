<script lang="ts" setup>
import { computed } from 'vue'
import type { MapCircle, MapMarker } from './MapView.vue'

const props = defineProps<{
  label: string
  hint: string
  /** Draws a circle of this radius around the point. */
  radiusM?: number | null
  disabled?: boolean
}>()
const latitude = defineModel<number | null>('latitude', { required: true })
const longitude = defineModel<number | null>('longitude', { required: true })

const hasPoint = computed(() => latitude.value != null && longitude.value != null)

const markers = computed<MapMarker[]>(() =>
  hasPoint.value
    ? [
        {
          id: 'point',
          latitude: latitude.value ?? 0,
          longitude: longitude.value ?? 0,
          label: props.label
        }
      ]
    : []
)

const circles = computed<MapCircle[]>(() =>
  hasPoint.value && props.radiusM
    ? [
        {
          id: 'zone',
          latitude: latitude.value ?? 0,
          longitude: longitude.value ?? 0,
          radiusM: props.radiusM
        }
      ]
    : []
)

const COORDINATE_DECIMALS = 10_000

function placePoint(lat: number, lng: number) {
  if (props.disabled) return
  latitude.value = Math.round(lat * COORDINATE_DECIMALS) / COORDINATE_DECIMALS
  longitude.value = Math.round(lng * COORDINATE_DECIMALS) / COORDINATE_DECIMALS
}
</script>

<template>
  <div class="space-y-1">
    <MapView :markers="markers" :circles="circles" height="280px" @map-click="placePoint" />
    <p class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>
