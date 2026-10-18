<script lang="ts">
import type { CommandeACharger, VehiculeDisponible } from '../../lib/propositionChargement'
import type { Commande } from '../../types'
/** Une commande à placer, entière ou en partie (part de la commande répartie sur plusieurs véhicules). */
export type CommandeProposee = CommandeACharger & { commande: Commande; nombreUnites?: number; partie?: boolean }
export type VehiculePropose = VehiculeDisponible & { semiRemorque: string }
</script>

<script setup lang="ts">
/**
 * Proposition automatique de chargement : les commandes en attente sont
 * réparties entre les véhicules disponibles (destination, poids, volume,
 * contraintes de livraison). Le planificateur retire ou déplace une
 * commande, puis valide : un ordre de transport en attente est créé par
 * véhicule, sans être planifié. Une commande trop lourde ou trop volumineuse
 * pour un véhicule se répartit en parts (poids, nombre d'unités, volume au
 * prorata) ; le reste non placé demeure une commande à livrer. Effacer la
 * proposition laisse tout à affecter à la main.
 */
import { ref, computed } from 'vue'
import { Truck, X } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import * as F from '../../lib/formClasses'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { useCommandesStore } from '../../stores/commandes'
import { useVoyagesStore } from '../../stores/voyages'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useSitesStore } from '../../stores/sites'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { aujourdhuiISO } from '../../utils/horloge'
import { proposerChargement, placePour, placeRestante, decrireChargement, distanceKm, type ControleLivraison } from '../../lib/propositionChargement'

const props = defineProps<{ controle?: ControleLivraison<CommandeProposee, VehiculePropose> }>()
const emit = defineEmits<{ close: []; efface: []; valide: [ids: string[], refus: string[]] }>()

const commandesStore = useCommandesStore()
const voyages = useVoyagesStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const sitesStore = useSitesStore()
const docsVehicule = useDocumentsVehiculeStore()
const docsPersonnel = useDocumentsStore()

const datePlanifiee = ref(`${aujourdhuiISO()}T${useParametresPlanificationStore().parametres.heureDepartDefaut || '08:00'}`)
const erreur = ref('')

/* Région d'une destination : celle du site livré, sinon celle du site connu le plus proche. */
function regionDe(c: Commande): string | undefined {
  const site = c.siteId ? sitesStore.getById(c.siteId) : undefined
  if (site?.region) return site.region
  const avecRegion = sitesStore.actifs.filter(s => s.region)
  if (!avecRegion.length) return undefined
  return [...avecRegion].sort((a, b) => distanceKm(a, c) - distanceKm(b, c))[0]!.region
}

/* Mêmes règles que la planification : tracteur en état, en règle, non engagé,
   attelé à une semi-remorque en règle, libre et de capacité connue. */
function vehiculesDisponibles(): VehiculePropose[] {
  return vehicules.tracteurs.flatMap(t => {
    const srId = vehicules.attelageActif(t.id)?.semiRemorqueId
    const sr = srId ? vehicules.parId(srId) : undefined
    if (!sr?.chargeMaxKg || !vehicules.estUtilisable(t) || !docsVehicule.enRegle(t.id) || !docsVehicule.enRegle(sr.id)) return []
    if (voyages.vehiculeOccupe(t.id) || voyages.remorqueOccupee(sr.id)) return []
    const base = sitesStore.actifs.find(s => s.nom === t.site)
    return [{ id: t.id, libelle: t.immatriculation, semiRemorque: sr.immatriculation, capaciteKg: sr.chargeMaxKg, capaciteM3: sr.volumeMaxM3, lat: base?.lat, lng: base?.lng }]
  })
}

const vehiculesDispo = ref<VehiculePropose[]>(vehiculesDisponibles())
const entieres = (): CommandeProposee[] => commandesStore.enAttenteFret.map(c => ({
  id: c.id, libelle: `${c.destinataire}${c.referenceExterne ? ` (${c.referenceExterne})` : ''}`,
  poidsKg: c.poidsKg, volumeM3: c.volumeM3, nombreUnites: c.nombreUnites, lat: c.lat, lng: c.lng, region: regionDe(c), commande: c,
}))
const commandes = ref<CommandeProposee[]>(entieres())

