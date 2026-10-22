<script setup lang="ts">
/**
 * Fiche d'une tournée de carburant, dans la fiche de l'ordre de transport :
 * la tournée (dépôt, dates, région, camions, commandes), le plan de
 * chargement compartiment par compartiment, le bon d'enlèvement (transmis au
 * dépôt, confirmé par le BSL) et les bons de livraison, avec les opérations
 * tracées qui traitent un imprévu après la validation.
 */
import { ref, computed, watch } from 'vue'
import { AlertCircle, AlertTriangle, CheckCircle2, ListOrdered, Printer, Send, Truck, Wand2, X } from '@lucide/vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SaisieMesures from './SaisieMesures.vue'
import * as cls from '../../lib/formClasses'
import { useLivraisonCarburantStore, LIB_STATUT_BON, etatBonLivraison, TYPE_MOTIF_DEVIATION } from '../../stores/livraisonCarburant'
import { useCommandesStore } from '../../stores/commandes'
import { useVoyagesStore } from '../../stores/voyages'
import { useVehiculeStore } from '../../stores/vehicules'
import { useSitesStore } from '../../stores/sites'
import { useAuthStore } from '../../stores/auth'
import { useControlesTransportStore } from '../../stores/controlesTransport'
import { fmtDateHeure, dansLaTournee } from '../../utils/voyageUtils'
import { fmtL, fmtNombre, origineVolume15, totalA15, totalVolume } from '../../lib/volume15'
import type { Commande, CompartimentPlan, EtapeVoyage, MesureCompartiment, Voyage } from '../../types'

const props = defineProps<{ voyage: Voyage }>()
const store = useLivraisonCarburantStore()
const commandes = useCommandesStore()
const voyages = useVoyagesStore()
const vehicules = useVehiculeStore()
const sites = useSitesStore()
const auth = useAuthStore()
const ctrl = useControlesTransportStore()

const t = computed(() => props.voyage.carburant!)
const peutPiloter = computed(() => !auth.lectureSeule && store.habilite())
const enAttente = computed(() => props.voyage.statut === 'en_attente' && !t.value.valideeLe)
const editable = computed(() => enAttente.value && peutPiloter.value)

/* ── Messages : motif d'un refus ou résultat d'une action, sous la section concernée ── */
const message = ref<{ section: string; texte: string; ton: 'erreur' | 'succes' | 'avertissement' } | null>(null)
watch(() => props.voyage.id, () => { message.value = null })
function resultat(section: string, r: { ok: boolean; motif?: string }, succes: string) {
  message.value = r.ok ? { section, texte: succes, ton: 'succes' } : { section, texte: r.motif ?? 'Action impossible.', ton: 'erreur' }
  return r.ok
}
const classeMessage = (ton: string) => ton === 'erreur' ? 'bg-danger-bg text-danger' : ton === 'avertissement' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'
const iconeMessage = (ton: string) => ton === 'succes' ? CheckCircle2 : ton === 'avertissement' ? AlertTriangle : AlertCircle

/* ── Tournée ── */
const depot = computed(() => sites.getById(t.value.depotId))
const commandesTournee = computed(() => t.value.commandeIds.map(id => commandes.getById(id)).filter((c): c is Commande => !!c))
const verification = computed(() => store.verification(props.voyage))
const plaque = (id: string) => vehicules.parId(id)?.immatriculation ?? id
const jour = (iso?: string) => iso ? new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('fr-FR') : '-'
function retirerCommande(id: string) { resultat('tournee', store.retirerCommande(props.voyage.id, id), 'Commande retirée de la tournée : elle redevient disponible.') }
/* Reprogrammation d'une tournée en attente : date prévue et date de validité. */
const datesOuvertes = ref(false)
const nouvellesDates = ref({ datePlanifiee: '', dateValidite: '' })
function ouvrirDates() {
  nouvellesDates.value = { datePlanifiee: props.voyage.datePlanifiee.slice(0, 16), dateValidite: t.value.dateValidite }
  datesOuvertes.value = true
}
function reprogrammer() {
  if (resultat('tournee', store.reprogrammer(props.voyage.id, nouvellesDates.value.datePlanifiee, nouvellesDates.value.dateValidite), 'Tournée reprogrammée : nouvelles dates enregistrées.')) datesOuvertes.value = false
}
/* Tournée à plusieurs camions : les ordres nés de la même tournée. */
const autresOrdres = computed(() => store.ordresDeLaTournee(props.voyage).filter(o => o.id !== props.voyage.id))

