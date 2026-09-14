<template>
  <div class="relative rounded-lg overflow-hidden border border-border" :style="{ height }">
    <div ref="mapEl" class="w-full h-full z-0"></div>

    <div v-if="showLegend && legend.length"
         class="absolute bottom-3 left-3 z-[500] bg-card/95 backdrop-blur border border-border rounded-md px-3 py-2 flex flex-col gap-1.5 shadow-sm">
      <div v-for="l in legend" :key="l.label" class="flex items-center gap-2 text-[11px] text-foreground">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: l.color }"></span>
        {{ l.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Carte réutilisable basée sur Leaflet + fond OpenStreetMap (libre, sans
 * clé d'API), reprise du composant FleetMap des projets de référence.
 * Aucun boîtier de géolocalisation n'est nommé dans les documents
 * UCODIS : les marqueurs affichés proviennent d'une position simulée,
 * jamais d'un flux GPS réel.
 */
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import 'leaflet/dist/leaflet.css'

export interface CarteMarqueur { id: string; lat: number; lng: number; couleur: string; libelle: string; sousTitre?: string; enMouvement?: boolean; numero?: number; popupHtml?: string }

const props = withDefaults(defineProps<{
  marqueurs?: CarteMarqueur[]
  tracePrevu?: { lat: number; lng: number }[]
  centre?: { lat: number; lng: number }
  zoom?: number
  height?: string
  ajusterVue?: boolean
  showLegend?: boolean
  legend?: { label: string; color: string }[]
  selectedId?: string | null
}>(), {
  marqueurs: () => [],
  tracePrevu: () => [],
  centre: () => ({ lat: -18.8792, lng: 47.5079 }), // Antananarivo
  zoom: 7,
  height: '460px',
  ajusterVue: true,
  showLegend: true,
  legend: () => [],
  selectedId: null,
})

const emit = defineEmits<{ select: [id: string] }>()

const mapEl = ref<HTMLDivElement | null>(null)
let L: typeof import('leaflet') | null = null
let map: import('leaflet').Map | null = null
const markerRefs: Record<string, import('leaflet').Marker> = {}
let ligneTrace: import('leaflet').Polyline | null = null

function pinIcon(color: string, enMouvement = false, numero?: number) {
  const pulse = enMouvement
    ? `<div style="position:absolute;top:-4px;left:-4px;width:30px;height:30px;border-radius:50%;background:${color};opacity:0.2;animation:ping-flotte 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>`
    : ''
  const contenu = numero != null
    ? `<span style="color:white;font-size:11px;font-weight:700;line-height:1">${numero}</span>`
    : `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
         <rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
       </svg>`
  return L!.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:22px;height:22px">
        ${pulse}
        <div style="position:absolute;inset:0;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center">
          ${contenu}
        </div>
      </div>
      <style>@keyframes ping-flotte{75%,100%{transform:scale(1.8);opacity:0}}</style>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  })
}

function dessinerTrace() {
  if (!map || !L) return
  if (ligneTrace) { ligneTrace.remove(); ligneTrace = null }
  if (props.tracePrevu.length > 1) {
    ligneTrace = L.polyline(props.tracePrevu.map(p => [p.lat, p.lng]), {
      color: '#1D4ED8', weight: 3, dashArray: '6 6', opacity: 0.85,
    }).addTo(map)
  }
}

function dessinerMarqueurs() {
  if (!map || !L) return
  const idsVus = new Set<string>()
  props.marqueurs.forEach(m => {
    idsVus.add(m.id)
    if (markerRefs[m.id]) {
      markerRefs[m.id]!.setLatLng([m.lat, m.lng])
      markerRefs[m.id]!.setIcon(pinIcon(m.couleur, m.enMouvement, m.numero))
      if (m.popupHtml) markerRefs[m.id]!.setPopupContent(m.popupHtml)
    } else {
      const marker = L!.marker([m.lat, m.lng], { icon: pinIcon(m.couleur, m.enMouvement, m.numero) }).addTo(map!)
      marker.bindTooltip(`<strong>${m.libelle}</strong>${m.sousTitre ? '<br/>' + m.sousTitre : ''}`)
      if (m.popupHtml) marker.bindPopup(m.popupHtml)
      marker.on('click', () => emit('select', m.id))
      markerRefs[m.id] = marker
    }
  })
  Object.keys(markerRefs).forEach(id => {
    if (!idsVus.has(id)) { markerRefs[id]!.remove(); delete markerRefs[id] }
  })
  dessinerTrace()
  if (props.ajusterVue && (props.marqueurs.length || props.tracePrevu.length > 1)) {
    const pts = [...props.marqueurs.map(m => [m.lat, m.lng] as [number, number]), ...props.tracePrevu.map(p => [p.lat, p.lng] as [number, number])]
    if (pts.length) {
      const bounds = L.latLngBounds(pts)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 })
    }
  }
}

onMounted(async () => {
  L = await import('leaflet')
  await nextTick()
  if (!mapEl.value) return
  map = L.map(mapEl.value, { zoomControl: true }).setView([props.centre.lat, props.centre.lng], props.zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map)
  dessinerMarqueurs()
})
onBeforeUnmount(() => { map?.remove(); map = null })

watch(() => props.marqueurs, () => dessinerMarqueurs(), { deep: true })
watch(() => props.tracePrevu, () => dessinerMarqueurs(), { deep: true })
</script>