/* Découpe d'une commande pour la place restante d'un véhicule : nombre d'unités (s'il est connu) et poids au
   prorata de cette place, volume au prorata du poids, calculé comme le fera la commande. */
let numeroPart = 0
const arrondi2 = (n: number) => Math.round(n * 100) / 100
function decouper(c: CommandeProposee, poidsMax: number, volumeMax?: number): { prise: CommandeProposee; reste: CommandeProposee } | null {
  if (!(c.poidsKg > 0)) return null
  let f = Math.min(1, poidsMax / c.poidsKg, volumeMax != null && c.volumeM3 ? volumeMax / c.volumeM3 : 1)
  if (f >= 1) return null
  for (let essai = 0; essai < 50 && f > 0; essai++) {
    let unites: number | undefined, prisePoids: number
    if (c.nombreUnites) {
      unites = Math.floor(c.nombreUnites * f)
      if (unites <= 0 || unites >= c.nombreUnites) return null
      prisePoids = Math.min(Math.floor(c.poidsKg * unites / c.nombreUnites), Math.floor(poidsMax))
    } else prisePoids = Math.floor(c.poidsKg * f)
    if (prisePoids <= 0 || prisePoids >= c.poidsKg) return null
    const restePoids = c.poidsKg - prisePoids
    const resteVol = c.volumeM3 != null ? arrondi2(c.volumeM3 * restePoids / c.poidsKg) : undefined
    const priseVol = c.volumeM3 != null ? arrondi2(c.volumeM3 - resteVol!) : undefined
    if (volumeMax != null && priseVol != null && priseVol > volumeMax) { f = f * 0.98; continue }
    numeroPart++
    const prise: CommandeProposee = { ...c, id: `${c.commande.id}#${numeroPart}a`, poidsKg: prisePoids, volumeM3: priseVol, nombreUnites: unites, partie: true }
    const reste: CommandeProposee = { ...c, id: `${c.commande.id}#${numeroPart}b`, poidsKg: restePoids, volumeM3: resteVol, nombreUnites: unites != null ? c.nombreUnites! - unites : undefined, partie: true }
    return { prise, reste }
  }
  return null
}

/* Affectation courante : véhicule de chaque commande, ou raison de son absence. */
const affectation = ref<Record<string, string>>({})
const raisons = ref<Record<string, string>>({})
function proposer() {
  numeroPart = 0
  const base = entieres()
  const p = proposerChargement(base, vehiculesDispo.value, { controle: props.controle, decouper })
  /* Les commandes réparties sont remplacées par leurs parts. */
  const placees = p.chargements.flatMap(ch => ch.commandes)
  commandes.value = [...placees, ...p.nonPlacees.map(n => n.commande)]
  affectation.value = Object.fromEntries(p.chargements.flatMap(ch => ch.commandes.map(c => [c.id, ch.vehicule.id])))
  raisons.value = Object.fromEntries(p.nonPlacees.map(n => [n.commande.id, n.raison]))
}
proposer()
/** Mention d'une part : « partie de la commande, 8 000 kg sur 30 000 kg ». */
const mentionPart = (c: CommandeProposee) => c.partie ? `partie de la commande (${nf(c.poidsKg)} kg sur ${nf(c.commande.poidsKg)} kg)` : ''

const chargements = computed(() => vehiculesDispo.value
  .map(v => decrireChargement(v, commandes.value.filter(c => affectation.value[c.id] === v.id)))
  .filter(ch => ch.commandes.length))
const nonPlacees = computed(() => commandes.value.filter(c => !affectation.value[c.id]))
const vehiculesVides = computed(() => vehiculesDispo.value.filter(v => !chargements.value.some(ch => ch.vehicule.id === v.id)))

/* Conducteur affecté au véhicule, s'il est disponible et en règle à la date prévue.
   Un même conducteur n'est retenu que pour un seul véhicule. */
