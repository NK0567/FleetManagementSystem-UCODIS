<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type * as Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapMarker {
  id: string
  latitude: number
  longitude: number
  label: string
  sublabel?: string
  color?: string
}

export interface MapCircle {
  id: string
  latitude: number
  longitude: number
  radiusM: number
  color?: string
  label?: string
}

export interface MapPolyline {
  id: string
  points: [number, number][]
  color?: string
  dashed?: boolean
}

const props = withDefaults(
  defineProps<{
    markers?: MapMarker[]
    circles?: MapCircle[]
    polylines?: MapPolyline[]
    /** Shown when there is nothing to frame. */
    center?: [number, number]
    zoom?: number
    height?: string
    /** Changing this value frames the content again; otherwise the user keeps the view. */
    fitKey?: string | number
    selectedId?: string | null
  }>(),
  {
    markers: () => [],
    circles: () => [],
    polylines: () => [],
    center: () => [-18.8792, 47.5079],
    zoom: 7,
    height: '320px',
    fitKey: 0,
    selectedId: null
  }
)

const emit = defineEmits<{
  'map-click': [latitude: number, longitude: number]
  'marker-click': [id: string]
}>()

const container = ref<HTMLElement | null>(null)
const map = shallowRef<Leaflet.Map | null>(null)
let leaflet: typeof Leaflet | null = null
let layers: Leaflet.LayerGroup | null = null
let framed = false

const DEFAULT_COLOR = '#0b4480'

/** Labels come from user data: they are set as text, never parsed as HTML. */
function tooltipContent(label: string, sublabel?: string): HTMLElement {
  const root = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = label
  root.appendChild(title)
  if (sublabel) {
    const detail = document.createElement('div')
    detail.textContent = sublabel
    root.appendChild(detail)
  }
  return root
}

function draw() {
  if (!leaflet || !map.value || !layers) return
  const L = leaflet
  layers.clearLayers()
  const bounds: [number, number][] = []

  for (const circle of props.circles) {
    const layer = L.circle([circle.latitude, circle.longitude], {
      radius: circle.radiusM,
      color: circle.color ?? DEFAULT_COLOR,
      weight: 1,
      fillOpacity: 0.12
    })
    if (circle.label) layer.bindTooltip(tooltipContent(circle.label))
    layer.addTo(layers)
    bounds.push([circle.latitude, circle.longitude])
  }

  for (const line of props.polylines) {
    if (line.points.length < 2) continue
    L.polyline(line.points, {
      color: line.color ?? DEFAULT_COLOR,
      weight: 3,
      dashArray: line.dashed ? '6 6' : undefined
    }).addTo(layers)
    bounds.push(...line.points)
  }

  for (const marker of props.markers) {
    const selected = marker.id === props.selectedId
    const layer = L.circleMarker([marker.latitude, marker.longitude], {
      radius: selected ? 9 : 7,
      color: '#ffffff',
      weight: 2,
      fillColor: marker.color ?? DEFAULT_COLOR,
      fillOpacity: 1
    })
    layer.bindTooltip(tooltipContent(marker.label, marker.sublabel))
    layer.on('click', () => emit('marker-click', marker.id))
    layer.addTo(layers)
    bounds.push([marker.latitude, marker.longitude])
  }

  const [first] = bounds
  if (!framed && first) {
    framed = true
    if (bounds.length === 1) map.value.setView(first, 13)
    else map.value.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 14 })
  }
}

onMounted(async () => {
  leaflet = await import('leaflet')
  if (!container.value) return
  const L = leaflet
  map.value = L.map(container.value).setView(props.center, props.zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map.value)
  layers = L.layerGroup().addTo(map.value)
  map.value.on('click', (event: Leaflet.LeafletMouseEvent) =>
    emit('map-click', event.latlng.lat, event.latlng.lng)
  )
  draw()
})

watch(
  () => [props.markers, props.circles, props.polylines, props.selectedId],
  () => draw(),
  { deep: true }
)

watch(
  () => props.fitKey,
  () => {
    framed = false
    draw()
  }
)

onBeforeUnmount(() => {
  map.value?.remove()
  map.value = null
  layers = null
})
</script>

<template>
  <div ref="container" class="w-full rounded border border-border z-0" :style="{ height }" />
</template>
