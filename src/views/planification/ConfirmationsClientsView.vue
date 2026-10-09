<template>
  <div class="h-full overflow-y-auto">
    <div class="w-full max-w-4xl mx-auto px-6 py-6 max-[640px]:px-4">
      <div :class="L.pageTitle">Confirmations clients</div>
      <div :class="L.pageSub">J'appelle les destinataires qui n'ont pas encore répondu depuis leur lien de suivi, et j'enregistre leur réponse.</div>

      <!-- Compteurs -->
      <div class="grid grid-cols-3 gap-3 mt-5 max-[640px]:grid-cols-1">
        <div :class="L.card" class="!py-3">
          <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em]">À appeler</p>
          <p class="text-2xl font-bold text-foreground">{{ aAppeler.length }}</p>
        </div>
        <div :class="L.card" class="!py-3">
          <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em]">Confirmés</p>
          <p class="text-2xl font-bold text-success">{{ dejaRepondu.filter(l => l.etape.confirmeLe).length }}</p>
        </div>
        <div :class="L.card" class="!py-3">
          <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em]">Indisponibles</p>
          <p class="text-2xl font-bold text-warning">{{ dejaRepondu.filter(l => l.etape.indisponibleLe).length }}</p>
        </div>
      </div>

      <!-- À appeler -->
      <h2 class="text-sm font-semibold text-foreground mt-6 mb-2">À appeler</h2>
      <div v-if="!aAppeler.length" :class="L.card" class="text-center py-6 text-[13px] text-muted-foreground italic">
        Personne à appeler pour l'instant.
      </div>
      <div v-for="l in aAppeler" :key="l.etape.id" :class="L.card" class="mb-2.5">
        <div class="flex items-start gap-2.5 flex-wrap">
          <Phone class="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div class="flex-1 min-w-[200px]">
            <p class="text-[13px] font-medium text-foreground break-words">{{ l.etape.destinataire }}</p>
            <p class="text-[11px] text-muted-foreground break-words">{{ l.etape.adresseLivraison }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-[11px] font-mono text-foreground">{{ l.voyage.numeroOT || l.voyage.reference }}</p>
            <p class="text-[11px] text-muted-foreground">livraison prévue le {{ fmtJour(l.voyage.datePlanifiee) }}</p>
          </div>
        </div>

        <div v-if="ouvert !== l.etape.id" class="flex items-center gap-3 mt-3 pl-[26px] flex-wrap">
          <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="confirmer(l)">Il confirme être disponible</button>
          <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="ouvrir(l.etape.id)">Il n'est pas disponible</button>
        </div>
        <div v-else class="flex flex-col gap-2 mt-3 pl-[26px]">
          <input v-model="motif" :class="cls.fieldInput" class="!h-[34px] !text-[12px] w-full" placeholder="Pourquoi n'est-il pas disponible ?…" />
          <div class="flex items-center gap-2 flex-wrap">
            <label class="text-[11px] text-muted-foreground">Il peut être livré à partir du</label>
            <input v-model="date" type="date" :class="cls.fieldInput" class="!h-[34px] !text-[12px] !w-[170px]" />
          </div>
          <div class="flex items-center gap-2 justify-end">
            <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="fermer">Renoncer</button>
            <button :class="cls.btnPrimary" class="!bg-warning hover:!bg-warning/90 !py-1 !px-2.5 !text-[11px]" :disabled="!motif.trim()" @click="declarerIndispo(l)">Enregistrer sa réponse</button>
          </div>
        </div>
      </div>

      <!-- Déjà répondu -->
      <h2 class="text-sm font-semibold text-foreground mt-6 mb-2">Déjà répondu</h2>
      <div v-if="!dejaRepondu.length" :class="L.card" class="text-center py-6 text-[13px] text-muted-foreground italic">
        Aucune réponse enregistrée pour l'instant.
      </div>
      <div v-else :class="L.card" class="!p-0 overflow-hidden">
        <div v-for="l in dejaRepondu" :key="l.etape.id" class="flex items-center gap-2.5 px-4 py-2.5 border-b border-border last:border-0 flex-wrap">
          <component :is="l.etape.confirmeLe ? CheckCircle2 : AlertTriangle" class="w-4 h-4 shrink-0" :class="l.etape.confirmeLe ? 'text-success' : 'text-warning'" />
          <div class="flex-1 min-w-[180px]">
            <p class="text-[12px] font-medium text-foreground break-words">{{ l.etape.destinataire }}</p>
            <p class="text-[11px] text-muted-foreground">
              {{ l.voyage.numeroOT || l.voyage.reference }} · {{ l.etape.reponseViaAgent ? 'réponse enregistrée par appel' : 'réponse du client depuis son lien' }}
            </p>
          </div>
          <span class="text-[11px] font-medium shrink-0" :class="l.etape.confirmeLe ? 'text-success' : 'text-warning'">
            {{ l.etape.confirmeLe ? 'Disponible' : `Indisponible${l.etape.dateDisponibleClient ? ', dispo. le ' + fmtJour(l.etape.dateDisponibleClient) : ''}` }}
          </span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" :class="STATUTS_VOYAGE[l.voyage.statut]?.cls">{{ STATUTS_VOYAGE[l.voyage.statut]?.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Espace des agents chargés d'appeler les clients qui n'ont pas encore
 * répondu depuis leur lien de suivi. La réponse enregistrée par l'agent
 * emprunte exactement les mêmes fonctions que celle du client : la page du
 * client affiche la même chose dans les deux cas. L'historique « Déjà
 * répondu » reste consultable après le passage de la tournée à Confirmé.
 */
import { computed, ref } from 'vue'
import { AlertTriangle, CheckCircle2, Phone } from '@lucide/vue'
import { useVoyagesStore } from '../../stores/voyages'
import { STATUTS_VOYAGE } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'
import type { EtapeVoyage, Voyage } from '../../types'

const store = useVoyagesStore()
function fmtJour(iso?: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }

/** À appeler : seules les tournées encore en Planifié posent la question. */
const aAppeler = computed(() => store.planifies
  .filter(v => v.confirmationRequise !== false)
  .flatMap(v => v.etapes.filter(e => e.destinataire && !e.confirmeLe && !e.indisponibleLe).map(etape => ({ voyage: v, etape }))))

/** Déjà répondu : historique conservé quel que soit le statut actuel de la
 *  tournée (sauf clôturée ou annulée), pour ne pas se vider au moment où
 *  tout le monde a répondu. */
const dejaRepondu = computed(() => store.voyages
  .filter(v => v.statut !== 'cloture' && v.statut !== 'annule')
  .flatMap(v => v.etapes.filter(e => e.destinataire && (e.confirmeLe || e.indisponibleLe)).map(etape => ({ voyage: v, etape })))
  .sort((a, b) => (b.etape.confirmeLe ?? b.etape.indisponibleLe ?? '').localeCompare(a.etape.confirmeLe ?? a.etape.indisponibleLe ?? '')))

function confirmer(l: { voyage: Voyage; etape: EtapeVoyage }) {
  const res = store.confirmerClient(l.voyage.id, l.etape.id, true)
  if (!res.ok) alert(res.motif)
}

const ouvert = ref<string | null>(null)
const motif = ref('')
const date = ref('')
function ouvrir(id: string) { ouvert.value = id; motif.value = ''; date.value = '' }
function fermer() { ouvert.value = null; motif.value = ''; date.value = '' }
function declarerIndispo(l: { voyage: Voyage; etape: EtapeVoyage }) {
  if (!motif.value.trim()) return
  const res = store.declarerIndisponible(l.voyage.id, l.etape.id, motif.value.trim(), date.value || undefined, true)
  if (!res.ok) { alert(res.motif); return }
  fermer()
}
</script>