const conducteurs = computed(() => {
  const retenus = new Map<string, { id: string; nom: string }>()
  const ecartes = new Map<string, string>()
  const pris = new Set<string>()
  chargements.value.forEach(ch => {
    const id = vehicules.affectationActive(ch.vehicule.id)?.conducteurId
    if (!id) { ecartes.set(ch.vehicule.id, 'aucun conducteur affecté au véhicule'); return }
    const nom = personnel.parId(id)?.nomComplet ?? ''
    if (pris.has(id)) { ecartes.set(ch.vehicule.id, `${nom} écarté : déjà retenu pour un autre véhicule`); return }
    const indispo = voyages.chauffeurIndisponible(id, datePlanifiee.value || undefined)
    if (indispo) { ecartes.set(ch.vehicule.id, `${nom} écarté : indisponible (${indispo})`); return }
    if (!docsPersonnel.enRegle(id)) { ecartes.set(ch.vehicule.id, `${nom} écarté : une pièce obligatoire n'est pas en règle`); return }
    pris.add(id)
    retenus.set(ch.vehicule.id, { id, nom })
  })
  return { retenus, ecartes }
})
const conducteurDe = (vehiculeId: string) => conducteurs.value.retenus.get(vehiculeId) ?? null
/** Pourquoi le conducteur du véhicule n'est pas retenu. */
const motifConducteur = (vehiculeId: string) => conducteurs.value.ecartes.get(vehiculeId) ?? ''

function retirer(commandeId: string) {
  affectation.value = { ...affectation.value, [commandeId]: '' }
  raisons.value = { ...raisons.value, [commandeId]: 'Retirée de la proposition.' }
  erreur.value = ''
}
/** Place dans un véhicule la partie d'une commande non placée qui tient dans sa place restante ; le reste demeure à placer. */
function placerPartie(commandeId: string, vehiculeId: string) {
  erreur.value = ''
  if (!vehiculeId) return
  const c = commandes.value.find(x => x.id === commandeId)
  const v = vehiculesDispo.value.find(x => x.id === vehiculeId)
  if (!c || !v) return
  const deja = commandes.value.filter(x => affectation.value[x.id] === vehiculeId)
  if (placePour(c, v, deja, props.controle).ok) { deplacer(commandeId, vehiculeId); return }
  const reste = placeRestante(v, deja)
  const d = reste.poidsKg > 0 && (reste.volumeM3 == null || reste.volumeM3 > 0) ? decouper(c, reste.poidsKg, reste.volumeM3) : null
  if (!d) { erreur.value = `${v.libelle} n'a plus de place pour une partie de cette commande.`; return }
  const r = placePour(d.prise, v, deja, props.controle)
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  commandes.value = commandes.value.flatMap(x => x.id === commandeId ? [d.prise, d.reste] : [x])
  const { [commandeId]: _a, ...aff } = affectation.value
  affectation.value = { ...aff, [d.prise.id]: vehiculeId, [d.reste.id]: '' }
  const { [commandeId]: _r, ...rs } = raisons.value
  raisons.value = { ...rs, [d.reste.id]: 'Reste de la commande, à placer.' }
}
function deplacer(commandeId: string, vehiculeId: string) {
  erreur.value = ''
  if (!vehiculeId) return
  const c = commandes.value.find(x => x.id === commandeId)
  const v = vehiculesDispo.value.find(x => x.id === vehiculeId)
  if (!c || !v) return
  const deja = commandes.value.filter(x => x.id !== commandeId && affectation.value[x.id] === vehiculeId)
  const r = placePour(c, v, deja, props.controle)
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  affectation.value = { ...affectation.value, [commandeId]: vehiculeId }
  const { [commandeId]: _, ...reste } = raisons.value
  raisons.value = reste
}

function couleurJauge(t: number) { return t > 100 ? 'bg-danger' : t >= 90 ? 'bg-warning' : 'bg-success' }
const nf = (n: number) => n.toLocaleString('fr-FR')
const unite = computed(() => useParametresPlanificationStore().parametres.uniteComptage)

