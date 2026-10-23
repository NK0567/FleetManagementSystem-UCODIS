<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MapCircle, MapMarker } from '@/components/shared/MapView.vue'

const props = defineProps<{
  radiusM: number | null
  label: string
  disabled?: boolean
}>()
const latitude = defineModel<number | null>('latitude', { required: true })
const longitude = defineModel<number | null>('longitude', { required: true })

const { t } = useI18n()

const hasCenter = computed(() => latitude.value != null && longitude.value != null)

const markers = computed<MapMarker[]>(() =>
  hasCenter.value
    ? [
        {
          id: 'site',
          latitude: latitude.value ?? 0,
          longitude: longitude.value ?? 0,
          label: props.label || t('fleet.sites.map.center')
        }
      ]
    : []
)

const circles = computed<MapCircle[]>(() =>
  hasCenter.value && props.radiusM
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

function placeCenter(lat: number, lng: number) {
  if (props.disabled) return
  latitude.value = Math.round(lat * COORDINATE_DECIMALS) / COORDINATE_DECIMALS
  longitude.value = Math.round(lng * COORDINATE_DECIMALS) / COORDINATE_DECIMALS
}
</script>

<template>
  <div class="space-y-1">
    <MapView :markers="markers" :circles="circles" height="280px" @map-click="placeCenter" />
    <p class="text-xs text-muted-foreground">
      {{ disabled ? t('fleet.sites.map.readOnlyHint') : t('fleet.sites.map.editHint') }}
    </p>
  </div>
</template>
