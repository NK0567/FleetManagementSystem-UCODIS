<script setup lang="ts">
/**
 * Fiche d'un ordre de transport - à la fois l'écran de création et
 * celui de consultation/édition, en une seule fiche en superposition,
 * pour qu'il n'y ait jamais l'impression de changer d'écran entre les
 * deux : la création n'affiche que la section Générale ; valider la
 * création fait immédiatement apparaître la section Lignes de
 * livraison à la suite, sans fermer ni rouvrir quoi que ce soit.
 *
 * Un ordre n'est jamais figé à un seul client : le destinataire se
 * rattache à chaque ligne, jamais à l'ordre lui-même, si bien que la
 * section Générale ne porte plus de champ Client. Une ligne peut aussi
 * bien être une livraison chez un client qu'un transfert entre deux
 * sites internes.
 *
 * Planifier affecte l'ordre au chauffeur, qui en est notifié : il n'y a
 * pas d'étape où il accepterait ou refuserait. L'ordre passe de
 * lui-même en cours dès que le chauffeur signe sa première livraison,
 * depuis son espace. Annuler reste réservé au planificateur, jamais
 * une action possible depuis l'espace du chauffeur.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import FleetMap from './FleetMap.vue'
import {
  AlertCircle, ArrowDown, ArrowUp, CalendarClock, CheckCircle2, Circle,
  FileCheck, Mail, MapPin, Package, ShieldAlert, Smartphone, Star, Truck, UserCheck, X, XCircle,
} from '@lucide/vue'
import * as cls from '../../lib/formClasses'
import { useVoyagesStore } from '../../stores/voyages'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useTrajetsStore } from '../../stores/trajets'
import { useSitesStore } from '../../stores/sites'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { StatutVoyage, EtapeVoyage, Voyage } from '../../types'

const props = defineProps<{ voyages: Voyage[]; voyageId: string }>()
const emit = defineEmits<{ close: []; created: [id: string] }>()

const store = useVoyagesStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const trajets = useTrajetsStore()
const sitesStore = useSitesStore()
const docsVehicule = useDocumentsVehiculeStore()

/** Chaîne vide = fiche en création : aucun enregistrement n'existe
 *  encore. Dès la création validée, idCourant prend l'identifiant du
 *  nouvel ordre et la même fiche continue, inchangée à l'écran. */
const idCourant = ref(props.voyageId)
const enCreation = computed(() => !idCourant.value)
const courant = computed<Voyage | null>(() => (idCourant.value ? store.getById(idCourant.value) ?? null : null))

const STATUTS: Record<StatutVoyage, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-warning-bg text-warning' },
  planifie: { label: 'Planifié', cls: 'bg-info-bg text-info' },
  affecte: { label: 'Affecté', cls: 'bg-primary/10 text-primary' },
  en_cours: { label: 'En cours', cls: 'bg-primary/10 text-primary' },
  livre: { label: 'Terminé', cls: 'bg-success-bg text-success' },
  cloture: { label: 'Clôturé', cls: 'bg-neutral-bg text-neutral' },
  litige: { label: 'En litige', cls: 'bg-danger-bg text-danger' },
  annule: { label: 'Annulé', cls: 'bg-danger-bg text-danger' },
}

/** Les lignes, comme le général, ne se modifient qu'avant le
 *  déclenchement de l'exécution : une fois « en cours », seul le
 *  chauffeur fait progresser la tournée, en recueillant les
 *  signatures. */
const modifiable = computed(() => enCreation.value || courant.value?.statut === 'en_attente')
const peutAnnuler = computed(() => courant.value && courant.value.statut !== 'livre' && courant.value.statut !== 'cloture' && courant.value.statut !== 'annule')

const pageTitle = computed(() => {
  if (enCreation.value) return 'Nouvel ordre de transport'
  return courant.value ? `${courant.value.numeroOT || courant.value.reference} · ${courant.value.clientNom}` : ''
})

