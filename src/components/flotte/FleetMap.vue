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
 * Carte réutilisable basée sur Leaflet et le fond OpenStreetMap (libre, sans
 * clé d'API). Elle affiche des marqueurs, un tracé prévu (pointillé), un
 * tracé parcouru (trait plein) et des zones de géorepérage.
 */
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import 'leaflet/dist/leaflet.css'
import { useSitesStore } from '../../stores/sites'

export interface CarteMarqueur { id: string; lat: number; lng: number; couleur: string; libelle: string; sousTitre?: string; enMouvement?: boolean; numero?: number; popupHtml?: string }

const props = withDefaults(defineProps<{
  marqueurs?: CarteMarqueur[]
  tracePrevu?: { lat: number; lng: number }[]
  traceReelle?: { lat: number; lng: number }[]
  zones?: { id: string; lat: number; lng: number; rayonM: number; couleur?: string; libelle?: string }[]
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
  traceReelle: () => [],
  zones: () => [],
  centre: undefined,
  zoom: 7,
  height: '460px',
  ajusterVue: true,
  showLegend: true,
  legend: () => [],
  selectedId: null,
})

const emit = defineEmits<{ select: [id: string]; 'clic-carte': [p: { lat: number; lng: number }] }>()

const mapEl = ref<HTMLDivElement | null>(null)
let L: typeof import('leaflet') | null = null
let map: import('leaflet').Map | null = null
const markerRefs: Record<string, import('leaflet').Marker> = {}
let ligneTrace: import('leaflet').Polyline | null = null
let ligneReelle: import('leaflet').Polyline | null = null
let cercles: import('leaflet').Circle[] = []
const sites = useSitesStore()
/** Centre par défaut : le premier site actif du référentiel, à défaut l'origine. */
function centreParDefaut() {
  const s = sites.actifs[0]
  return props.centre ?? (s ? { lat: s.lat, lng: s.lng } : { lat: 0, lng: 0 })
}

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

function dessinerZones() {
  if (!map || !L) return
  cercles.forEach(c => c.remove()); cercles = []
  props.zones.forEach(z => {
    const c = L!.circle([z.lat, z.lng], { radius: z.rayonM, color: z.couleur ?? '#0B4480', weight: 1, fillOpacity: 0.08 }).addTo(map!)
    if (z.libelle) c.bindTooltip(z.libelle)
    cercles.push(c)
  })
}

function dessinerTrace() {
  if (!map || !L) return
  if (ligneTrace) { ligneTrace.remove(); ligneTrace = null }
  if (ligneReelle) { ligneReelle.remove(); ligneReelle = null }
  if (props.traceReelle.length > 1) {
    ligneReelle = L.polyline(props.traceReelle.map(p => [p.lat, p.lng]), { color: '#16a34a', weight: 4, opacity: 0.9 }).addTo(map)
  }
  if (props.tracePrevu.length > 1) {
    ligneTrace = L.polyline(props.tracePrevu.map(p => [p.lat, p.lng]), {
      color: '#1D4ED8', weight: 3, dashArray: '6 6', opacity: 0.85,
    }).addTo(map)
  }
}

const bulle = (m: CarteMarqueur) => `<strong>${m.libelle}</strong>${m.sousTitre ? '<br/>' + m.sousTitre : ''}`

function dessinerMarqueurs() {
  if (!map || !L) return
  const idsVus = new Set<string>()
  props.marqueurs.forEach(m => {
    idsVus.add(m.id)
    if (markerRefs[m.id]) {
      markerRefs[m.id]!.setLatLng([m.lat, m.lng])
      markerRefs[m.id]!.setIcon(pinIcon(m.couleur, m.enMouvement, m.numero))
      markerRefs[m.id]!.setTooltipContent(bulle(m))
      if (m.popupHtml) markerRefs[m.id]!.setPopupContent(m.popupHtml)
    } else {
      const marker = L!.marker([m.lat, m.lng], { icon: pinIcon(m.couleur, m.enMouvement, m.numero) }).addTo(map!)
      marker.bindTooltip(bulle(m))
      if (m.popupHtml) marker.bindPopup(m.popupHtml)
      marker.on('click', () => emit('select', m.id))
      markerRefs[m.id] = marker
    }
  })
  Object.keys(markerRefs).forEach(id => {
    if (!idsVus.has(id)) { markerRefs[id]!.remove(); delete markerRefs[id] }
  })
  dessinerTrace()
  if (props.ajusterVue && (props.marqueurs.length || props.tracePrevu.length > 1 || props.traceReelle.length > 1)) {
    const pts = [...props.marqueurs.map(m => [m.lat, m.lng] as [number, number]), ...props.tracePrevu.map(p => [p.lat, p.lng] as [number, number]), ...props.traceReelle.map(p => [p.lat, p.lng] as [number, number])]
    if (pts.length) {
      const bounds = L.latLngBounds(pts)
      /* Une zone isolée (fiche d'un site) se montre en entier, au plus près. */
      const zoneSeule = props.zones.length === 1 && props.marqueurs.length <= 1 && props.tracePrevu.length < 2 && props.traceReelle.length < 2
      if (zoneSeule && cercles[0]) bounds.extend(cercles[0].getBounds())
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: zoneSeule ? 15 : 9, animate: false })
    }
  }
}

onMounted(async () => {
  L = await import('leaflet')
  await nextTick()
  if (!mapEl.value) return
  const c = centreParDefaut()
  map = L.map(mapEl.value, { zoomControl: true }).setView([c.lat, c.lng], props.zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map)
  map.on('click', e => emit('clic-carte', { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }))
  dessinerZones()
  dessinerMarqueurs()
})
onBeforeUnmount(() => { map?.stop(); map?.off(); map?.remove(); map = null })

watch(() => props.marqueurs, () => dessinerMarqueurs(), { deep: true })
watch(() => props.tracePrevu, () => dessinerMarqueurs(), { deep: true })
watch(() => props.traceReelle, () => dessinerMarqueurs(), { deep: true })
watch(() => props.zones, () => { dessinerZones(); dessinerMarqueurs() }, { deep: true })
</script>
