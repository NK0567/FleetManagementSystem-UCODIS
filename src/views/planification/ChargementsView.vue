<template>
  <div class="h-full flex flex-col px-7 py-6 max-[640px]:px-4 overflow-y-auto">
    <PlanificationTabs />
    <div class="mb-4 shrink-0">
      <div :class="L.pageTitle">Chargements et retours</div>
      <div :class="L.pageSub">{{ store.confirmes.length }} chargement(s) à préparer · {{ retours.length }} retour(s) à réceptionner</div>
    </div>

    <!-- Chargements à préparer -->
    <div class="text-sm font-semibold text-foreground mb-2">Chargements à préparer</div>
    <div v-if="!store.confirmes.length" :class="L.card" class="text-center py-8 text-[13px] text-muted-foreground italic mb-6">Aucune tournée confirmée à charger.</div>

    <div v-for="v in store.confirmes" :key="v.id" :class="L.card" class="mb-4 max-w-3xl">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <span class="font-mono font-semibold text-sm text-foreground">{{ v.numeroOT || v.reference }}</span>
          <span class="text-[12px] text-muted-foreground"> · prévue le {{ fmtDateHeure(v.datePlanifiee) }} · {{ v.vehiculePlaque }} · {{ v.chauffeurNom }}</span>
        </div>
        <div class="flex items-center gap-3">
          <button class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1" @click="simulation = simulation === v.id ? null : v.id">
            <ListOrdered class="w-3.5 h-3.5" /> Simuler le chargement
          </button>
          <RouterLink :to="`/chargement/${v.id}`" target="_blank" class="text-[11px] text-primary underline inline-flex items-center gap-1">
            <Printer class="w-3.5 h-3.5" /> Imprimer la liste
          </RouterLink>
        </div>
      </div>

      <!-- Simulation : ordre de chargement déduit de l'ordre de livraison -->
      <div v-if="simulation === v.id" class="rounded-md bg-info-bg px-3 py-2.5 mb-3">
        <p class="text-[11px] font-semibold text-info uppercase tracking-[0.04em] mb-1.5">Ordre de chargement proposé</p>
        <div v-for="(l, i) in ordreChargement(v)" :key="l.id" class="flex items-center gap-2 text-[12px] py-0.5">
          <span class="w-5 h-5 rounded-full bg-info text-white text-[10px] font-bold flex items-center justify-center shrink-0">{{ i + 1 }}</span>
          <span class="text-foreground flex-1">{{ l.destinataire ?? l.siteNom }}</span>
          <span class="text-muted-foreground">{{ zone(i, ordreChargement(v).length) }} · livré en {{ ordreChargement(v).length - i }}<sup>e</sup></span>
        </div>
      </div>

      <!-- Déclaration du chargement, destinataire par destinataire -->
      <template v-if="!v.chargementEntrepotLe">
        <div class="flex flex-col gap-2">
          <div v-for="l in ordreChargement(v)" :key="l.id" class="flex flex-col gap-1">
            <label class="text-[11px] font-semibold text-muted-foreground">{{ l.destinataire ?? l.siteNom }}</label>
            <input v-model="contenus[l.id]" :class="cls.fieldInput" class="!h-[34px] !text-[12px]" placeholder="Articles chargés, séparés par une virgule…" />
          </div>
        </div>
        <div class="flex justify-end mt-3">
          <button :class="cls.btnPrimary" @click="declarer(v.id)"><Package class="w-4 h-4" /> Déclarer le chargement effectué</button>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-col gap-1 mb-2">
          <div v-for="l in ordreChargement(v)" :key="l.id" class="text-[12px] flex gap-2">
            <span class="text-muted-foreground shrink-0">{{ l.destinataire ?? l.siteNom }} :</span>
            <span class="text-foreground">{{ l.contenuCharge }}</span>
            <span v-if="l.chargementConformeLe" class="text-success shrink-0">conforme</span>
          </div>
        </div>
        <p class="text-[12px] text-muted-foreground italic flex items-center gap-1.5"><Clock class="w-4 h-4" /> En attente du contrôle du chauffeur.</p>
      </template>

      <div v-for="l in nonConformes(v)" :key="l.id" class="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-danger-bg text-danger mt-2">
        <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5" />
        <p class="text-xs">Le chauffeur a signalé une non-conformité pour {{ l.destinataire ?? l.siteNom }} : {{ l.motifNonConformite }}. Cette ligne sort de la tournée, à recharger et à replanifier ; les autres partent.</p>
      </div>
    </div>

    <!-- Retours à réceptionner -->
    <div class="text-sm font-semibold text-foreground mb-2 mt-4">Retours à réceptionner</div>
    <div v-if="!retours.length" :class="L.card" class="text-center py-8 text-[13px] text-muted-foreground italic max-w-3xl">Aucune marchandise en retour.</div>
    <div v-else :class="L.card" class="max-w-3xl flex flex-col gap-2">
      <div v-for="r in retours" :key="r.etape.id" class="py-2 border-b border-border last:border-0">
        <div class="flex items-center gap-3">
          <Undo2 class="w-4 h-4 text-warning shrink-0" />
          <div class="flex-1 min-w-0 text-[12px]">
            <span class="text-foreground font-medium">{{ r.etape.destinataire }}</span>
            <span class="text-muted-foreground"> · {{ r.voyage.numeroOT || r.voyage.reference }} · {{ r.etape.motifRetour }}</span>
          </div>
          <template v-if="controleOuvert !== r.etape.id">
            <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="controleOuvert = r.etape.id">Non conforme</button>
            <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="recevoir(r.voyage.id, r.etape.id, true)">État conforme, réceptionner</button>
          </template>
        </div>
        <div v-if="controleOuvert === r.etape.id" class="flex items-center gap-2 mt-2 pl-7">
          <input v-model="motifNonConformeRetour" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Ce qui ne va pas sur la marchandise revenue…" />
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="controleOuvert = null; motifNonConformeRetour = ''">Renoncer</button>
          <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifNonConformeRetour.trim()" @click="recevoir(r.voyage.id, r.etape.id, false)">Réceptionner comme non conforme</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Espace de l'entrepôt : il déclare ce qui est chargé, destinataire par
 * destinataire, pour que le chauffeur puisse le contrôler ; il réceptionne
 * les marchandises qui reviennent de tournée ; il peut simuler l'ordre de
 * chargement, déduit de l'ordre de livraison. Les règles de compatibilité
 * entre produits, propres au carburant, relèvent du périmètre futur.
 */