/* ── Navigation entre fiches, comme partout ailleurs dans l'application ── */
const index = computed(() => props.voyages.findIndex(v => v.id === idCourant.value))
const hasPrev = computed(() => !enCreation.value && index.value > 0)
const hasNext = computed(() => !enCreation.value && index.value >= 0 && index.value < props.voyages.length - 1)
const currentNo = computed(() => courant.value?.numeroOT || courant.value?.reference || null)
const sidebarItems = computed(() => props.voyages.map(v => ({ no: v.numeroOT || v.reference, label: v.clientNom })))
function goPrev() { if (hasPrev.value) idCourant.value = props.voyages[index.value - 1]!.id }
function goNext() { if (hasNext.value) idCourant.value = props.voyages[index.value + 1]!.id }
function selectSidebar(no: string) { const v = props.voyages.find(x => (x.numeroOT || x.reference) === no); if (v) idCourant.value = v.id }

/* ── Général : champs communs à la création et à l'édition ───────── */
const enEdition = ref(true)
const form = ref({
  vehiculeId: '', datePlanifiee: '', numeroOT: '', typeProduit: 'Produits alimentaires secs', poidsChargeKg: 0,
})
watch(courant, v => {
  if (!v) return
  form.value = {
    vehiculeId: v.vehiculeId ?? '', datePlanifiee: v.datePlanifiee,
    numeroOT: v.numeroOT ?? '', typeProduit: v.marchandise.typeProduit, poidsChargeKg: v.marchandise.poidsChargeKg,
  }
  enEdition.value = false
}, { immediate: true })

const chauffeur = computed(() => {
  if (!form.value.vehiculeId) return null
  const af = vehicules.affectationActive(form.value.vehiculeId)
  return af ? personnel.parId(af.conducteurId)?.nomComplet ?? null : null
})
const semiRemorque = computed(() => {
  if (!form.value.vehiculeId) return null
  const at = vehicules.attelageActif(form.value.vehiculeId)
  return at ? vehicules.parId(at.semiRemorqueId)?.immatriculation ?? null : null
})

const vehiculesEcartes = computed(() =>
  vehicules.tracteurs
    .filter(t => !docsVehicule.enRegle(t.id))
    .map(t => ({
      plaque: t.immatriculation,
      motif: docsVehicule.documentsDe(t.id).filter(d => docsVehicule.etat(d) === 'expire').map(d => d.type).join(', ') || 'document expiré',
    })))
const optVehicules = computed<DropdownItem[]>(() =>
  vehicules.tracteurs.filter(t => docsVehicule.enRegle(t.id)).map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))
const optProduits: DropdownItem[] = [
  { id: 'Produits alimentaires secs', label: 'Produits alimentaires secs' },
  { id: 'Produits ménagers', label: 'Produits ménagers' },
  { id: 'Boissons', label: 'Boissons' },
  { id: 'Textile', label: 'Textile' },
  { id: 'Matériaux de construction', label: 'Matériaux de construction' },
]

const blocages = computed(() => {
  const out: string[] = []
  if (form.value.vehiculeId && !chauffeur.value) out.push("Ce véhicule n'a aucun conducteur affecté : affectez un conducteur avant de continuer.")
  return out
})

function enterEdit() { enEdition.value = true }
function cancelEdit() { enEdition.value = false }

/** Valide la section Générale : crée l'ordre s'il n'existe pas encore
 *  (la fiche continue alors, sans se fermer), ou met à jour l'existant. */
const erreur = ref('')
function save() {
  erreur.value = ''
  if (!form.value.vehiculeId) { erreur.value = 'Choisissez un véhicule.'; return }
  if (!form.value.datePlanifiee) { erreur.value = 'Renseignez la date prévue.'; return }
  if (!chauffeur.value) { erreur.value = 'Ce véhicule doit avoir un conducteur affecté.'; return }

  const vehicule = vehicules.parId(form.value.vehiculeId)
  const af = vehicules.affectationActive(form.value.vehiculeId)
  const at = vehicules.attelageActif(form.value.vehiculeId)

  if (enCreation.value) {
    const id = store.creerRapide({
      vehiculeId: form.value.vehiculeId, vehiculePlaque: vehicule?.immatriculation ?? '',
      chauffeurId: af?.conducteurId, chauffeurNom: chauffeur.value ?? undefined,
      semiRemorqueId: at?.semiRemorqueId, semiRemorquePlaque: semiRemorque.value ?? undefined,
      datePlanifiee: form.value.datePlanifiee,
      numeroOT: form.value.numeroOT, typeProduit: form.value.typeProduit, poidsChargeKg: form.value.poidsChargeKg,
    })
    idCourant.value = id
    emit('created', id)
    return
  }

  const v = courant.value
  if (!v) return
  v.vehiculeId = form.value.vehiculeId
  v.vehiculePlaque = vehicule?.immatriculation
  v.chauffeurId = af?.conducteurId
  v.chauffeurNom = chauffeur.value ?? undefined
  v.semiRemorqueId = at?.semiRemorqueId
  v.semiRemorquePlaque = semiRemorque.value ?? undefined
  v.datePlanifiee = form.value.datePlanifiee
  v.numeroOT = form.value.numeroOT || undefined
  v.marchandise.typeProduit = form.value.typeProduit
  v.marchandise.poidsChargeKg = form.value.poidsChargeKg
  enEdition.value = false
}