function valider() {
  erreur.value = ''
  if (!datePlanifiee.value) { erreur.value = 'Renseignez la date prévue.'; return }
  if (!chargements.value.length) { erreur.value = 'Aucune commande n\'est placée dans un véhicule.'; return }
  /* Commandes réparties : chaque part placée devient une part de la commande (même référence) ;
     ce qui n'est pas placé reste une commande à livrer. */
  const reelle = new Map<string, string>()
  const parCommande = new Map<string, CommandeProposee[]>()
  commandes.value.forEach(c => parCommande.set(c.commande.id, [...(parCommande.get(c.commande.id) ?? []), c]))
  for (const [cid, items] of parCommande) {
    const placees = items.filter(i => affectation.value[i.id])
    const nonPlacee = items.some(i => !affectation.value[i.id])
    let courante = cid
    for (let k = 0; k < placees.length; k++) {
      const it = placees[k]!
      if (k === placees.length - 1 && !nonPlacee) { reelle.set(it.id, courante); break }
      const r = commandesStore.fractionner(courante, { poidsKg: it.poidsKg, nombreUnites: it.nombreUnites })
      if (!r.ok) { erreur.value = `${it.libelle} : ${r.motif}`; return }
      reelle.set(it.id, r.partId!)
      if (r.resteId) courante = r.resteId
    }
  }
  const crees: string[] = []
  const refus: string[] = []
  for (const ch of chargements.value) {
    const cond = conducteurDe(ch.vehicule.id)
    const ids = ch.commandes.map(c => reelle.get(c.id) ?? c.commande.id)
    const r = voyages.creerOrdreDepuisCommandes({
      vehiculeId: ch.vehicule.id, chauffeurId: cond?.id, chauffeurNom: cond?.nom,
      datePlanifiee: datePlanifiee.value,
    }, ids)
    if (r.ok) crees.push(r.id!)
    else { refus.push(`${ch.vehicule.libelle} : ${r.motif}`); ids.forEach(id => commandesStore.regrouper(id)) }
  }
  if (!crees.length) { erreur.value = refus.join(' '); return }
  emit('valide', crees, refus)
}
</script>