import { computed, reactive, ref, watch } from 'vue'
import { Clock, ListOrdered, Package, Printer, ShieldAlert, Undo2 } from '@lucide/vue'
import { useVoyagesStore } from '../../stores/voyages'
import PlanificationTabs from '../../components/flotte/PlanificationTabs.vue'
import { fmtDateHeure, horsTournee } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'
import type { Voyage } from '../../types'

const store = useVoyagesStore()

/** Le dernier point livré est le premier chargé : il reste accessible en
 *  dernier dans le véhicule. */
const ordreChargement = (v: Voyage) => [...v.etapes].filter(e => !horsTournee(e)).sort((a, b) => b.ordre - a.ordre)
const nonConformes = (v: Voyage) => v.etapes.filter(e => e.chargementNonConformeLe)
function zone(i: number, total: number) {
  if (total === 1) return 'Une seule livraison'
  return i === 0 ? 'Fond du camion' : i === total - 1 ? 'Porte du camion' : 'Milieu du camion'
}

const simulation = ref<string | null>(null)
const contenus = reactive<Record<string, string>>({})
watch(() => store.confirmes, vs => vs.forEach(v => v.etapes.forEach(e => { if (!(e.id in contenus)) contenus[e.id] = e.contenuCharge ?? '' })), { immediate: true, deep: true })
function declarer(voyageId: string) {
  const res = store.declarerChargementEntrepot(voyageId, contenus)
  if (!res.ok) alert(res.motif)
}

const retours = computed(() => store.voyages.flatMap(v => v.etapes.filter(e => e.retourEntrepotLe && !e.retourRecuLe).map(etape => ({ voyage: v, etape }))))
const controleOuvert = ref<string | null>(null)
const motifNonConformeRetour = ref('')
function recevoir(voyageId: string, etapeId: string, conforme: boolean) {
  const res = store.recevoirRetour(voyageId, etapeId, conforme, motifNonConformeRetour.value)
  if (!res.ok) { alert(res.motif); return }
  controleOuvert.value = null; motifNonConformeRetour.value = ''
}
</script>
