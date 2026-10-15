<script setup lang="ts">
/** Plans de positions des pneus par type de véhicule : essieux, roues simples
 *  ou jumelées, roues de secours. */
import { ref, computed, watch } from 'vue'
import { CircleDot, Plus, Trash2 } from '@lucide/vue'
import { usePneusStore, positionsDuPlan, type ConfigPlanPneus } from '../../stores/pneus'
import { useTypesVehiculesStore } from '../../stores/typesVehicules'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = usePneusStore()
const types = useTypesVehiculesStore()
const typesActifs = computed(() => types.types.filter(t => t.actif))
const type = ref(typesActifs.value[0]?.code ?? '')
const brouillon = ref<ConfigPlanPneus>({ essieux: [], secours: 0 })
const erreur = ref('')
const succes = ref('')
function charger() {
  const c = store.plans[type.value]
  brouillon.value = c ? { essieux: c.essieux.map(e => ({ libelle: e.libelle, jumele: e.jumele })), secours: c.secours } : { essieux: [{ libelle: 'Essieu 1', jumele: false }], secours: 0 }
  erreur.value = ''; succes.value = ''
}
watch(type, charger, { immediate: true })
const apercu = computed(() => positionsDuPlan(brouillon.value))
function ajouterEssieu() { brouillon.value.essieux.push({ libelle: `Essieu ${brouillon.value.essieux.length + 1}`, jumele: false }) }
function retirerEssieu(i: number) { brouillon.value.essieux.splice(i, 1) }
function enregistrer() {
  const r = store.modifierPlan(type.value, { essieux: brouillon.value.essieux, secours: Number(brouillon.value.secours) })
  erreur.value = r.ok ? '' : r.motif ?? ''
  succes.value = r.ok ? 'Plan enregistré.' : ''
}
</script>

<template>
  <div :class="L.card">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div :class="L.cardTitle" class="!mb-0"><CircleDot class="w-4 h-4 text-primary" /> Plans de positions des pneus</div>
      <select v-model="type" :class="F.fieldSelect" class="!h-[30px] !text-[12px] !w-[200px]">
        <option v-for="t in typesActifs" :key="t.code" :value="t.code">{{ t.libelle }}</option>
      </select>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
      <div>
        <div class="grid grid-cols-[1fr_120px_32px] gap-2 items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em] pb-1.5 border-b border-border max-sm:hidden">
          <span>Essieu, de l'avant vers l'arrière</span><span>Roues</span><span></span>
        </div>
        <div v-for="(e, i) in brouillon.essieux" :key="i" class="grid grid-cols-[1fr_120px_32px] gap-2 items-center py-1.5 border-b border-border/60 max-sm:grid-cols-1">
          <input v-model="e.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px]" />
          <select v-model="e.jumele" :class="F.fieldSelect" class="!h-[30px] !text-[12px]">
            <option :value="false">Simples</option>
            <option :value="true">Jumelées</option>
          </select>
          <button type="button" class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Retirer l'essieu" @click="retirerEssieu(i)"><Trash2 class="w-3.5 h-3.5" /></button>
        </div>
        <div class="flex items-end gap-3 mt-3 flex-wrap">
          <button type="button" :class="F.btnOutline" class="!py-1.5 !text-[12px]" @click="ajouterEssieu"><Plus class="w-3.5 h-3.5" /> Ajouter un essieu</button>
          <div :class="F.field" class="!w-[160px]"><label :class="F.fieldLabel">Roues de secours</label><input v-model.number="brouillon.secours" type="number" min="0" max="4" :class="F.fieldInput" class="!h-[30px] !text-[12px]" /></div>
          <button type="button" :class="F.btnPrimary" class="!py-1.5 !text-[12px] ml-auto" @click="enregistrer">Enregistrer le plan</button>
        </div>
        <p v-if="erreur" class="text-[11px] text-danger mt-1.5">{{ erreur }}</p>
        <p v-else-if="succes" class="text-[11px] text-success mt-1.5">{{ succes }}</p>
      </div>
      <div class="relative mx-auto bg-background border border-border rounded-lg" style="width: 200px; height: 230px">
        <div class="absolute left-1/2 -translate-x-1/2 border-2 border-border rounded-md bg-card" style="top: 6%; bottom: 6%; width: 34%"></div>
        <span v-for="pos in apercu" :key="pos.code" :title="pos.libelle"
          class="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-9 rounded border-2 text-[10px] font-bold flex items-center justify-center"
          :class="pos.secours ? 'border-dashed border-muted-foreground text-muted-foreground bg-card' : 'border-primary text-primary bg-card'"
          :style="{ left: pos.x + '%', top: pos.y + '%' }">{{ pos.code }}</span>
      </div>
    </div>
  </div>
</template>