/* ── Plan de chargement ── */
const camions = computed(() => t.value.camions)
const planDe = (vehiculeId: string) => t.value.plan.filter(x => x.vehiculeId === vehiculeId).sort((a, b) => a.numero - b.numero)
const restants = computed(() => store.restants(props.voyage))
const produitsTournee = computed(() => [...new Set(commandesTournee.value.map(c => c.produit ?? c.contenu))])
const cle = (x: CompartimentPlan) => `${x.vehiculeId}-${x.numero}`
const brouillon = ref<Record<string, { produit: string; volumeL: number | null; commandeId: string }>>({})
/* Seules les lignes dont le plan enregistré a changé sont reprises : ce qui est tapé sur les autres lignes reste. */
const dernierEnregistre: Record<string, string> = {}
watch(() => t.value.plan, plan => {
  const suivant = { ...brouillon.value }
  plan.forEach(x => {
    const k = cle(x), signature = JSON.stringify([x.produit ?? '', x.volumeL ?? null, x.commandeId ?? ''])
    if (dernierEnregistre[k] !== signature || !suivant[k]) suivant[k] = { produit: x.produit ?? '', volumeL: x.volumeL ?? null, commandeId: x.commandeId ?? '' }
    dernierEnregistre[k] = signature
  })
  brouillon.value = suivant
}, { immediate: true, deep: true })
const clientsPour = (produit: string) => commandesTournee.value.filter(c => !produit || (c.produit ?? c.contenu) === produit)
function corriger(x: CompartimentPlan) {
  const b = brouillon.value[cle(x)]!
  resultat('plan', store.corriger(props.voyage.id, x.vehiculeId, x.numero, { produit: b.produit || undefined, volumeL: b.volumeL, commandeId: b.commandeId || undefined }), `Compartiment ${x.numero} corrigé.`)
}
function proposer() {
  const r = store.proposer(props.voyage.id)
  if (resultat('plan', r, 'Plan de chargement proposé.') && r.nonPlacees?.length) message.value = { section: 'plan', texte: `Plan de chargement proposé en partie. Non placées : ${r.nonPlacees.join(' ')}`, ton: 'avertissement' }
}
function effacer() { resultat('plan', store.effacer(props.voyage.id), 'Plan effacé : les compartiments sont à charger à la main.') }
const emit = defineEmits<{ valide: [ordres: string[]] }>()
function valider() {
  const r = store.valider(props.voyage.id)
  const base = r.ordres && r.ordres.length > 1 ? `Tournée validée : ${r.ordres.length} ordres de transport planifiés, bons générés.` : 'Tournée validée : plan figé, ordre de transport planifié, bons générés.'
  const retires = r.retires?.length ? ` ${r.retires.join(', ')} retiré(s) de la tournée faute de chargement.` : ''
  if (resultat('plan', r, base + retires)) emit('valide', r.ordres ?? [])
}
const mesureBsl = (n: number) => t.value.bonEnlevement?.bsl?.mesures.find(m => m.numero === n)

/* ── Bon d'enlèvement ── */
const bon = computed(() => t.value.bonEnlevement)
const statutBon = computed(() => store.statutBon(props.voyage))
const aCharger = computed(() => store.aCharger(props.voyage))
const actifBon = computed(() => !!bon.value && !['annule', 'cloture'].includes(props.voyage.statut))
const avantChargement = computed(() => actifBon.value && bon.value?.statut === 'emis' && ['planifie', 'confirme'].includes(props.voyage.statut))
const emailDepot = ref('')
/* L'adresse du dépôt est reprise de sa fiche quand elle existe ; sinon elle se saisit. */
watch([() => props.voyage.id, () => t.value.depotId], () => { emailDepot.value = bon.value?.transmisA ?? depot.value?.email ?? '' }, { immediate: true })
function transmettre() { resultat('bon', store.transmettreBon(props.voyage.id, emailDepot.value), `Bon d'enlèvement transmis au dépôt (${emailDepot.value.trim()}).`) }

const numeroBsl = ref('')
const mesuresBsl = ref<Partial<MesureCompartiment>[]>([])
const compartimentsBsl = computed(() => aCharger.value.map(x => ({ numero: x.numero, produit: x.produit, libelle: `Compartiment ${x.numero} : ${x.produit}, ${fmtL(x.volumeL)} prévus pour ${x.client}` })))
/* L'enlèvement se confirme quand la tournée est confirmée, avant le départ. */
const peutConfirmer = computed(() => store.peutConfirmerEnlevement() && !auth.lectureSeule && actifBon.value && bon.value?.statut === 'emis' && props.voyage.statut === 'confirme')
/* Simulation de l'ordre de chargement de la citerne, compartiment par compartiment, selon le plan validé :
   on charge d'abord le compartiment du client livré en dernier. */
const simulationOuverte = ref(false)
const ordreChargement = computed(() => {
  const livraisons = [...props.voyage.etapes].filter(e => e.bonLivraison && dansLaTournee(e)).sort((a, b) => a.ordre - b.ordre)
  const rang = (commandeId?: string) => livraisons.findIndex(e => e.commandeId === commandeId) + 1
  return aCharger.value.filter(x => rang(x.commandeId) > 0).map(x => ({ ...x, rang: rang(x.commandeId) }))
    .sort((a, b) => b.rang - a.rang || a.numero - b.numero)
})
function confirmerEnlevement() {
  resultat('bon', store.confirmerEnlevement(props.voyage.id, numeroBsl.value, mesuresBsl.value), "Enlèvement confirmé : le chargement est déclaré, le conducteur peut le contrôler.")
}

const changementCamion = ref(false)
const nouveauCamion = ref({ vehiculeId: '', citerneId: '', motif: '' })
watch(changementCamion, () => { nouveauCamion.value = { vehiculeId: props.voyage.vehiculeId ?? '', citerneId: props.voyage.semiRemorqueId ?? '', motif: '' } })
const optCamions = computed(() => store.tracteursDisponibles(props.voyage.id).filter(v => v.id !== props.voyage.vehiculeId))
const optCiternes = computed(() => store.citernesDisponibles(props.voyage.id, nouveauCamion.value.vehiculeId || undefined).filter(c => c.id !== props.voyage.semiRemorqueId))
/* Le conducteur, son permis et le transporteur se renseignent d'après le camion choisi. */
const conducteurChoisi = computed(() => nouveauCamion.value.vehiculeId ? store.conducteurDe(nouveauCamion.value.vehiculeId) : null)
const permisChoisi = computed(() => store.permisDe(conducteurChoisi.value?.id))
function changerCamion() {
  if (resultat('bon', store.changerCamion(props.voyage.id, { vehiculeId: nouveauCamion.value.vehiculeId, citerneId: nouveauCamion.value.citerneId }, nouveauCamion.value.motif), 'Camion changé : le conducteur retiré et le nouveau conducteur sont notifiés.')) changementCamion.value = false
}
const changementDepot = ref(false)
const nouveauDepot = ref({ depotId: '', motif: '' })
watch(changementDepot, () => { nouveauDepot.value = { depotId: '', motif: '' } })
function changerDepot() {
  if (resultat('bon', store.changerDepot(props.voyage.id, nouveauDepot.value.depotId, nouveauDepot.value.motif), 'Dépôt de chargement changé : transmettez le bon au nouveau dépôt.')) changementDepot.value = false
}
const permisActuel = computed(() => store.permisDe(props.voyage.chauffeurId))