<template>
  <CreateModalShell title="Proposition de chargement" banner-label="Planification · Ordres de transport" create-label="Créer les ordres"
                    :save-error="erreur || null" @close="emit('close')" @create="valider">
    <template #form>
      <div class="max-w-4xl mx-auto w-full px-6 py-6 flex flex-col gap-4">
        <div class="flex items-end gap-4 flex-wrap">
          <div :class="F.field">
            <label :class="F.fieldLabel">Date prévue *</label>
            <input v-model="datePlanifiee" type="datetime-local" :class="F.fieldInput" class="!w-[220px]" />
          </div>
          <button v-if="commandes.length" class="ml-auto text-[12px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="emit('efface')">Effacer la proposition</button>
        </div>

        <p v-if="!commandes.length" class="text-[13px] text-muted-foreground italic">Aucune commande à livrer en attente.</p>
        <p v-else-if="!vehiculesDispo.length" class="text-[13px] text-danger">Aucun véhicule disponible : il faut un tracteur en règle, libre et attelé à une semi-remorque en règle dont la charge maximale est renseignée.</p>

        <div v-for="ch in chargements" :key="ch.vehicule.id" class="rounded-lg border border-border px-4 py-3">
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <Truck class="w-4 h-4 text-primary shrink-0" />
            <span class="text-[13px] font-semibold text-foreground">{{ ch.vehicule.libelle }}</span>
            <span class="text-[12px] text-muted-foreground">· {{ ch.vehicule.semiRemorque }} · {{ conducteurDe(ch.vehicule.id)?.nom || motifConducteur(ch.vehicule.id) }}</span>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-2.5 max-sm:grid-cols-1">
            <div>
              <div class="flex justify-between text-[11px] text-muted-foreground mb-1"><span>Poids</span><span>{{ nf(ch.poidsKg) }} / {{ nf(ch.vehicule.capaciteKg) }} kg ({{ ch.tauxPoids }} %)</span></div>
              <div class="h-1.5 rounded-full bg-border overflow-hidden"><div class="h-full" :class="couleurJauge(ch.tauxPoids)" :style="{ width: Math.min(ch.tauxPoids, 100) + '%' }"></div></div>
            </div>
            <div v-if="ch.tauxVolume != null">
              <div class="flex justify-between text-[11px] text-muted-foreground mb-1"><span>Volume</span><span>{{ nf(ch.volumeM3) }} / {{ nf(ch.vehicule.capaciteM3!) }} m³ ({{ ch.tauxVolume }} %)</span></div>
              <div class="h-1.5 rounded-full bg-border overflow-hidden"><div class="h-full" :class="couleurJauge(ch.tauxVolume)" :style="{ width: Math.min(ch.tauxVolume, 100) + '%' }"></div></div>
            </div>
          </div>
          <div v-for="(c, i) in ch.commandes" :key="c.id" class="flex items-center gap-2 py-1.5 border-t border-border text-[12px]">
            <span class="text-[11px] font-semibold text-muted-foreground w-5 shrink-0">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <span class="text-foreground">{{ c.libelle }}</span>
              <span class="text-muted-foreground"> · {{ c.commande.adresseLivraison }}<template v-if="c.region"> ({{ c.region }})</template> · {{ nf(c.poidsKg) }} kg<template v-if="c.volumeM3"> · {{ nf(c.volumeM3) }} m³</template><template v-if="c.nombreUnites"> · {{ nf(c.nombreUnites) }} {{ unite }}</template></span>
              <span v-if="c.partie" class="block text-[11px] text-info" data-partie>{{ mentionPart(c) }}</span>
            </div>
            <select v-if="vehiculesDispo.length > 1" :class="F.fieldSelect" class="!h-[30px] !text-[12px] !w-[150px] shrink-0" :value="''" @change="deplacer(c.id, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
              <option value="">Déplacer vers…</option>
              <option v-for="v in vehiculesDispo.filter(x => x.id !== ch.vehicule.id)" :key="v.id" :value="v.id">{{ v.libelle }}</option>
            </select>
            <button class="bg-transparent border-0 cursor-pointer text-muted-foreground hover:text-danger p-0.5 shrink-0" title="Retirer du véhicule" @click="retirer(c.id)"><X class="w-4 h-4" /></button>
          </div>
        </div>

        <div v-if="vehiculesVides.length && commandes.length" class="text-[12px] text-muted-foreground">
          Véhicules disponibles sans chargement : {{ vehiculesVides.map(v => `${v.libelle} (${nf(v.capaciteKg)} kg)`).join(', ') }}
        </div>

        <div v-if="nonPlacees.length" class="rounded-lg border border-warning/30 bg-warning-bg/40 px-4 py-3">
          <p class="text-[13px] font-semibold text-warning mb-1.5">Commandes non placées ({{ nonPlacees.length }})</p>
          <div v-for="c in nonPlacees" :key="c.id" class="flex items-center gap-2 py-1.5 border-t border-warning/20 first-of-type:border-t-0 text-[12px]">
            <div class="flex-1 min-w-0">
              <span class="text-foreground">{{ c.libelle }}</span>
              <span class="text-muted-foreground"> · {{ nf(c.poidsKg) }} kg<template v-if="c.volumeM3"> · {{ nf(c.volumeM3) }} m³</template><template v-if="c.nombreUnites"> · {{ nf(c.nombreUnites) }} {{ unite }}</template></span>
              <span v-if="c.partie" class="block text-[11px] text-info">{{ mentionPart(c) }}</span>
              <p class="text-[11px] text-warning">{{ raisons[c.id] }}</p>
            </div>
            <select v-if="vehiculesDispo.length" :class="F.fieldSelect" class="!h-[30px] !text-[12px] !w-[150px] shrink-0" :value="''" @change="deplacer(c.id, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
              <option value="">Placer dans…</option>
              <option v-for="v in vehiculesDispo" :key="v.id" :value="v.id">{{ v.libelle }}</option>
            </select>
            <select v-if="vehiculesDispo.length" :class="F.fieldSelect" class="!h-[30px] !text-[12px] !w-[190px] shrink-0" data-placer-partie :value="''" @change="placerPartie(c.id, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
              <option value="">Placer une partie dans…</option>
              <option v-for="v in vehiculesDispo" :key="v.id" :value="v.id">{{ v.libelle }}</option>
            </select>
          </div>
        </div>
      </div>
    </template>
  </CreateModalShell>
</template>
