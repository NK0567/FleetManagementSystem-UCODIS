<script setup lang="ts">
/**
 * Expédition confiée à un transporteur externe : son conducteur n'a pas
 * d'espace dans l'application. Le planificateur enregistre ici ce que le
 * transporteur lui remonte, avec le même déroulement que pour nos moyens :
 * contrôle du chargement, arrivée sur chaque point, livraison déclarée
 * (quantité reçue comprise), refus ou report demandé sur place.
 */
import { ref, computed, watch } from 'vue'
import * as cls from '../../lib/formClasses'
import ChoixMotif from './ChoixMotif.vue'
import SaisieArticles from '../flotte/SaisieArticles.vue'
import { useVoyagesStore } from '../../stores/voyages'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { dansLaTournee } from '../../utils/voyageUtils'
import type { EtapeVoyage, Voyage } from '../../types'

const props = defineProps<{ voyage: Voyage }>()
const emit = defineEmits<{ resultat: [r: { ok: boolean; motif?: string }, succes: string] }>()
const store = useVoyagesStore()
const params = useParametresPlanificationStore()
const unite = computed(() => params.parametres.uniteComptage)

const lignes = computed(() => [...props.voyage.etapes].sort((a, b) => a.ordre - b.ordre))
const aControler = computed(() => props.voyage.statut === 'confirme' && !!props.voyage.chargementEntrepotLe)
/** Prochain point où le conducteur du transporteur peut arriver. */
const prochainPoint = computed(() => {
  if (props.voyage.statut !== 'pret' && props.voyage.statut !== 'en_cours') return null
  for (const e of lignes.value) {
    if (e.franchi || e.reporteLe || e.ligneAnnuleeLe || !dansLaTournee(e)) continue
    return e.arriveeLe ? null : e.id
  }
  return null
})
const surPlace = computed(() => lignes.value.filter(e => e.arriveeLe && !e.franchi && dansLaTournee(e) && !e.reporteLe))
/** Points reportés, à retenter tant que l'expédition est en cours. */
const reportes = computed(() => props.voyage.statut === 'en_cours' ? lignes.value.filter(e => e.reporteLe && !e.franchi && dansLaTournee(e)) : [])
/* Article par article : chaque article a son sort, la quantité pré-remplie suit les articles décochés. */
const saisies = ref<Record<string, { nonLivres: { id: string; motif: string }[]; valide: boolean }>>({})
const reference = (e: EtapeVoyage) => store.quantiteReference(props.voyage, e)
function prerempli(e: EtapeVoyage): number | null {
  const ref0 = reference(e)
  if (!params.parametres.preremplirQuantites || ref0 == null) return null
  const retires = (saisies.value[e.id]?.nonLivres ?? []).reduce((t, n) => {
    const m = /^(\d+)(?=\s)/.exec(e.articles?.find(a => a.id === n.id)?.libelle ?? '')
    return t + (m ? Number(m[1]) : 0)
  }, 0)
  return Math.max(0, ref0 - retires)
}
function changerArticles(e: EtapeVoyage, v: { nonLivres: { id: string; motif: string }[]; valide: boolean }) {
  saisies.value = { ...saisies.value, [e.id]: v }
  quantite.value = { ...quantite.value, [e.id]: prerempli(e) }
}
watch(surPlace, l => l.forEach(e => { if (!(e.id in quantite.value)) quantite.value = { ...quantite.value, [e.id]: prerempli(e) } }), { immediate: true })
const dateReport = ref('')

const ncOuverte = ref<string | null>(null)
const motif = ref('')
const quantite = ref<Record<string, number | null>>({})
const justification = ref<Record<string, string>>({})
const actionOuverte = ref<{ id: string; type: 'refus' | 'report' | 'report_simple' } | null>(null)
watch(() => props.voyage.id, () => { ncOuverte.value = null; actionOuverte.value = null })

function r(res: { ok: boolean; motif?: string }, succes: string) { emit('resultat', res, succes); return res.ok }
function toutConforme() { r(store.validerChargementChauffeur(props.voyage.id), 'Chargement contrôlé par le transporteur.') }
function nonConforme(id: string) { if (r(store.controlerLigneChargement(props.voyage.id, id, false, motif.value), 'Non-conformité enregistrée : la ligne sort de la tournée.')) { ncOuverte.value = null; motif.value = '' } }
function arrivee(id: string) { r(store.marquerArrivee(props.voyage.id, id), 'Arrivée enregistrée.') }
function declarer(id: string) {
  const e = props.voyage.etapes.find(x => x.id === id)
  if (!e) return
  const q = quantite.value[id]
  const saisie = reference(e) != null && q != null && (q as unknown) !== '' ? { recue: Number(q), justification: justification.value[id] } : {}
  const articles = e.articles?.length ? saisies.value[id]?.nonLivres ?? [] : []
  r(store.declarerLivraisonChauffeur(props.voyage.id, id, articles, saisie), 'Livraison enregistrée : le destinataire est invité à confirmer.')
}
function valider() {
  const a = actionOuverte.value
  if (!a) return
  const res = a.type === 'refus' ? store.annulerLigne(props.voyage.id, a.id, motif.value)
    : a.type === 'report_simple' ? store.reporterLigne(props.voyage.id, a.id, motif.value)
    : store.reporterAvecRetour(props.voyage.id, a.id, motif.value, dateReport.value || undefined)
  const succes = a.type === 'refus' ? 'Refus du destinataire enregistré.' : a.type === 'report_simple' ? 'Point reporté : il sera retenté plus tard.' : 'Report demandé sur place enregistré : la marchandise revient à l’entrepôt.'
  if (r(res, succes)) { actionOuverte.value = null; motif.value = ''; dateReport.value = '' }
}
function reprendre(id: string) { store.reprendreLigne(props.voyage.id, id); emit('resultat', { ok: true }, 'Point repris : il peut être livré.') }
const nom = (e: { destinataire?: string; siteNom: string }) => e.destinataire ?? e.siteNom
</script>