/* ── Bons de livraison ── */
const lignesBons = computed(() => [...props.voyage.etapes].filter(e => e.bonLivraison).sort((a, b) => a.ordre - b.ordre))
/* Un bon dévié garde ses compartiments d'origine, pour rester lisible. */
const compartimentsLigne = (e: EtapeVoyage) => t.value.plan.filter(x => (x.commandeId === e.commandeId || (e.bonLivraison?.statut === 'devie' && x.commandeOrigineId === e.commandeId)) && (x.volumeL ?? 0) > 0)
const volumeBsl = (e: EtapeVoyage) => {
  const ms = compartimentsLigne(e).map(x => mesureBsl(x.numero)).filter((m): m is MesureCompartiment => !!m)
  if (!ms.length) return null
  return { volume: ms.every(m => m.volumeL != null) ? totalVolume(ms) : null, v15: ms.every(m => m.volume15 != null) ? totalA15(ms) : null }
}
const operationOuverte = ref<{ etapeId: string; type: 'annulation' | 'deviation' } | null>(null)
const incident = ref({ typeIncident: '', typeMotif: '', codeMotif: '', commentaire: '', commandeId: '' })
function ouvrirOperation(etapeId: string, type: 'annulation' | 'deviation') {
  operationOuverte.value = { etapeId, type }
  incident.value = { typeIncident: '', typeMotif: type === 'deviation' ? TYPE_MOTIF_DEVIATION : '', codeMotif: '', commentaire: '', commandeId: '' }
}
watch(() => incident.value.typeMotif, () => { incident.value.codeMotif = '' })
const typesIncident = computed(() => ctrl.motifs('typesIncident'))
/* Le type de motif « Déviation » ne sert qu'à la déviation : il n'est pas proposé pour une annulation. */
const typesMotif = computed(() => ctrl.motifs('typesMotif').filter(x => operationOuverte.value?.type === 'deviation' || x.code !== TYPE_MOTIF_DEVIATION))
const codesMotif = computed(() => incident.value.typeMotif ? ctrl.motifs('codesMotif', incident.value.typeMotif) : [])
const ciblesDeviation = (e: EtapeVoyage) => store.ciblesDeviation(props.voyage, e)
const peutOperer = (e: EtapeVoyage) => peutPiloter.value && actifBon.value && e.bonLivraison?.statut === 'emis' && dansLaTournee(e) && !e.franchi
  && ['planifie', 'confirme', 'pret', 'en_cours'].includes(props.voyage.statut)
const peutDevier = computed(() => bon.value?.statut === 'confirme' && ['confirme', 'pret', 'en_cours'].includes(props.voyage.statut))
function annulerBon(e: EtapeVoyage) {
  const r = store.annulerBon(props.voyage.id, e.id, incident.value)
  const suite = r.issue === 'annule' ? " Tous les bons de l'ordre sont annulés : l'ordre est annulé." : r.issue === 'termine' ? " Tous les bons de l'ordre sont annulés : le produit revient au dépôt, l'ordre est terminé, en attente de clôture." : ''
  if (resultat('bl', r, `Bon de livraison ${e.bonLivraison?.numero} annulé : la commande redevient disponible.${suite}`)) operationOuverte.value = null
}
const classeEtat = (ton: string) => ton === 'danger' ? 'bg-danger-bg text-danger' : ton === 'succes' ? 'bg-success-bg text-success' : ton === 'attente' ? 'bg-warning-bg text-warning' : 'bg-info-bg text-info'
function devier(e: EtapeVoyage) {
  const cible = commandes.getById(incident.value.commandeId)
  if (resultat('bl', store.devier(props.voyage.id, e.id, incident.value.commandeId, incident.value), `Livraison déviée vers ${cible?.destinataire ?? ''} : nouveau bon de livraison créé, destinataire notifié.`)) operationOuverte.value = null
}
const libelleIncident = (e: EtapeVoyage) => e.incidentBon
  ? `${ctrl.libelleMotif('typesIncident', e.incidentBon.typeIncident)} · ${ctrl.libelleMotif('typesMotif', e.incidentBon.typeMotif)} · ${ctrl.libelleMotif('codesMotif', e.incidentBon.codeMotif)}${e.incidentBon.commentaire ? ` · ${e.incidentBon.commentaire}` : ''}`
  : ''
const th = 'text-left py-1.5 text-[11px] font-semibold text-muted-foreground'
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const valeur = 'h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate'
</script>

