<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MapCircle, MapMarker } from '@/components/shared/MapView.vue'

/**
 * Traces the geofence of a site on the map: a first click places its centre, then, in the edge
 * mode, a click on the map sets the radius of the zone at that distance from the centre.
 */
const props = defineProps<{
  label: string
  /** Radius drawn when the site sets none: the one of its type or of the settings. */
  fallbackRadiusM: number | null
  disabled?: boolean
}>()
const latitude = defineModel<number | null>('latitude', { required: true })
const longitude = defineModel<number | null>('longitude', { required: true })
const radiusM = defineModel<number | null>('radiusM', { required: true })

const { t } = useI18n()
const mode = ref<'centre' | 'edge'>('centre')

const MIN_RADIUS_M = 50
const MAX_RADIUS_M = 20_000
const COORDINATE_DECIMALS = 10_000

const hasPoint = computed(() => latitude.value != null && longitude.value != null)
const shownRadius = computed(() => radiusM.value ?? props.fallbackRadiusM)

const markers = computed<MapMarker[]>(() =>
  hasPoint.value
    ? [
        {
          id: 'centre',
          latitude: latitude.value ?? 0,
          longitude: longitude.value ?? 0,
          label: props.label
        }
      ]
    : []
)

const circles = computed<MapCircle[]>(() =>
  hasPoint.value && shownRadius.value
    ? [
        {
          id: 'zone',
          latitude: latitude.value ?? 0,
          longitude: longitude.value ?? 0,
          radiusM: shownRadius.value
        }
      ]
    : []
)

/** Distance on the ground between two points, in metres (haversine). */
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a))
}

function onClick(lat: number, lng: number) {
  if (props.disabled) return
  if (mode.value === 'edge' && hasPoint.value) {
    const distance = distanceM(latitude.value ?? 0, longitude.value ?? 0, lat, lng)
    radiusM.value = Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Math.round(distance / 10) * 10))
    return
  }
  latitude.value = Math.round(lat * COORDINATE_DECIMALS) / COORDINATE_DECIMALS
  longitude.value = Math.round(lng * COORDINATE_DECIMALS) / COORDINATE_DECIMALS
}
</script>

<template>
  <div class="space-y-2" data-testid="site-zone-picker">
    <div v-if="!disabled" class="flex flex-wrap items-center gap-2 text-sm">
      <span class="text-muted-foreground">{{ t('fleet.sites.map.mode') }}</span>
      <button
        v-for="item in ['centre', 'edge'] as const"
        :key="item"
        type="button"
        class="cursor-pointer px-3 py-1 rounded border disabled:opacity-50"
        :class="
          mode === item
            ? 'border-primary text-primary bg-primary/5'
            : 'border-border hover:bg-accent'
        "
        :disabled="item === 'edge' && !hasPoint"
        :title="item === 'edge' && !hasPoint ? t('fleet.sites.map.centreFirst') : undefined"
        @click="mode = item"
      >
        {{ t(`fleet.sites.map.modes.${item}`) }}
      </button>
      <button
        v-if="radiusM !== null"
        type="button"
        class="cursor-pointer text-xs text-primary hover:underline"
        @click="radiusM = null"
      >
        {{ t('fleet.sites.map.useDefaultRadius') }}
      </button>
    </div>
    <MapView :markers="markers" :circles="circles" height="320px" @map-click="onClick" />
    <p class="text-xs text-muted-foreground">
      {{
        disabled
          ? t('fleet.sites.map.readOnlyHint')
          : mode === 'edge'
            ? t('fleet.sites.map.edgeHint')
            : t('fleet.sites.map.editHint')
      }}
    </p>
  </div>
</template>