/* ── Lignes de livraison : chaque ligne porte son propre destinataire,
     client ou transfert entre sites internes, jamais l'ordre entier.
     Brouillon local tant que l'ordre reste modifiable, pour permettre
     d'ajouter et de réordonner sans écrire à chaque geste ; une fois
     verrouillé, l'affichage relit directement la donnée du store, pour
     rester à jour même si le chauffeur signe une livraison pendant que
     la fiche reste ouverte. ── */
const lignesLocales = ref<EtapeVoyage[]>([])
watch(courant, v => { lignesLocales.value = v?.etapes ? [...v.etapes].sort((a, b) => a.ordre - b.ordre) : [] }, { immediate: true })
const lignesAffichees = computed(() => modifiable.value ? lignesLocales.value : [...(courant.value?.etapes ?? [])].sort((a, b) => a.ordre - b.ordre))

const typeLigne = ref<'client' | 'transfert'>('client')
const nouvelleLigne = ref({ destinataire: '', adresse: '', siteId: '' })
const optSites = computed<DropdownItem[]>(() => sitesStore.actifs.map(s => ({ id: s.id, label: s.nom, sublabel: s.ville })))
const clientsConnus = computed(() => [...new Set(trajets.trajets.map(t => t.clientNom))])

/** Aucune adresse client réelle n'est géocodée dans cette maquette :
 *  la position est simulée autour du dépôt, pour que la carte reste
 *  lisible plutôt que pour représenter une localisation exacte. */
function positionSimulee() {
  const base = sitesStore.sites.find(s => s.code === 'DEP-TNJ')
  const lat = (base?.lat ?? -18.8792) + (Math.random() - 0.5) * 0.6
  const lng = (base?.lng ?? 47.5079) + (Math.random() - 0.5) * 0.6
  return { lat, lng }
}

function ajouterLigne() {
  if (!courant.value) return
  let ligne: EtapeVoyage
  if (typeLigne.value === 'client') {
    if (!nouvelleLigne.value.destinataire.trim() || !nouvelleLigne.value.adresse.trim()) return
    const { lat, lng } = positionSimulee()
    ligne = {
      id: `${courant.value.id}-L${Date.now()}`, ordre: lignesLocales.value.length + 1,
      siteNom: nouvelleLigne.value.adresse.trim(), destinataire: nouvelleLigne.value.destinataire.trim(),
      adresseLivraison: nouvelleLigne.value.adresse.trim(), lat, lng, role: 'livraison', intervalleMin: 0, franchi: false,
    }
  } else {
    const site = sitesStore.getById(nouvelleLigne.value.siteId)
    if (!site) return
    ligne = {
      id: `${courant.value.id}-L${Date.now()}`, ordre: lignesLocales.value.length + 1,
      siteId: site.id, siteNom: site.nom, lat: site.lat, lng: site.lng, role: 'livraison', intervalleMin: 0, franchi: false,
    }
  }
  lignesLocales.value = [...lignesLocales.value, ligne]
  nouvelleLigne.value = { destinataire: '', adresse: '', siteId: '' }
  enregistrerLignes()
}
function retirerLigne(id: string) {
  lignesLocales.value = lignesLocales.value.filter(l => l.id !== id)
  enregistrerLignes()
}
function deplacerLigne(id: string, sens: -1 | 1) {
  const i = lignesLocales.value.findIndex(l => l.id === id)
  const j = i + sens
  if (i < 0 || j < 0 || j >= lignesLocales.value.length) return
  const copie = [...lignesLocales.value]
  ;[copie[i], copie[j]] = [copie[j]!, copie[i]!]
  lignesLocales.value = copie
  enregistrerLignes()
}
function enregistrerLignes() {
  if (!courant.value) return
  store.definirLignes(courant.value.id, lignesLocales.value)
}