<template>
  <!-- TOURNÉE DE CARBURANT -->
  <FormSection title="Tournée de carburant" :recaps="[t.reference, t.nbCamions ? `camion ${t.rangCamion} sur ${t.nbCamions}` : null, t.depotNom, t.region]" :default-open="true">
    <p v-if="t.nbCamions" class="text-[12px] text-foreground mb-3" data-lien-tournee>
      Tournée de carburant {{ t.reference }} : camion {{ t.rangCamion }} sur {{ t.nbCamions }}<template v-if="autresOrdres.length"> · autres ordres de la tournée : {{ autresOrdres.map(o => `${o.numeroOT || o.reference} (${o.vehiculePlaque})`).join(', ') }}</template>
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4 mb-4">
      <div class="flex flex-col gap-1.5"><label :class="lbl">Dépôt de chargement</label><div :class="valeur">{{ t.depotNom }}</div>
        <span v-if="depot?.proprietaireTiers" class="text-[10px] text-muted-foreground">Appartient à {{ depot.proprietaireTiers }}</span></div>
      <div class="flex flex-col gap-1.5"><label :class="lbl">Date prévue</label><div :class="valeur">{{ fmtDateHeure(voyage.datePlanifiee) }}</div></div>
      <div class="flex flex-col gap-1.5"><label :class="lbl">Date de validité</label><div :class="valeur">{{ jour(t.dateValidite) }}</div></div>
      <div class="flex flex-col gap-1.5"><label :class="lbl">Région</label><div :class="valeur">{{ t.region }}</div></div>
    </div>
    <div v-if="editable" class="mb-4">
      <button v-if="!datesOuvertes" class="text-[12px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="ouvrirDates">Modifier les dates</button>
      <div v-else class="flex items-end gap-2 flex-wrap rounded-md border border-border px-3.5 py-3" data-reprogrammation>
        <label class="flex flex-col gap-1"><span :class="lbl">Nouvelle date prévue</span>
          <input v-model="nouvellesDates.datePlanifiee" type="datetime-local" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" /></label>
        <label class="flex flex-col gap-1"><span :class="lbl">Nouvelle date de validité</span>
          <input v-model="nouvellesDates.dateValidite" type="date" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" /></label>
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="datesOuvertes = false">Renoncer</button>
        <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="reprogrammer">Enregistrer les dates</button>
      </div>
    </div>

    <p :class="lbl" class="mb-1.5">Camions</p>
    <table class="w-full border-collapse mb-4 text-[12px]">
      <thead><tr class="border-b border-border"><th :class="th">Camion</th><th :class="th">Citerne</th><th :class="th">Conducteur</th><th :class="th">Permis</th><th :class="th">Transporteur</th><th :class="th">Pompe</th></tr></thead>
      <tbody>
        <tr v-for="c in camions" :key="c.vehiculeId" class="border-b border-border/60">
          <td class="py-1.5 font-mono">{{ c.plaque }}</td>
          <td class="py-1.5"><span class="font-mono">{{ c.citernePlaque }}</span> <span class="text-muted-foreground">({{ fmtL(store.capaciteCiterne(c.citerneId)) }})</span></td>
          <td class="py-1.5">{{ c.chauffeurNom ?? '-' }}</td>
          <td class="py-1.5 text-muted-foreground">{{ store.permisDe(c.chauffeurId) ? `${store.permisDe(c.chauffeurId)!.reference} (${store.permisDe(c.chauffeurId)!.categorie}), valable jusqu'au ${jour(store.permisDe(c.chauffeurId)!.expiration)}` : '-' }}</td>
          <td class="py-1.5">{{ store.transporteur() }}</td>
          <td class="py-1.5">{{ store.camionPompe(c.vehiculeId, c.citerneId) ? 'Oui' : 'Non' }}</td>
        </tr>
      </tbody>
    </table>

    <template v-if="enAttente">
    <p :class="lbl" class="mb-1.5">Commandes</p>
    <table class="w-full border-collapse mb-3 text-[12px]">
      <thead><tr class="border-b border-border"><th :class="th">Client</th><th :class="th">Lieu de livraison</th><th :class="th">Produit</th><th :class="th" class="!text-right">Volume</th><th :class="th">Date souhaitée</th><th :class="th">Pompe</th><th v-if="editable" :class="th"></th></tr></thead>
      <tbody>
        <tr v-for="c in commandesTournee" :key="c.id" class="border-b border-border/60">
          <td class="py-1.5">{{ c.destinataire }} <span class="font-mono text-muted-foreground">{{ c.referenceExterne }}</span></td>
          <td class="py-1.5 text-muted-foreground">{{ c.adresseLivraison }}</td>
          <td class="py-1.5">{{ c.produit }}</td>
          <td class="py-1.5 text-right">{{ fmtL(c.volumeL) }}</td>
          <td class="py-1.5">{{ jour(c.dateSouhaitee) }}</td>
          <td class="py-1.5">{{ store.pompeExigee(c) ? 'Exigée' : '-' }}</td>
          <td v-if="editable" class="py-1.5 text-right"><button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="retirerCommande(c.id)">Retirer</button></td>
        </tr>
      </tbody>
    </table>
    </template>

    <div class="rounded-md border border-border px-3.5 py-2.5 text-[12px]">
      <div class="flex gap-6 flex-wrap">
        <span><span class="text-muted-foreground">Volume total à livrer : </span><span class="font-semibold">{{ fmtL(verification.volumeTotal) }}</span></span>
        <span><span class="text-muted-foreground">Capacité totale des camions : </span><span class="font-semibold">{{ fmtL(verification.capaciteTotale) }}</span></span>
      </div>
      <template v-if="enAttente">
        <p v-if="verification.repartissable" class="text-success flex items-center gap-1.5 mt-1.5"><CheckCircle2 class="w-4 h-4" /> La tournée peut être répartie.</p>
        <p v-for="m in verification.motifs" :key="m" class="text-danger flex items-start gap-1.5 mt-1.5"><AlertTriangle class="w-4 h-4 shrink-0 mt-px" /> {{ m }}</p>
      </template>
    </div>
    <div v-if="message?.section === 'tournee'" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mt-3" :class="classeMessage(message.ton)">
      <component :is="iconeMessage(message.ton)" class="w-4 h-4 shrink-0" /><p class="text-xs flex-1">{{ message.texte }}</p>
    </div>
  </FormSection>

  <!-- PLAN DE CHARGEMENT -->
  <FormSection title="Plan de chargement" :recaps="[t.valideeLe ? 'Figé' : 'En attente de validation', restants.length ? `${restants.length} produit(s) à charger` : null]" :default-open="true">
    <div v-if="message?.section === 'plan'" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3" :class="classeMessage(message.ton)">
      <component :is="iconeMessage(message.ton)" class="w-4 h-4 shrink-0" /><p class="text-xs flex-1">{{ message.texte }}</p>
      <button class="bg-transparent border-0 cursor-pointer text-inherit" title="Fermer" @click="message = null"><X class="w-4 h-4" /></button>
    </div>
    <div v-if="editable" class="flex items-center gap-2 flex-wrap mb-3">
      <button :class="cls.btnOutline" class="!py-1.5 !text-[12px]" @click="proposer"><Wand2 class="w-3.5 h-3.5" /> Proposer un plan</button>
      <button :class="cls.btnOutline" class="!py-1.5 !text-[12px]" @click="effacer">Effacer le plan</button>
      <button :class="cls.btnPrimary" class="!py-1.5 !text-[12px] ml-auto" @click="valider"><CheckCircle2 class="w-3.5 h-3.5" /> Valider la tournée</button>
    </div>
    <div v-if="restants.length" class="rounded-md bg-warning-bg text-warning px-3 py-2 text-[12px] mb-3">
      Reste à charger : {{ restants.map(r => `${r.produit} ${fmtL(r.volumeL)}`).join(' · ') }}
    </div>
    <p v-if="t.valideeLe" class="text-[11px] text-muted-foreground mb-2">Validé le {{ fmtDateHeure(t.valideeLe) }} par {{ t.valideePar }}</p>

    <div v-for="c in camions" :key="c.vehiculeId" class="rounded-lg border border-border px-3.5 py-3 mb-3">
      <p class="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5"><Truck class="w-4 h-4 text-primary" /> {{ c.plaque }} · citerne {{ c.citernePlaque }}</p>
      <table class="w-full border-collapse text-[12px]">
        <thead><tr class="border-b border-border">
          <th :class="th">Compartiment</th><th :class="th">Capacité</th><th :class="th">Produit</th><th :class="th">Volume</th><th :class="th">Client</th>
          <th v-if="editable" :class="th"></th>
          <th v-if="bon?.bsl" :class="th">Chargé (BSL)</th><th v-if="bon?.bsl" :class="th">Contrôle du conducteur</th>
        </tr></thead>
        <tbody>
          <tr v-for="x in planDe(c.vehiculeId)" :key="cle(x)" class="border-b border-border/60" :class="x.nonCharge ? 'text-muted-foreground line-through' : ''">
            <td class="py-1.5 font-semibold">{{ x.numero }}</td>
            <td class="py-1.5">{{ fmtL(x.capaciteL) }}</td>
            <template v-if="editable && brouillon[cle(x)]">
              <td class="py-1 pr-1.5">
                <select v-model="brouillon[cle(x)]!.produit" :class="cls.fieldSelect" class="!h-[30px] !text-[12px]">
                  <option value="">Vide</option><option v-for="p in produitsTournee" :key="p" :value="p">{{ p }}</option>
                </select>
              </td>
              <td class="py-1 pr-1.5"><input v-model.number="brouillon[cle(x)]!.volumeL" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[110px]" /></td>
              <td class="py-1 pr-1.5">
                <select v-model="brouillon[cle(x)]!.commandeId" :class="cls.fieldSelect" class="!h-[30px] !text-[12px]">
                  <option value="">Aucun</option><option v-for="k in clientsPour(brouillon[cle(x)]!.produit)" :key="k.id" :value="k.id">{{ k.destinataire }}</option>
                </select>
              </td>
              <td class="py-1"><button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="corriger(x)">Appliquer</button></td>
            </template>
            <template v-else>
              <td class="py-1.5">{{ x.produit ?? '-' }}</td>
              <td class="py-1.5">{{ x.volumeL ? fmtL(x.volumeL) : '-' }}</td>
              <td class="py-1.5">{{ x.client ?? '-' }}<span v-if="x.nonCharge" class="no-underline"> (non chargé)</span></td>
            </template>
            <template v-if="bon?.bsl">
              <td class="py-1.5">{{ mesureBsl(x.numero) ? [mesureBsl(x.numero)!.volumeL != null ? fmtL(mesureBsl(x.numero)!.volumeL) : null, mesureBsl(x.numero)!.volume15 != null ? `${fmtL(mesureBsl(x.numero)!.volume15)} à 15 °C (${origineVolume15(mesureBsl(x.numero))})` : null].filter(Boolean).join(', ') || '-' : '-' }}</td>
              <td class="py-1.5" :class="x.nonConformeLe ? 'text-danger' : x.conformeLe ? 'text-success' : 'text-muted-foreground'">
                {{ x.nonConformeLe ? `Non conforme : ${x.motifNonConformite}` : x.conformeLe ? 'Conforme' : bon?.statut === 'confirme' && !x.nonCharge ? 'À contrôler' : '-' }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </FormSection>

  <!-- BON D'ENLÈVEMENT -->
  <FormSection v-if="bon" title="Bon d'enlèvement" :recaps="[bon.numero, statutBon ? LIB_STATUT_BON[statutBon] : null]" :default-open="true">
    <div v-if="message?.section === 'bon'" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3" :class="classeMessage(message.ton)">
      <component :is="iconeMessage(message.ton)" class="w-4 h-4 shrink-0" /><p class="text-xs flex-1">{{ message.texte }}</p>
      <button class="bg-transparent border-0 cursor-pointer text-inherit" title="Fermer" @click="message = null"><X class="w-4 h-4" /></button>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2 text-[12px] mb-3">
      <div><p class="text-muted-foreground">Numéro</p><p class="font-mono font-semibold">{{ bon.numero }}</p></div>
      <div><p class="text-muted-foreground">Statut</p><p>{{ statutBon ? LIB_STATUT_BON[statutBon] : '-' }}</p></div>
      <div><p class="text-muted-foreground">Dépôt</p><p>{{ t.depotNom }}</p></div>
      <div><p class="text-muted-foreground">Date</p><p>{{ fmtDateHeure(voyage.datePlanifiee) }}</p></div>
      <div><p class="text-muted-foreground">Camion</p><p class="font-mono">{{ voyage.vehiculePlaque }} · {{ voyage.semiRemorquePlaque }}</p></div>
      <div><p class="text-muted-foreground">Conducteur</p><p>{{ voyage.chauffeurNom ?? '-' }}</p></div>
      <div><p class="text-muted-foreground">Permis</p><p>{{ permisActuel ? `${permisActuel.reference} (${permisActuel.categorie})` : '-' }}</p></div>
      <div><p class="text-muted-foreground">Transmis au dépôt</p><p>{{ bon.transmisLe ? `${fmtDateHeure(bon.transmisLe)}, ${bon.transmisA}` : 'Pas encore' }}</p></div>
    </div>

    <table class="w-full border-collapse text-[12px] mb-3">
      <thead><tr class="border-b border-border"><th :class="th">Compartiment</th><th :class="th">Produit</th><th :class="th">Volume attendu</th><th :class="th">Client</th></tr></thead>
      <tbody>
        <tr v-for="x in t.plan.filter(k => (k.volumeL ?? 0) > 0)" :key="cle(x)" class="border-b border-border/60" :class="x.nonCharge ? 'text-muted-foreground' : ''">
          <td class="py-1.5 font-semibold">{{ x.numero }}</td><td class="py-1.5">{{ x.produit }}</td>
          <td class="py-1.5">{{ x.nonCharge ? 'Non chargé' : fmtL(x.volumeL) }}</td><td class="py-1.5">{{ x.client }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="bon.bsl" class="rounded-md border border-border px-3.5 py-2.5 mb-3">
      <p class="text-[12px] font-semibold text-foreground mb-1">BSL {{ bon.bsl.numero }}</p>
      <p class="text-[11px] text-muted-foreground mb-2">Saisi le {{ fmtDateHeure(bon.bsl.saisiLe) }} par {{ bon.bsl.saisiPar }}{{ bon.bsl.parDepot ? ' (dépôt)' : ', à partir du BSL remis au conducteur' }}</p>
      <p v-if="!bon.bsl.mesures.length" class="text-[11px] text-muted-foreground">Aucune mesure saisie : l'enlèvement est confirmé par le seul numéro de BSL.</p>
      <table v-else class="w-full border-collapse text-[12px]">
        <thead><tr class="border-b border-border"><th :class="th">Compartiment</th><th :class="th">Volume chargé</th><th :class="th">Température</th><th :class="th">Densité</th><th :class="th">Volume à 15 °C</th></tr></thead>
        <tbody>
          <tr v-for="m in bon.bsl.mesures" :key="m.numero" class="border-b border-border/60">
            <td class="py-1.5 font-semibold">{{ m.numero }}</td><td class="py-1.5">{{ fmtL(m.volumeL) }}</td><td class="py-1.5">{{ fmtNombre(m.temperature, ' °C') }}</td>
            <td class="py-1.5">{{ fmtNombre(m.densite) }}</td><td class="py-1.5">{{ fmtL(m.volume15) }}<template v-if="m.volume15 != null"> ({{ origineVolume15(m) }})</template></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center gap-3 flex-wrap mb-3">
      <RouterLink :to="`/chargement/${voyage.id}?document=enlevement`" target="_blank" class="text-[12px] text-primary underline inline-flex items-center gap-1"><Printer class="w-3.5 h-3.5" /> Imprimer le bon d'enlèvement</RouterLink>
      <button v-if="ordreChargement.length" class="text-[12px] text-primary underline bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1" @click="simulationOuverte = !simulationOuverte"><ListOrdered class="w-3.5 h-3.5" /> Simuler le chargement</button>
      <RouterLink :to="`/chargement/${voyage.id}`" target="_blank" class="text-[12px] text-primary underline inline-flex items-center gap-1"><Printer class="w-3.5 h-3.5" /> Imprimer la liste de chargement</RouterLink>
    </div>
    <div v-if="simulationOuverte && ordreChargement.length" class="rounded-md bg-info-bg px-3 py-2.5 mb-3" data-simulation-citerne>
      <p class="text-[11px] font-semibold text-info uppercase tracking-[0.04em] mb-1">Ordre de chargement de la citerne</p>
      <p class="text-[11px] text-muted-foreground mb-2">On charge d'abord le compartiment du client livré en dernier. L'ordre suit le plan validé et l'ordre de livraison.</p>
      <div v-for="(x, i) in ordreChargement" :key="cle(x)" class="flex items-center gap-2 text-[12px] py-0.5">
        <span class="w-5 h-5 rounded-full bg-info text-white text-[10px] font-bold flex items-center justify-center shrink-0">{{ i + 1 }}</span>
        <span class="text-foreground flex-1">Compartiment {{ x.numero }} : {{ x.produit }}, {{ fmtL(x.volumeL) }} pour {{ x.client }}</span>
        <span class="text-muted-foreground">livré en {{ x.rang }}<sup>e</sup></span>
      </div>
    </div>

    <!-- Transmission au dépôt -->
    <div v-if="peutPiloter && actifBon && bon.statut === 'emis'" class="flex items-center gap-2 flex-wrap mb-3">
      <input v-model="emailDepot" :class="cls.fieldInput" class="!h-[32px] !text-[12px] !w-[280px]" placeholder="Adresse e-mail du dépôt…" />
      <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[12px]" @click="transmettre"><Send class="w-3.5 h-3.5" /> Transmettre au dépôt par e-mail</button>
    </div>

    <!-- Confirmation de l'enlèvement avec les données du BSL -->
    <div v-if="peutConfirmer" class="rounded-md border border-primary/30 px-3.5 py-3 mb-3">
      <p class="text-[12px] font-semibold text-foreground mb-2">Confirmer l'enlèvement</p>
      <div class="flex items-center gap-2 mb-2.5">
        <label class="text-[11px] text-muted-foreground shrink-0">Numéro de BSL</label>
        <input v-model="numeroBsl" :class="cls.fieldInput" class="!h-[32px] !text-[12px] !w-[200px]" />
      </div>
      <SaisieMesures :key="voyage.id + aCharger.length" :compartiments="compartimentsBsl" libelle-volume="Volume chargé (L)" @change="m => mesuresBsl = m" />
      <div class="flex justify-end mt-2.5"><button :class="cls.btnPrimary" class="!py-1.5 !text-[12px]" @click="confirmerEnlevement">Confirmer l'enlèvement</button></div>
    </div>

    <!-- Changement de camion ou de dépôt -->
    <div v-if="peutPiloter && avantChargement" class="flex items-center gap-3 mb-2">
      <button class="text-[12px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="changementCamion = !changementCamion; changementDepot = false">Changer de camion</button>
      <button class="text-[12px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="changementDepot = !changementDepot; changementCamion = false">Changer de dépôt</button>
    </div>
    <div v-if="changementCamion" class="rounded-md border border-border px-3.5 py-3 mb-3 flex flex-col gap-2">
      <div class="flex items-end gap-2 flex-wrap">
        <label class="flex flex-col gap-1"><span :class="lbl">Camion</span>
          <select v-model="nouveauCamion.vehiculeId" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] !w-[200px]">
            <option v-if="voyage.vehiculeId" :value="voyage.vehiculeId">{{ voyage.vehiculePlaque }} (actuel)</option>
            <option v-for="v in optCamions" :key="v.id" :value="v.id">{{ v.immatriculation }}</option>
          </select></label>
        <label class="flex flex-col gap-1"><span :class="lbl">Citerne</span>
          <select v-model="nouveauCamion.citerneId" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] !w-[200px]">
            <option v-if="voyage.semiRemorqueId" :value="voyage.semiRemorqueId">{{ voyage.semiRemorquePlaque }} (actuelle)</option>
            <option v-for="c in optCiternes" :key="c.id" :value="c.id">{{ c.immatriculation }}</option>
          </select></label>
      </div>
      <p class="text-[12px] text-foreground">Conducteur : {{ conducteurChoisi?.nom ?? 'aucun conducteur affecté' }} · Permis : {{ permisChoisi ? `${permisChoisi.reference} (${permisChoisi.categorie}), valable jusqu'au ${jour(permisChoisi.expiration)}` : '-' }} · Transporteur : {{ store.transporteur() }}</p>
      <div class="flex items-center gap-2">
        <input v-model="nouveauCamion.motif" :class="cls.fieldInput" class="!h-[32px] !text-[12px] flex-1" placeholder="Motif du changement (panne, indisponibilité…)" />
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="changementCamion = false">Renoncer</button>
        <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="changerCamion">Changer le camion</button>
      </div>
    </div>
    <div v-if="changementDepot" class="rounded-md border border-border px-3.5 py-3 mb-3 flex items-center gap-2 flex-wrap">
      <select v-model="nouveauDepot.depotId" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] !w-[240px]">
        <option value="">Nouveau dépôt…</option>
        <option v-for="d in store.depots.filter(x => x.id !== t.depotId)" :key="d.id" :value="d.id">{{ d.nom }}</option>
      </select>
      <input v-model="nouveauDepot.motif" :class="cls.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[200px]" placeholder="Motif du changement de dépôt…" />
      <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="changementDepot = false">Renoncer</button>
      <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="changerDepot">Changer le dépôt</button>
    </div>

    <p :class="lbl" class="mb-1 mt-2">Opérations sur le bon</p>
    <div v-for="(o, i) in bon.historique" :key="i" class="text-[11px] py-0.5 flex gap-2">
      <span class="text-muted-foreground shrink-0 w-[112px]">{{ fmtDateHeure(o.le) }}</span>
      <span class="text-foreground">{{ o.action }}<template v-if="o.motif"> · {{ o.motif }}</template> <span class="text-muted-foreground">({{ o.par }})</span></span>
    </div>
  </FormSection>

  <!-- BONS DE LIVRAISON -->
  <FormSection v-if="lignesBons.length" title="Bons de livraison" :recaps="[`${lignesBons.length} bon(s)`]" :default-open="true">
    <div v-if="message?.section === 'bl'" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3" :class="classeMessage(message.ton)">
      <component :is="iconeMessage(message.ton)" class="w-4 h-4 shrink-0" /><p class="text-xs flex-1">{{ message.texte }}</p>
      <button class="bg-transparent border-0 cursor-pointer text-inherit" title="Fermer" @click="message = null"><X class="w-4 h-4" /></button>
    </div>
    <div class="flex flex-col gap-2">
      <div v-for="e in lignesBons" :key="e.id" class="rounded-lg border border-border px-3.5 py-2.5" :data-bon="e.bonLivraison!.numero">
        <div class="flex items-center gap-2 flex-wrap text-[12px]">
          <span class="font-mono font-semibold text-foreground">{{ e.bonLivraison!.numero }}</span>
          <span class="text-foreground">{{ e.destinataire }}</span>
          <span v-if="e.commandeId && commandes.rangPart(e.commandeId)" class="text-[11px] text-info" data-part>livraison {{ commandes.rangPart(e.commandeId)!.rang }} sur {{ commandes.rangPart(e.commandeId)!.total }} de la commande</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full" :class="classeEtat(etatBonLivraison(e).ton)">{{ etatBonLivraison(e).libelle }}</span>
          <RouterLink :to="`/chargement/${voyage.id}?document=livraison&ligne=${e.id}`" target="_blank" class="ml-auto text-[11px] text-primary underline inline-flex items-center gap-1"><Printer class="w-3.5 h-3.5" /> Imprimer</RouterLink>
        </div>
        <p class="text-[11px] text-muted-foreground mt-1">
          {{ e.produit }} · prévu {{ fmtL(compartimentsLigne(e).reduce((s, x) => s + (x.volumeL ?? 0), 0)) }} en compartiment {{ compartimentsLigne(e).map(x => x.numero).join(', ') || '-' }}
          <template v-if="volumeBsl(e)?.volume != null"> · chargé {{ fmtL(volumeBsl(e)!.volume) }}</template><template v-if="volumeBsl(e)?.v15 != null">{{ volumeBsl(e)!.volume != null ? ', soit' : ' · chargé' }} {{ fmtL(volumeBsl(e)!.v15) }} à 15 °C</template>
          <template v-if="e.quantiteRecue != null && e.mesuresDepotees?.length"> · livré {{ fmtL(e.quantiteRecue) }}{{ voyages.uniteQuantite(voyage, e) === 'L' ? '' : ' à 15 °C' }}</template>
        </p>
        <p v-if="e.ecartNonControle" class="text-[11px] text-warning">{{ e.ecartNonControle }}</p>
        <p v-for="m in (e.mesuresDepotees ?? []).filter(x => x.volumeL === 0)" :key="m.numero" class="text-[11px] text-warning">Compartiment {{ m.numero }} non livré : {{ m.motifNonDepote }}</p>
        <p v-if="e.devieeDe" class="text-[11px] text-muted-foreground">Déviée depuis la livraison de {{ e.devieeDe }}</p>
        <p v-if="e.incidentBon" class="text-[11px] text-danger">{{ e.devieeVers ? `Déviée vers ${e.devieeVers}` : 'Annulé' }} le {{ fmtDateHeure(e.incidentBon.le) }} par {{ e.incidentBon.par }} : {{ libelleIncident(e) }}</p>

        <div v-if="peutOperer(e) && operationOuverte?.etapeId !== e.id" class="flex items-center gap-3 mt-1.5">
          <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="ouvrirOperation(e.id, 'annulation')">Annuler par un incident</button>
          <button v-if="peutDevier" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="ouvrirOperation(e.id, 'deviation')">Dévier vers un autre client</button>
        </div>
        <div v-if="operationOuverte?.etapeId === e.id" class="flex flex-col gap-2 mt-2 rounded-md bg-background px-3 py-2.5">
          <div v-if="operationOuverte.type === 'deviation'" class="flex items-center gap-2 flex-wrap">
            <label class="text-[11px] text-muted-foreground w-[110px] shrink-0">Nouveau client</label>
            <select v-model="incident.commandeId" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] flex-1 min-w-[240px]">
              <option value="">Choisir…</option>
              <option v-for="c in ciblesDeviation(e)" :key="c.id" :value="c.id">{{ c.destinataire }} · {{ c.produit }} · {{ fmtL(c.volumeL) }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <label class="text-[11px] text-muted-foreground w-[110px] shrink-0">Type d'incident</label>
            <select v-model="incident.typeIncident" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] flex-1 min-w-[240px]">
              <option value="">Choisir…</option><option v-for="x in typesIncident" :key="x.code" :value="x.code">{{ x.libelle }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <label class="text-[11px] text-muted-foreground w-[110px] shrink-0">Type de motif</label>
            <select v-model="incident.typeMotif" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] flex-1 min-w-[240px]" :disabled="operationOuverte.type === 'deviation'">
              <option value="">Choisir…</option><option v-for="x in typesMotif" :key="x.code" :value="x.code">{{ x.libelle }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <label class="text-[11px] text-muted-foreground w-[110px] shrink-0">Code motif</label>
            <select v-model="incident.codeMotif" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] flex-1 min-w-[240px]">
              <option value="">Choisir…</option><option v-for="x in codesMotif" :key="x.code" :value="x.code">{{ x.libelle }}</option>
            </select>
          </div>
          <input v-model="incident.commentaire" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Commentaire (facultatif)…" />
          <div class="flex justify-end gap-2">
            <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="operationOuverte = null">Renoncer</button>
            <button v-if="operationOuverte.type === 'annulation'" :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px]" @click="annulerBon(e)">Annuler ce bon</button>
            <button v-else :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="devier(e)">Dévier la livraison</button>
          </div>
        </div>
      </div>
    </div>
  </FormSection>
</template>