<template>
  <div class="flex flex-col gap-2">
    <template v-if="aControler">
      <div v-for="e in lignes.filter(x => dansLaTournee(x))" :key="e.id" class="flex items-center gap-2 flex-wrap text-[12px]">
        <span class="flex-1 text-foreground">{{ nom(e) }} : {{ e.contenuCharge }}</span>
        <span v-if="e.chargementConformeLe" class="text-success">conforme</span>
        <template v-else-if="ncOuverte === e.id">
          <ChoixMotif type-motif="NON_CONFORMITE" placeholder="Ce qui ne correspond pas (obligatoire)…" @change="m => motif = m" />
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="ncOuverte = null">Renoncer</button>
          <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px] !bg-danger" :disabled="!motif.trim()" @click="nonConforme(e.id)">Non conforme</button>
        </template>
        <button v-else class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="ncOuverte = e.id; motif = ''">Signaler une non-conformité</button>
      </div>
      <div class="flex justify-end"><button :class="cls.btnPrimary" class="!py-1.5 !text-[12px]" @click="toutConforme">Tout est conforme</button></div>
    </template>
    <p v-else-if="voyage.statut === 'confirme'" class="text-[12px] text-muted-foreground">Le chargement doit d'abord être déclaré par l'entrepôt.</p>

    <div v-if="prochainPoint" class="flex items-center gap-2 text-[12px]">
      <span class="flex-1 text-foreground">Prochain point : {{ nom(voyage.etapes.find(e => e.id === prochainPoint)!) }}</span>
      <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="arrivee(prochainPoint!)">Enregistrer l'arrivée</button>
    </div>

    <div v-for="e in reportes" :key="e.id" class="flex items-center gap-2 text-[12px] rounded-md bg-warning-bg px-3 py-2">
      <span class="flex-1 text-foreground">{{ nom(e) }} · reporté : {{ e.motifReport }}</span>
      <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="reprendre(e.id)">Retenter ce point</button>
    </div>

    <div v-for="e in surPlace" :key="e.id" class="rounded-md bg-background px-3 py-2 flex flex-col gap-1.5">
      <p class="text-[12px] text-foreground font-medium">{{ nom(e) }} · conducteur sur place</p>
      <SaisieArticles v-if="e.destinataire && e.articles?.length && !e.bonLivraison" :key="`a-${e.id}`" :articles="e.articles" @change="v => changerArticles(e, v)" />
      <div v-if="e.destinataire && reference(e) != null" class="flex items-center gap-2 flex-wrap">
        <label class="text-[11px] text-muted-foreground">Quantité reçue (sur {{ reference(e) }} {{ unite }})</label>
        <input v-model.number="quantite[e.id]" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[110px]" />
        <input v-model="justification[e.id]" :class="cls.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[180px]" placeholder="Justification si l'écart est hors tolérance" />
      </div>
      <div v-if="actionOuverte?.id === e.id" class="flex items-center gap-2 flex-wrap">
        <ChoixMotif :type-motif="actionOuverte.type === 'refus' ? 'REFUS' : 'REPORT'" @change="m => motif = m" />
        <label v-if="actionOuverte.type === 'report'" class="flex items-center gap-1.5 text-[11px] text-muted-foreground">Livrable à partir du
          <input v-model="dateReport" type="date" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[150px]" /></label>
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="actionOuverte = null">Renoncer</button>
        <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!motif.trim()" @click="valider">Enregistrer</button>
      </div>
      <div v-else class="flex items-center gap-3 flex-wrap">
        <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!!e.articles?.length && !e.bonLivraison && saisies[e.id]?.valide === false" @click="declarer(e.id)">Enregistrer la livraison</button>
        <template v-if="e.destinataire">
          <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="actionOuverte = { id: e.id, type: 'refus' }; motif = ''">Refus du destinataire</button>
          <button class="text-[11px] text-warning underline bg-transparent border-0 cursor-pointer p-0" @click="actionOuverte = { id: e.id, type: 'report_simple' }; motif = ''">Reporter, retenter plus tard</button>
          <button class="text-[11px] text-warning underline bg-transparent border-0 cursor-pointer p-0" @click="actionOuverte = { id: e.id, type: 'report' }; motif = ''; dateReport = ''">Report demandé sur place</button>
        </template>
      </div>
    </div>
  </div>
</template>
