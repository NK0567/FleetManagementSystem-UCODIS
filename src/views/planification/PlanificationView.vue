<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Planification</div>
        <div :class="L.pageSub">{{ store.voyages.length }} ordre(s) de transport</div>
      </div>
      <div class="flex items-center gap-2">
        <div :class="L.searchBox" class="!h-[34px]">
          <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input v-model="recherche" type="text" placeholder="Rechercher un ordre, un client, un véhicule…"
                 class="border-0 outline-none bg-transparent text-[13px] w-[260px]" />
        </div>
        <button :class="L.tbIconBtn" title="Filtrer"><Filter class="w-4 h-4" /></button>
        <button :class="L.tbIconBtn" title="À propos de ce tableau" @click="aPropos = !aPropos"><Info class="w-4 h-4" /></button>
        <button :class="L.btnPrimary" @click="ouvrirCreation"><Plus class="w-4 h-4" /> Nouvel ordre</button>
      </div>
    </div>

    <div v-if="aPropos" class="flex items-start gap-2.5 bg-info-bg text-info rounded-lg px-3.5 py-2.5 mb-4">
      <Info class="w-4 h-4 shrink-0 mt-px" />
      <p class="text-xs leading-relaxed">
        Un ordre créé apparaît en attente. « Planifier » le fait passer en planifié, où il attend la
        confirmation du chauffeur depuis son espace : accepté, il passe en cours ; refusé, il est annulé.
        En cours, chaque site validé rapproche l'ordre de sa clôture automatique, une fois tous les sites
        desservis.
      </p>
    </div>

    <div class="flex gap-3.5 overflow-x-auto pb-3">
      <div v-for="col in colonnes" :key="col.statut" class="shrink-0 w-[300px] rounded-lg" :class="col.bgCls">
        <div class="flex items-center justify-between px-3.5 py-3">
          <span class="text-[13px] font-bold text-foreground">{{ col.libelle }}</span>
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" :class="col.badgeCls">{{ col.items.length }}</span>
        </div>

        <div class="flex flex-col gap-2.5 px-2.5 pb-3 min-h-[60px]">
          <p v-if="!col.items.length" class="text-center text-[12px] text-muted-foreground italic py-4">Aucun ordre {{ col.libelleMinuscule }}</p>

          <div v-for="v in col.items" :key="v.id" :class="L.card" class="!p-3 cursor-pointer hover:shadow-md transition-shadow" @click="ouvrirFiche(v.id)">
            <div class="flex items-start justify-between gap-2 mb-2">
              <span class="font-mono font-semibold text-primary text-[13px]">{{ v.numeroOT || v.reference }}</span>
              <Truck class="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
            <div class="flex items-center gap-1.5 text-[12px] text-foreground mb-0.5">
              <UserRound class="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {{ v.chauffeurNom ?? 'Aucun chauffeur' }}
            </div>
            <div class="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-2.5">
              <Container class="w-3.5 h-3.5 shrink-0" /> {{ v.vehiculePlaque ?? '-' }} <span v-if="v.clientNom"> · {{ v.clientNom }}</span>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2.5 border-t border-border">
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-[0.04em]">Sites à desservir</p>
                <p class="text-[13px] font-bold text-foreground flex items-center gap-1"><MapPin class="w-3 h-3 text-muted-foreground" /> {{ v.etapes.length }}</p>
              </div>
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-[0.04em]">Sites validés</p>
                <p class="text-[13px] font-bold flex items-center gap-1" :class="v.etapes.length && v.etapes.every(e => e.franchi) ? 'text-success' : 'text-foreground'">
                  <CheckCircle2 class="w-3 h-3" /> {{ v.etapes.filter(e => e.franchi).length }}
                </p>
              </div>
            </div>

            <p v-if="v.statut === 'annule' && v.motifRefus" class="text-[11px] text-danger mt-2 pt-2 border-t border-border leading-snug">Refusé : {{ v.motifRefus }}</p>

            <button v-if="v.statut === 'en_attente'" :class="cls.btnPrimary" class="w-full justify-center !py-1.5 !text-[12px] mt-2.5" :disabled="!v.etapes.length" @click.stop="planifierRapide(v.id)">
              <CalendarClock class="w-3.5 h-3.5" /> Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <OrdreTransportFormModal v-if="creationOuverte" @close="creationOuverte = false" @created="onCreated" />
  <OrdreTransportCard v-if="ficheId" :voyage-id="ficheId" @close="ficheId = null" />
</template>

<script setup lang="ts">
/**
 * Planification - tableau kanban des ordres de transport, adapté au
 * module de planification des livraisons étudié comme référence pour
 * le futur TMS. Cinq statuts : en attente, planifié, en cours, terminé,
 * annulé. Le contenu des cartes reprend la logique d'UCODIS - des
 * sites à desservir sur un trajet - plutôt que la notion de lignes de
 * commande et de colis de la référence, propre à un entrepôt de
 * dispatching, sans objet ici.
 */
import { ref, computed } from 'vue'
import { Search, Filter, Info, Plus, Truck, UserRound, Container, MapPin, CheckCircle2, CalendarClock } from '@lucide/vue'
import OrdreTransportFormModal from '../../components/flotte/OrdreTransportFormModal.vue'
import OrdreTransportCard from '../../components/flotte/OrdreTransportCard.vue'
import { useVoyagesStore } from '../../stores/voyages'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useVoyagesStore()
const recherche = ref('')
const aPropos = ref(false)
const creationOuverte = ref(false)
const ficheId = ref<string | null>(null)

function correspond(v: { reference: string; numeroOT?: string; clientNom: string; vehiculePlaque?: string; chauffeurNom?: string }) {
  if (!recherche.value.trim()) return true
  const q = recherche.value.toLowerCase()
  return `${v.reference} ${v.numeroOT ?? ''} ${v.clientNom} ${v.vehiculePlaque ?? ''} ${v.chauffeurNom ?? ''}`.toLowerCase().includes(q)
}

const colonnes = computed(() => [
  { statut: 'en_attente', libelle: 'En attente', libelleMinuscule: 'en attente', badgeCls: 'bg-warning', bgCls: 'bg-warning-bg/40', items: store.enAttente.filter(correspond) },
  { statut: 'planifie', libelle: 'Planifié', libelleMinuscule: 'planifié', badgeCls: 'bg-info', bgCls: 'bg-info-bg/40', items: store.planifies.filter(correspond) },
  { statut: 'en_cours', libelle: 'En cours', libelleMinuscule: 'en cours', badgeCls: 'bg-primary', bgCls: 'bg-primary/[0.06]', items: store.enCoursKanban.filter(correspond) },
  { statut: 'livre', libelle: 'Terminé', libelleMinuscule: 'terminé', badgeCls: 'bg-success', bgCls: 'bg-success-bg/40', items: store.termines.filter(correspond) },
  { statut: 'annule', libelle: 'Annulé', libelleMinuscule: 'annulé', badgeCls: 'bg-danger', bgCls: 'bg-danger-bg/40', items: store.annules.filter(correspond) },
])

function ouvrirCreation() { creationOuverte.value = true }
function ouvrirFiche(id: string) { ficheId.value = id }
function onCreated(id: string) { creationOuverte.value = false; ficheId.value = id }
function planifierRapide(id: string) {
  const res = store.planifier(id)
  if (!res.ok) alert(res.motif)
}
</script>
