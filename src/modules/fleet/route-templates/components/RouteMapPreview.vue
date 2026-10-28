<script lang="ts" setup>
import { computed } from 'vue'
import type { MapMarker, MapPolyline } from '@/components/shared/MapView.vue'
import type { RouteStopPoint } from '../types/routeTemplate.types'

const props = defineProps<{ points: RouteStopPoint[] }>()

const markers = computed<MapMarker[]>(() =>
  props.points.map((point, index) => ({
    id: `${index}`,
    latitude: point.latitude,
    longitude: point.longitude,
    label: `${index + 1}. ${point.siteName}`
  }))
)

const lines = computed<MapPolyline[]>(() => [
  {
    id: 'route',
    points: props.points.map((point) => [point.latitude, point.longitude] as [number, number]),
    dashed: true
  }
])
</script>

<template>
  <MapView :markers="markers" :polylines="lines" height="300px" />
</template>
