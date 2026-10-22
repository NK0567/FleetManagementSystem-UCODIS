<script setup lang="ts">
/** Seuils d'alerte et de rotation des pneus, réglables par l'entreprise (FMS-MA-16, MA-17). */
import { ref } from 'vue'
import { CircleDot } from '@lucide/vue'
import { usePneusStore } from '../../stores/pneus'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const pneus = usePneusStore()
const erreurSeuil = ref('')
function majSeuil(cle: keyof typeof pneus.seuils, champ: HTMLInputElement, min: number) {
  const n = Number(champ.value)
  if (!champ.value.trim() || Number.isNaN(n) || n < min) { champ.value = String(pneus.seuils[cle]); erreurSeuil.value = `Valeur non valide : minimum ${min}.`; return }
  erreurSeuil.value = ''
  pneus.seuils[cle] = n
}
</script>

<template>
  <div :class="L.card">
    <div :class="L.cardTitle"><CircleDot class="w-4 h-4 text-primary" /> Seuils des pneumatiques</div>
    <div class="grid grid-cols-4 gap-3 max-md:grid-cols-2">
      <div :class="F.field"><label :class="F.fieldLabel">Pression minimale (bar)</label><input :value="pneus.seuils.pressionMinBar" type="number" min="0" step="0.1" :class="F.fieldInput" @change="majSeuil('pressionMinBar', $event.target as HTMLInputElement, 0)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Sculpture minimale (mm)</label><input :value="pneus.seuils.sculptureMinMm" type="number" min="0" step="0.5" :class="F.fieldInput" @change="majSeuil('sculptureMinMm', $event.target as HTMLInputElement, 0)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Rotation tous les (km)</label><input :value="pneus.seuils.rotationKm" type="number" min="1000" step="1000" :class="F.fieldInput" @change="majSeuil('rotationKm', $event.target as HTMLInputElement, 1000)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">ou tous les (mois)</label><input :value="pneus.seuils.rotationMois" type="number" min="1" :class="F.fieldInput" @change="majSeuil('rotationMois', $event.target as HTMLInputElement, 1)" /></div>
    </div>
    <p v-if="erreurSeuil" class="text-[11px] text-danger mt-1.5">{{ erreurSeuil }}</p>
  </div>
</template>
