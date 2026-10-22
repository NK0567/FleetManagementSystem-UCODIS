<script setup lang="ts">
/** Zone de géorepérage d'un site : un clic sur la carte place le centre, le rayon se règle en mètres (FMS-DB-14). */
import { computed } from 'vue'
import FleetMap from './FleetMap.vue'
import * as F from '../../lib/formClasses'

const props = defineProps<{ lat: number | null; lng: number | null; rayonM: number | null; couleur?: string; editable?: boolean; libelle?: string }>()
const emit = defineEmits<{ 'update:lat': [number]; 'update:lng': [number]; 'update:rayonM': [number] }>()

const aZone = computed(() => props.lat != null && props.lng != null && Number.isFinite(props.lat) && Number.isFinite(props.lng))
const zones = computed(() => aZone.value ? [{ id: 'zone', lat: props.lat!, lng: props.lng!, rayonM: props.rayonM && props.rayonM > 0 ? props.rayonM : 500, couleur: props.couleur, libelle: props.libelle }] : [])
const marqueurs = computed(() => aZone.value ? [{ id: 'centre', lat: props.lat!, lng: props.lng!, couleur: props.couleur ?? '#0B4480', libelle: props.libelle ?? 'Centre de la zone' }] : [])
function placer(p: { lat: number; lng: number }) { if (props.editable) { emit('update:lat', p.lat); emit('update:lng', p.lng) } }
</script>

<template>
  <div class="flex flex-col gap-2">
    <FleetMap :marqueurs="marqueurs" :zones="zones" :show-legend="false" height="260px" :zoom="aZone ? 13 : 6" @clic-carte="placer" />
    <div v-if="editable" class="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
      <div :class="F.field"><label :class="F.fieldLabel">Latitude *</label><input :value="lat ?? ''" type="number" step="0.0001" :class="F.fieldInput" @input="e => emit('update:lat', Number((e.target as HTMLInputElement).value))" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Longitude *</label><input :value="lng ?? ''" type="number" step="0.0001" :class="F.fieldInput" @input="e => emit('update:lng', Number((e.target as HTMLInputElement).value))" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Rayon de la zone (m) *</label><input :value="rayonM ?? ''" type="number" min="50" step="50" :class="F.fieldInput" @input="e => emit('update:rayonM', Number((e.target as HTMLInputElement).value))" /></div>
    </div>
    <p v-if="editable" class="text-[11px] text-muted-foreground">Cliquez sur la carte pour placer le centre de la zone.</p>
  </div>
</template>