const marqueursCarte = computed(() => lignesAffichees.value.map((l, i) => ({
  id: l.id, lat: l.lat, lng: l.lng, libelle: `${i + 1}. ${l.destinataire ?? l.siteNom}`,
  couleur: l.franchi ? '#16a34a' : '#94a3b8', numero: i + 1,
})))

/* ── Communication client : notifications et bon de livraison
   électronique, générés automatiquement par le store à la
   planification et à chaque signature. ─────────────────────────── */
const lignesAvecDestinataire = computed(() => lignesAffichees.value.filter(l => l.destinataire))
const totalNotifications = computed(() => lignesAvecDestinataire.value.reduce((s, l) => s + (l.notifications?.length ?? 0), 0))
const totalEBL = computed(() => lignesAvecDestinataire.value.filter(l => l.eBL).length)
const eBLOuvert = ref<string | null>(null)
const eBLCourant = computed(() => lignesAffichees.value.find(l => l.id === eBLOuvert.value)?.eBL ?? null)

/* ── Actions : planifier (déclenche l'exécution) et annuler ──────── */
function planifier() {
  if (!courant.value) return
  const res = store.planifier(courant.value.id)
  if (!res.ok) alert(res.motif)
}

const annulationOuverte = ref(false)
const motifAnnulation = ref('')
function annuler() {
  if (!courant.value || !motifAnnulation.value.trim()) return
  const res = store.annuler(courant.value.id, motifAnnulation.value)
  if (!res.ok) { alert(res.motif); return }
  annulationOuverte.value = false
  motifAnnulation.value = ''
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="courant?.numeroOT || courant?.reference"
    banner-label="Ordre de transport"
    :is-edit-mode="enEdition"
    :sidebar-items="sidebarItems"
    :current-no="currentNo"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-title-new-button="false"
    hide-action-bar
    :has-unsaved-changes="enEdition"
    @close="emit('close')"
    @enter-edit="enterEdit"
    @cancel-edit="cancelEdit"
    @save="save"
    @go-prev="goPrev"
    @go-next="goNext"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span v-if="courant" class="text-[11px] font-medium px-2.5 py-[3px] rounded-full" :class="STATUTS[courant.statut].cls">{{ STATUTS[courant.statut].label }}</span>
      <span v-else class="text-[11px] font-medium px-2.5 py-[3px] rounded-full bg-warning-bg text-warning">Nouvel ordre</span>
    </template>

    <template #form>
      <div class="px-8 py-5 max-w-6xl mx-auto">

        <div v-if="courant && (courant.statut === 'en_attente' || peutAnnuler)" class="flex items-center justify-end gap-2 mb-3.5">
          <button v-if="peutAnnuler" :class="cls.btnOutline" class="!text-danger !border-danger/30 hover:!bg-danger-bg" @click="annulationOuverte = true">
            <XCircle class="w-4 h-4" /> Annuler
          </button>
          <button v-if="courant.statut === 'en_attente'" :class="cls.btnPrimary" :disabled="!lignesAffichees.length" @click="planifier">
            <CalendarClock class="w-4 h-4" /> Plan
          </button>
        </div>
        <p v-if="courant?.statut === 'en_attente' && !lignesAffichees.length" class="text-[11px] text-warning text-right -mt-2.5 mb-3.5">
          Ajoutez au moins une ligne de livraison avant de planifier cet ordre.
        </p>
        <p v-if="courant?.statut === 'en_attente' && lignesAffichees.length > 0" class="text-[11px] text-muted-foreground text-right -mt-2.5 mb-3.5">
          Planifier affecte l'ordre au chauffeur, qui en est notifié : il passe en cours dès qu'il signe sa première livraison.
        </p>

        <!-- Annulation -->
        <div v-if="annulationOuverte" class="flex flex-col gap-2 bg-danger-bg rounded-lg px-4 py-3 mb-3.5">
          <p class="text-xs text-danger font-medium">Annuler cet ordre de transport</p>
          <textarea v-model="motifAnnulation" rows="2" :class="cls.fieldTextarea" placeholder="Motif de l'annulation (obligatoire)…"></textarea>
          <div class="flex justify-end gap-2">
            <button :class="cls.btnOutline" @click="annulationOuverte = false; motifAnnulation = ''">Renoncer</button>
            <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90" :disabled="!motifAnnulation.trim()" @click="annuler">Confirmer l'annulation</button>
          </div>
        </div>

        <!-- GÉNÉRAL -->
        <FormSection title="Général" :recaps="courant ? [courant.vehiculePlaque, courant.chauffeurNom] : []" :default-open="true">
          <p v-if="enCreation" class="text-[12px] text-muted-foreground mb-3.5 -mt-1">
            Les lignes de livraison - le ou les destinataires notamment - se complètent juste après, à la suite de ce même formulaire.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4 mb-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Véhicule</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant?.vehiculePlaque ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Chauffeur</label>
              <div class="h-[38px] px-2.5 rounded-md border flex items-center text-[13px]"
                   :class="(enEdition && modifiable ? chauffeur : courant?.chauffeurNom) ? 'bg-primary/5 border-primary/20 text-primary font-medium' : 'bg-background border-border text-muted-foreground'">
                <UserCheck v-if="enEdition && modifiable ? chauffeur : courant?.chauffeurNom" class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <AlertCircle v-else class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span class="truncate">{{ (enEdition && modifiable ? chauffeur : courant?.chauffeurNom) ?? 'Aucune affectation' }}</span>
              </div>
              <span class="text-[10px] text-muted-foreground">Déduit de l'affectation</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Date prévue</label>
              <input v-if="enEdition && modifiable" v-model="form.datePlanifiee" type="datetime-local" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant ? fmtDateHeure(courant.datePlanifiee) : '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">N° ordre de transport</label>
              <input v-if="enEdition && modifiable" v-model="form.numeroOT" :class="cls.fieldInput" placeholder="OT-2026-…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant?.numeroOT ?? '-' }}</div>
            </div>
          </div>

          <p v-if="enEdition && modifiable && vehiculesEcartes.length" class="text-[12px] text-warning leading-relaxed mb-4">
            {{ vehiculesEcartes.length }} véhicule(s) écarté(s) pour pièce administrative expirée :
            {{ vehiculesEcartes.map(v => `${v.plaque} (${v.motif})`).join(' · ') }}
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Destinataires</label>
              <div class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate">{{ courant?.clientNom ?? 'Aucune ligne' }}</div>
              <span class="text-[10px] text-muted-foreground">Calculé à partir des lignes ci-dessous</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Marchandise</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.typeProduit" :items="optProduits" placeholder="Sélectionner…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate">{{ courant?.marchandise.typeProduit ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Semi-remorque</label>
              <div class="h-[38px] px-2.5 rounded-md bg-background border border-border flex items-center text-[13px] text-muted-foreground truncate">
                {{ (enEdition && modifiable ? semiRemorque : courant?.semiRemorquePlaque) ?? 'Aucun attelage' }}
              </div>
              <span class="text-[10px] text-muted-foreground">Déduite de l'attelage</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Poids chargé (kg)</label>
              <input v-if="enEdition && modifiable" v-model.number="form.poidsChargeKg" type="number" min="0" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant?.marchandise.poidsChargeKg ?? 0 }} kg</div>
            </div>
          </div>

          <div v-if="blocages.length" class="flex flex-col gap-1.5 mt-4">
            <div v-for="b in blocages" :key="b" class="flex items-center gap-2 rounded-lg px-3 py-2 bg-danger-bg text-danger">
              <ShieldAlert class="w-4 h-4 shrink-0" />
              <p class="text-xs flex-1">{{ b }}</p>
            </div>
          </div>
          <p v-if="erreur" class="text-[12px] text-danger flex items-center gap-1.5 mt-3">
            <AlertCircle class="w-3.5 h-3.5" /> {{ erreur }}
          </p>

          <div v-if="enEdition && modifiable" class="flex justify-end mt-4">
            <button :class="cls.btnPrimary" @click="save">{{ enCreation ? "Créer l'ordre" : 'Enregistrer' }}</button>
          </div>
        </FormSection>

        <!-- LIGNES DE LIVRAISON : n'apparaît qu'une fois l'ordre créé -->
        <FormSection v-if="courant" title="Lignes de livraison" :recaps="[`${lignesAffichees.length} ligne(s)`, courant.clientNom]" :default-open="true">
          <p class="text-[12px] text-muted-foreground mb-3.5 leading-relaxed">
            Un ordre n'est jamais figé à un seul client : chaque ligne porte son propre destinataire, une livraison
            chez un client ou un transfert entre deux sites internes.
          </p>

          <div v-if="!lignesAffichees.length" class="text-xs text-muted-foreground py-2 mb-3">Aucune ligne pour l'instant.</div>
          <div v-else class="flex flex-col gap-1.5 mb-4">
            <div v-for="(l, i) in lignesAffichees" :key="l.id" class="flex items-center gap-2.5 rounded-md px-3 py-2.5"
                 :class="l.franchi ? 'bg-success-bg' : 'bg-background'">
              <component :is="l.franchi ? CheckCircle2 : Circle" class="w-4 h-4 shrink-0" :class="l.franchi ? 'text-success' : 'text-muted-foreground'" />
              <span class="text-[11px] font-semibold text-muted-foreground w-5">{{ i + 1 }}</span>
              <component :is="l.destinataire ? Package : MapPin" class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div class="flex-1 min-w-0">
                <span class="text-xs text-foreground font-medium">{{ l.destinataire ?? l.siteNom }}</span>
                <span v-if="l.destinataire" class="text-[11px] text-muted-foreground"> · {{ l.adresseLivraison }}</span>
                <span v-else class="text-[11px] text-muted-foreground"> · transfert interne</span>
              </div>
              <span v-if="l.franchi" class="text-[11px] text-success shrink-0">Signée</span>
              <button v-if="l.eBL" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer shrink-0" @click="eBLOuvert = l.id">Voir le e-BL</button>
              <template v-if="modifiable">
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-foreground hover:bg-border/40 shrink-0" :disabled="i === 0" @click="deplacerLigne(l.id, -1)"><ArrowUp class="w-3.5 h-3.5" /></button>
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-foreground hover:bg-border/40 shrink-0" :disabled="i === lignesAffichees.length - 1" @click="deplacerLigne(l.id, 1)"><ArrowDown class="w-3.5 h-3.5" /></button>
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-danger hover:bg-danger-bg shrink-0" @click="retirerLigne(l.id)"><X class="w-3.5 h-3.5" /></button>
              </template>
            </div>
          </div>

          <div v-if="marqueursCarte.length" class="rounded-lg overflow-hidden border border-border mb-4">
            <FleetMap :marqueurs="marqueursCarte" height="260px" />
          </div>
          <p v-if="lignesAffichees.some(l => l.destinataire)" class="text-[11px] text-muted-foreground -mt-2.5 mb-4">
            Position simulée pour les livraisons client, cette maquette ne géocode pas d'adresse réelle.
          </p>

          <template v-if="modifiable">
            <div class="flex items-center gap-1.5 mb-3">
              <button :class="typeLigne === 'client' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="typeLigne = 'client'">
                <Package class="w-3.5 h-3.5" /> Livraison client
              </button>
              <button :class="typeLigne === 'transfert' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="typeLigne = 'transfert'">
                <Truck class="w-3.5 h-3.5" /> Transfert interne
              </button>
            </div>

            <div v-if="typeLigne === 'client'" class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Destinataire</label>
                <input v-model="nouvelleLigne.destinataire" :class="cls.fieldInput" placeholder="Nom du client…" list="clients-connus" />
                <datalist id="clients-connus">
                  <option v-for="c in clientsConnus" :key="c" :value="c" />
                </datalist>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Adresse de livraison</label>
                <input v-model="nouvelleLigne.adresse" :class="cls.fieldInput" placeholder="Adresse…" />
              </div>
              <button :class="cls.btnPrimary" :disabled="!nouvelleLigne.destinataire.trim() || !nouvelleLigne.adresse.trim()" @click="ajouterLigne">Ajouter</button>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Site interne</label>
                <SearchableDropdown v-model="nouvelleLigne.siteId" :items="optSites" placeholder="Choisir un site…" />
              </div>
              <button :class="cls.btnPrimary" :disabled="!nouvelleLigne.siteId" @click="ajouterLigne">Ajouter</button>
            </div>
          </template>
        </FormSection>

        <!-- COMMUNICATION CLIENT : notifications, e-BL, enquête de satisfaction -->
        <FormSection v-if="courant && lignesAvecDestinataire.length" title="Communication client" :recaps="[`${totalNotifications} notification(s)`, `${totalEBL} e-BL`]" :default-open="false">
          <p class="text-[12px] text-muted-foreground mb-3.5 leading-relaxed">
            Chaque destinataire reçoit automatiquement une notification au démarrage de la tournée, puis à sa
            livraison, avec le bon de livraison électronique et une enquête de satisfaction facultative. Aucun
            canal SMS ou e-mail réel n'est branché : ces envois restent simulés dans cette maquette.
          </p>
          <div class="flex flex-col gap-3">
            <div v-for="l in lignesAvecDestinataire" :key="l.id" class="rounded-lg border border-border px-3.5 py-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-foreground">{{ l.destinataire }}</span>
              </div>
              <div v-if="!l.notifications?.length" class="text-[11px] text-muted-foreground">Aucune notification envoyée pour l'instant.</div>
              <div v-else class="flex flex-col gap-1.5">
                <div v-for="n in l.notifications" :key="n.id" class="flex items-start gap-2 text-[11px]">
                  <component :is="n.canal === 'sms' ? Smartphone : Mail" class="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-px" />
                  <div class="flex-1">
                    <span class="text-muted-foreground">{{ fmtDateHeure(n.envoyeeLe) }} · </span>
                    <span class="text-foreground">{{ n.contenu }}</span>
                  </div>
                </div>
              </div>

              <div v-if="l.satisfactionEnvoyeeLe" class="mt-2.5 pt-2.5 border-t border-border/60">
                <div v-if="l.satisfactionNote != null" class="flex items-center gap-2">
                  <div class="flex items-center gap-0.5">
                    <Star v-for="n in 5" :key="n" class="w-3.5 h-3.5" :class="n <= l.satisfactionNote! ? 'fill-warning text-warning' : 'text-border'" />
                  </div>
                  <span class="text-[11px] text-muted-foreground">{{ l.satisfactionNote }}/5</span>
                </div>
                <p v-if="l.satisfactionCommentaire" class="text-[11px] text-foreground italic mt-1">« {{ l.satisfactionCommentaire }} »</p>
                <span v-if="l.satisfactionNote == null" class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-info-bg text-info inline-block mt-0.5">Enquête envoyée · en attente de réponse</span>
              </div>
            </div>
          </div>
        </FormSection>

      </div>
    </template>
  </CardModalShell>

  <!-- Bon de livraison électronique -->
  <div v-if="eBLCourant" class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4" @click.self="eBLOuvert = null">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden">
      <div class="bg-primary px-5 py-3.5 flex items-center justify-between">
        <h3 class="text-white font-semibold flex items-center gap-2"><FileCheck class="w-4 h-4" /> Bon de livraison électronique</h3>
        <button class="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer" @click="eBLOuvert = null"><X class="w-5 h-5" /></button>
      </div>
      <div class="p-5 flex flex-col gap-3">
        <div class="text-center pb-3 border-b border-border">
          <p class="font-mono text-sm font-semibold text-foreground">{{ eBLCourant.reference }}</p>
          <p class="text-[11px] text-muted-foreground">émis le {{ fmtDateHeure(eBLCourant.emisLe) }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Destinataire</div>{{ eBLCourant.destinataire }}</div>
          <div><div class="text-muted-foreground text-[11px]">Ordre de transport</div><span class="font-mono">{{ courant?.numeroOT || courant?.reference }}</span></div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Adresse de livraison</div>{{ eBLCourant.adresse }}</div>
          <div><div class="text-muted-foreground text-[11px]">Marchandise</div>{{ eBLCourant.produit }}</div>
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ courant?.vehiculePlaque }}</span></div>
        </div>
        <div class="bg-success-bg text-success rounded-md px-3 py-2 flex items-center gap-2 text-[11px]">
          <FileCheck class="w-4 h-4 shrink-0" /> Signé électroniquement par {{ eBLCourant.signePar }}
        </div>
      </div>
    </div>
  </div>
</template>
