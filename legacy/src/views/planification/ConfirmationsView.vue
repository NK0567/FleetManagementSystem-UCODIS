<template>
  <div class="h-full flex flex-col px-7 py-6 max-[640px]:px-4 overflow-y-auto">
    <PlanificationTabs />
    <div class="mb-4 shrink-0">
      <div :class="L.pageTitle">Confirmations clients</div>
      <div :class="L.pageSub">{{ aConfirmer.length }} tournée(s) dont les destinataires sont à appeler avant chargement</div>
    </div>

    <div v-if="!aConfirmer.length" :class="L.card" class="text-center py-10 text-[13px] text-muted-foreground italic">Aucune tournée à confirmer.</div>

    <div v-for="v in aConfirmer" :key="v.id" :class="L.card" class="mb-4 max-w-3xl">
      <div class="flex items-center justify-between mb-3">
        <div>
          <span class="font-mono font-semibold text-sm text-foreground">{{ v.numeroOT || v.reference }}</span>
          <span class="text-[12px] text-muted-foreground"> · prévue le {{ fmtDateHeure(v.datePlanifiee) }} · {{ v.vehiculePlaque }}</span>
        </div>
        <span class="text-[11px] text-muted-foreground">{{ concernees(v).filter(l => l.confirmeLe).length }}/{{ concernees(v).length }} confirmés</span>
      </div>

      <div class="flex flex-col gap-2">
        <div v-for="l in lignesClient(v)" :key="l.id" class="rounded-md px-3 py-2.5"
             :class="l.confirmeLe ? 'bg-success-bg' : l.indisponibleLe ? 'bg-warning-bg' : 'bg-background'">
          <div class="flex items-center gap-2.5">
            <component :is="l.confirmeLe ? CheckCircle2 : l.indisponibleLe ? AlertTriangle : Circle" class="w-4 h-4 shrink-0"
                       :class="l.confirmeLe ? 'text-success' : l.indisponibleLe ? 'text-warning' : 'text-muted-foreground'" />
            <div class="flex-1 min-w-0">
              <span class="text-[13px] text-foreground">{{ l.destinataire }}</span>
              <span class="text-[11px] text-muted-foreground"> · {{ l.adresseLivraison }}</span>
            </div>
            <span v-if="l.confirmeLe" class="text-[11px] text-success shrink-0">Confirmé</span>
            <span v-else-if="l.indisponibleLe" class="text-[11px] text-warning shrink-0">Indisponible</span>
            <!-- Un seul formulaire ouvert par ligne : ouvrir « Indisponible » masque « Confirmer » -->
            <template v-else-if="ouverte !== l.id">
              <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="ouverte = l.id">Indisponible</button>
              <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="confirmer(v.id, l.id)">Confirmer</button>
            </template>
          </div>

          <p v-if="l.indisponibleLe" class="text-[11px] text-warning mt-1 pl-[26px]">
            {{ l.motifIndisponibilite }}<template v-if="l.dateDisponibleClient"> · disponible à partir du {{ fmtJour(l.dateDisponibleClient) }}</template>
          </p>

          <div v-if="ouverte === l.id" class="flex flex-col gap-2 mt-2 pl-[26px]">
            <input v-model="motif" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Pourquoi n'est-il pas disponible ?…" />
            <div class="flex items-center gap-2">
              <label class="text-[11px] text-muted-foreground shrink-0">Disponible à partir du</label>
              <input v-model="date" type="date" :class="cls.fieldInput" class="!h-[32px] !text-[12px] max-w-[170px]" />
              <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0 ml-auto" @click="fermer">Renoncer</button>
              <button :class="cls.btnPrimary" class="!bg-warning hover:!bg-warning/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motif.trim()" @click="declarerIndisponible(v.id, l.id)">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Espace des agents chargés d'appeler les clients : avant tout chargement,
 * chaque destinataire est appelé pour confirmer sa disponibilité à la date
 * prévue. L'indisponibilité de l'un n'affecte jamais les autres ; la tournée
 * passe elle-même à Confirmé dès que tous les destinataires encore
 * concernés ont confirmé.
 */
import { computed, ref } from 'vue'
import { AlertTriangle, CheckCircle2, Circle } from '@lucide/vue'
import { useVoyagesStore } from '../../stores/voyages'
import PlanificationTabs from '../../components/flotte/PlanificationTabs.vue'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'
import type { Voyage } from '../../types'

const store = useVoyagesStore()
const aConfirmer = computed(() => store.planifies.filter(v => v.confirmationRequise !== false))
const lignesClient = (v: Voyage) => [...v.etapes].filter(e => e.destinataire).sort((a, b) => a.ordre - b.ordre)
const concernees = (v: Voyage) => lignesClient(v).filter(l => !l.indisponibleLe)
function fmtJour(iso?: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }

const ouverte = ref<string | null>(null)
const motif = ref('')
const date = ref('')
function fermer() { ouverte.value = null; motif.value = ''; date.value = '' }
function confirmer(voyageId: string, etapeId: string) {
  const res = store.confirmerClient(voyageId, etapeId)
  if (!res.ok) alert(res.motif)
}
function declarerIndisponible(voyageId: string, etapeId: string) {
  const res = store.declarerIndisponible(voyageId, etapeId, motif.value, date.value || undefined)
  if (!res.ok) { alert(res.motif); return }
  fermer()
}
</script>
