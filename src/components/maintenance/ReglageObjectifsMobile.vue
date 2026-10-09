<script setup lang="ts">
/** Objectifs de l'équipe mobile, réglables par l'entreprise (FMS-MA-08). */
import { ref } from 'vue'
import { Target } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useMaintenanceStore()
const erreur = ref('')
function majObjectif(cle: keyof typeof store.objectifsMobile, champ: HTMLInputElement, min: number, max: number) {
  const n = Number(champ.value)
  if (!champ.value.trim() || Number.isNaN(n) || n < min || n > max) { champ.value = String(store.objectifsMobile[cle]); erreur.value = `Valeur non valide : entre ${min} et ${max}.`; return }
  erreur.value = ''
  store.objectifsMobile[cle] = Math.round(n)
}
</script>

<template>
  <div :class="L.card">
    <div :class="L.cardTitle"><Target class="w-4 h-4 text-primary" /> Objectifs de l'équipe mobile</div>
    <div class="grid grid-cols-3 gap-3 max-md:grid-cols-1">
      <div :class="F.field"><label :class="F.fieldLabel">Tests de contrôle par mois</label><input :value="store.objectifsMobile.testsParMois" type="number" min="0" :class="F.fieldInput" @change="majObjectif('testsParMois', $event.target as HTMLInputElement, 0, 10000)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Taux de résolution visé (%)</label><input :value="store.objectifsMobile.tauxResolutionPct" type="number" min="0" max="100" :class="F.fieldInput" @change="majObjectif('tauxResolutionPct', $event.target as HTMLInputElement, 0, 100)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Délai d'arrivée maximal (minutes)</label><input :value="store.objectifsMobile.delaiMaxMinutes" type="number" min="1" :class="F.fieldInput" @change="majObjectif('delaiMaxMinutes', $event.target as HTMLInputElement, 1, 1440)" /></div>
    </div>
    <p v-if="erreur" class="text-[11px] text-danger mt-1.5">{{ erreur }}</p>
  </div>
</template>
