<script setup lang="ts">
/** Objectifs et types de mission de l'équipe mobile, réglables par l'entreprise (FMS-MA-08). */
import { ref } from 'vue'
import { Target, Undo2 } from '@lucide/vue'
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

const nouveau = ref({ libelle: '', controle: false })
const erreurType = ref('')
function ajouter() {
  const r = store.ajouterTypeMission(nouveau.value.libelle, nouveau.value.controle)
  erreurType.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouveau.value = { libelle: '', controle: false }
}
function renommer(code: string, e: Event) {
  const champ = e.target as HTMLInputElement
  const r = store.renommerTypeMission(code, champ.value)
  erreurType.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) champ.value = store.typesMissionMobile.find(t => t.code === code)?.libelle ?? ''
}
</script>

<template>
  <div :class="L.card">
    <div :class="L.cardTitle"><Target class="w-4 h-4 text-primary" /> Objectifs de l'équipe mobile</div>
    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <div :class="F.field"><label :class="F.fieldLabel">Interventions par mois</label><input :value="store.objectifsMobile.interventionsParMois" type="number" min="0" :class="F.fieldInput" @change="majObjectif('interventionsParMois', $event.target as HTMLInputElement, 0, 10000)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Taux de résolution visé (%)</label><input :value="store.objectifsMobile.tauxResolutionPct" type="number" min="0" max="100" :class="F.fieldInput" @change="majObjectif('tauxResolutionPct', $event.target as HTMLInputElement, 0, 100)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Temps moyen d'intervention maximal (minutes)</label><input :value="store.objectifsMobile.tempsMoyenMaxMinutes" type="number" min="1" :class="F.fieldInput" @change="majObjectif('tempsMoyenMaxMinutes', $event.target as HTMLInputElement, 1, 2880)" /></div>
      <div :class="F.field"><label :class="F.fieldLabel">Contrôles par mois</label><input :value="store.objectifsMobile.controlesParMois" type="number" min="0" :class="F.fieldInput" @change="majObjectif('controlesParMois', $event.target as HTMLInputElement, 0, 100000)" /></div>
    </div>
    <p v-if="erreur" class="text-[11px] text-danger mt-1.5">{{ erreur }}</p>

    <p class="text-[11px] font-semibold text-muted-foreground uppercase mt-4 mb-1.5">Types de mission</p>
    <div v-for="t in store.typesMissionMobile" :key="t.code" class="flex items-center gap-2 py-1.5 border-b border-border/60 flex-wrap">
      <input :value="t.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[160px]" @change="renommer(t.code, $event)" />
      <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="t.controle" type="checkbox" class="accent-primary" /> Mission de contrôle</label>
      <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="t.actif" type="checkbox" class="accent-primary" /> Actif</label>
    </div>
    <div class="flex gap-2 mt-2 items-center flex-wrap">
      <input v-model="nouveau.libelle" :class="F.fieldInput" class="!h-[32px] flex-1 min-w-[160px]" placeholder="Nouveau type de mission" />
      <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="nouveau.controle" type="checkbox" class="accent-primary" /> Mission de contrôle</label>
      <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouter">Ajouter</button>
    </div>
    <p v-if="erreurType" class="text-[11px] text-danger mt-1.5">{{ erreurType }}</p>
    <div class="flex justify-end mt-3"><button :class="F.btnOutline" class="!text-[12px]" @click="store.reinitialiserTypesMission()"><Undo2 class="w-3.5 h-3.5" /> Revenir aux types proposés</button></div>
  </div>
</template>
