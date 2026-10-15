<script setup lang="ts">
/**
 * Fiche véhicule : Identification, Moteur et carburant (tracteur) ou
 * Remorque, Statut et liaisons, Documents, Acquisition, Équipements
 * embarqués, Carnet d'entretien, Journal télématique, Cycle de vie.
 */
import { devise } from '../../lib/monnaie'
import { ref, computed, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import StatusPill from '../ui/StatusPill.vue'
import UserAvatar from '../ui/UserAvatar.vue'
import { Archive, CircleCheck, ImagePlus, TriangleAlert, X } from '@lucide/vue'
import * as cls from '../../lib/formClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useTelematiqueStore, LIB_FAMILLE_EVENEMENT } from '../../stores/telematique'
import { LIB_GRAVITE, LIB_NATURE } from '../../stores/ecarts'
import { aujourdhuiISO, dansNJours, maintenant } from '../../utils/horloge'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useTypesVehiculesStore } from '../../stores/typesVehicules'
import { useTypesEquipementsStore } from '../../stores/typesEquipements'
import { useStatutsVehiculesStore } from '../../stores/statutsVehicules'
import { useCoutsVehiculesStore } from '../../stores/coutsVehicules'
import { usePrestatairesStore } from '../../stores/prestataires'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
import { useSitesStore } from '../../stores/sites'
import { useAuthStore } from '../../stores/auth'
import { etatEcheance } from '../../utils/helpers'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import { LIB_SOUS_SYSTEME, LIB_STATUT_OT } from '../../types/maintenance'
import type { StatutOT } from '../../types/maintenance'
import type { Vehicule, StatutVehicule, TypeEquipement, EtatEquipement } from '../../types'

const props = defineProps<{ vehicules: Vehicule[]; vehiculeId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useVehiculeStore()
const personnel = usePersonnelStore()
const maintenance = useMaintenanceStore()
const telematique = useTelematiqueStore()
const router = useRouter()
const typesVeh = useTypesVehiculesStore()
const typesEq = useTypesEquipementsStore()
const statuts = useStatutsVehiculesStore()
const couts = useCoutsVehiculesStore()
const prestataires = usePrestatairesStore()
const codification = useCodificationIndispoStore()
const sites = useSitesStore()
const auth = useAuthStore()
const moi = computed(() => auth.user?.nom ?? 'Utilisateur')
const motorise = computed(() => !!courant.value && typesVeh.estMotorise(courant.value.type))
const avecCompartiments = computed(() => !!courant.value && typesVeh.aCompartiments(courant.value.type))
const cause = computed(() => courant.value ? statuts.causeDe(courant.value.id) : undefined)
const tco = computed(() => courant.value ? couts.coutDePossession(courant.value.id) : null)

/* Retour d'une action, affiché en tête de fiche. */
const erreur = ref(''); const succes = ref('')
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? (r.motif ? `${msg} ${r.motif}` : msg) : ''; return r.ok }

/* ── Statut choisi à la main, sous les règles du statut (FMS-DB-02) ── */
const statutVise = ref<'' | 'hors_service' | 'immobilise' | 'en_maintenance' | 'disponible'>('')
const statutMotif = ref(''); const statutCode = ref('')
const optCodes = computed<DropdownItem[]>(() => codification.codes.map(c => ({ id: c.code, label: `${c.code} · ${c.libelle}` })))
function appliquerStatut() {
  if (!courant.value || !statutVise.value) return
  if (resultat(statuts.choisir(courant.value.id, statutVise.value, { motif: statutMotif.value, code: statutCode.value }), 'Statut mis à jour.')) { statutVise.value = ''; statutMotif.value = ''; statutCode.value = '' }
}

/* ── Immatriculation (FMS-DB-04) ── */
const nouvelleImmat = ref(''); const motifImmat = ref(''); const immatOuverte = ref(false)
function changerImmat() {
  if (!courant.value) return
  if (resultat(store.changerImmatriculation(courant.value.id, nouvelleImmat.value, moi.value, motifImmat.value), 'Immatriculation modifiée, l\'ancienne reste dans l\'historique.')) { nouvelleImmat.value = ''; motifImmat.value = ''; immatOuverte.value = false }
}

/* ── Photos (FMS-DB-01) ── */
function ajouterPhotos(ev: Event) {
  const fichiers = (ev.target as HTMLInputElement).files; if (!fichiers || !courant.value) return
  const id = courant.value.id
  Array.from(fichiers).forEach(f => {
    if (!f.type.startsWith('image/')) { erreur.value = `${f.name} n'est pas une image.`; return }
    if (f.size > 3_000_000) { erreur.value = `${f.name} dépasse 3 Mo.`; return }
    const lecteur = new FileReader()
    lecteur.onload = () => store.ajouterPhoto(id, { nom: f.name, dataUrl: String(lecteur.result) })
    lecteur.readAsDataURL(f)
  })
  ;(ev.target as HTMLInputElement).value = ''
}

/* ── Compartiments d'une citerne (FMS-PA-01) ── */
const compartimentsSaisis = ref<{ volumeL: number }[]>([])
const volumeTotal = computed(() => (courant.value?.compartiments ?? []).reduce((s, c) => s + c.volumeL, 0))
function enregistrerCompartiments() {
  if (!courant.value) return
  resultat(store.definirCompartiments(courant.value.id, compartimentsSaisis.value.map((c, i) => ({ numero: i + 1, volumeL: Number(c.volumeL) }))), 'Compartiments enregistrés.')
}

/* ── Équipements embarqués (FMS-DB-05) ── */
const nouvelEq = ref({ type: '', numeroSerie: '', echeance: '' })
const optTypesEq = computed<DropdownItem[]>(() => typesEq.types.filter(t => t.actif).map(t => ({ id: t.code, label: t.libelle, sublabel: t.avecEcheance ? 'avec échéance' : undefined })))
function ajouterEquipement() {
  if (!courant.value) return
  if (resultat(store.ajouterEquipement({ vehiculeId: courant.value.id, type: nouvelEq.value.type, numeroSerie: nouvelEq.value.numeroSerie || undefined, echeance: nouvelEq.value.echeance || undefined, installeLe: maintenant().toISOString().slice(0, 10) }), 'Équipement ajouté.'))
    nouvelEq.value = { type: '', numeroSerie: '', echeance: '' }
}
function etatEcheanceEq(e: { echeance?: string }) { return e.echeance ? etatEcheance(e.echeance, 30) : null }
/** Échéance d'un équipement modifiée sur sa ligne. */
function modifierEcheanceEq(id: string, ev: Event) {
  const champ = ev.target as HTMLInputElement
  const e = store.equipements.find(x => x.id === id)
  if (!resultat(store.modifierEquipement(id, { echeance: champ.value || undefined }), 'Échéance mise à jour.')) champ.value = e?.echeance ?? ''
}

/* ── Documents du véhicule (FMS-SC-01) : état calculé à la consultation ── */
const docsVeh = useDocumentsVehiculeStore()
const documents = computed(() => courant.value ? docsVeh.documentsDe(courant.value.id) : [])
/** Pièces obligatoires sans aucun document enregistré. */
const piecesManquantes = computed(() => courant.value ? docsVeh.manquants(courant.value.id).filter(t => !documents.value.some(d => d.type === t.code)) : [])
const documentsHorsRegle = computed(() => documents.value.filter(d => ['expire', 'annule', 'perdu'].includes(docsVeh.etat(d))).length)

/* ── Acquisition (FMS-DB-06) ── */
const optTiers = computed<DropdownItem[]>(() => prestataires.prestataires.filter(p => p.autorise).map(p => ({ id: p.id, label: p.nom, sublabel: prestataires.types.find(t => t.code === p.type)?.libelle })))
const optBases = computed<DropdownItem[]>(() => sites.actifs.map(x => ({ id: x.nom, label: x.nom, sublabel: x.type })))

/* ── Journal télématique (FMS-GP-01) : événements remontés et écarts, par période ── */
const journalDu = ref(dansNJours(-30))
const journalAu = ref(aujourdhuiISO())
const journalFamille = ref('')
const LIB_JOURNAL: Record<string, string> = { ...LIB_FAMILLE_EVENEMENT, ecart: 'Écart de trajet' }
const journal = computed(() => {
  if (!courant.value || journalDu.value > journalAu.value) return []
  return telematique.journal(courant.value.id, journalDu.value, `${journalAu.value}T23:59:59`).filter(l => !journalFamille.value || l.famille === journalFamille.value)
})
function ouvrirLigneJournal(l: { route: string; query: Record<string, string> }) { emit('close'); router.push({ name: l.route, query: l.query }) }

const STATUTS: Record<StatutVehicule, string> = store.LIBELLES_STATUT

const idCourant = ref(props.vehiculeId)
watch(() => props.vehiculeId, v => { idCourant.value = v; enEdition.value = false })
watch(idCourant, () => { erreur.value = ''; succes.value = ''; statutVise.value = ''; immatOuverte.value = false })

/* Un véhicule qui quitte la liste affichée (par exemple après sa sortie du parc) reste ouvert. */
const courant = computed<Vehicule | null>(() => props.vehicules.find(v => v.id === idCourant.value) ?? store.parId(idCourant.value) ?? null)
watch(courant, v => { compartimentsSaisis.value = (v?.compartiments ?? []).map(c => ({ volumeL: c.volumeL })) }, { immediate: true })
const index = computed(() => props.vehicules.findIndex(v => v.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.vehicules.length - 1)
const sidebarItems = computed(() => props.vehicules.map(v => ({ no: v.immatriculation, label: `${v.marque} ${v.modele}` })))
const currentNo = computed(() => courant.value?.immatriculation ?? null)
const estSorti = computed(() => courant.value?.statut === 'sorti')

function goPrev() { if (hasPrev.value) { idCourant.value = props.vehicules[index.value - 1]!.id; enEdition.value = false } }
function goNext() { if (hasNext.value) { idCourant.value = props.vehicules[index.value + 1]!.id; enEdition.value = false } }
function selectSidebar(no: string) {
  const v = props.vehicules.find(x => x.immatriculation === no)
  if (v) { idCourant.value = v.id; enEdition.value = false }
}

const enEdition = ref(false)
const form = ref({
  immatriculation: '', marque: '', modele: '', categorie: '', carburant: '',
  chargeMaxKg: undefined as number | undefined, site: '',
  kilometrage: 0, annee: undefined as number | undefined, capaciteReservoirL: undefined as number | undefined,
  dateMiseEnCirculation: '', modeAcquisition: 'achat' as NonNullable<Vehicule['modeAcquisition']>,
  coutAcquisitionAr: undefined as number | undefined, valeurResiduelleAr: undefined as number | undefined,
  prestataireAcquisitionId: '', mensualiteAr: undefined as number | undefined, dateAcquisition: '',
})

function enterEdit() {
  const v = courant.value
  if (!v) return
  form.value = {
    immatriculation: v.immatriculation, marque: v.marque, modele: v.modele,
    categorie: v.categorie, carburant: v.carburant, chargeMaxKg: v.chargeMaxKg,
    site: v.site, kilometrage: v.kilometrage, annee: v.annee, capaciteReservoirL: v.capaciteReservoirL, dateMiseEnCirculation: v.dateMiseEnCirculation ?? '',
    modeAcquisition: v.modeAcquisition ?? 'achat', coutAcquisitionAr: v.coutAcquisitionAr, valeurResiduelleAr: v.valeurResiduelleAr,
    prestataireAcquisitionId: v.prestataireAcquisitionId ?? '', mensualiteAr: v.mensualiteAr, dateAcquisition: v.dateAcquisition ?? '',
  }
  erreur.value = ''; succes.value = ''
  enEdition.value = true
}
function cancelEdit() { enEdition.value = false }
function save() {
  const v = courant.value
  if (!v) return
  const f = form.value
  if (!f.marque.trim() || !f.modele.trim()) { erreur.value = 'La marque et le modèle sont obligatoires.'; return }
  if (f.kilometrage < v.kilometrage) { erreur.value = `Le kilométrage ne peut pas baisser (dernier relevé : ${v.kilometrage.toLocaleString('fr-FR')} km).`; return }
  for (const [lib, val] of [['coût d\'acquisition', f.coutAcquisitionAr], ['valeur résiduelle', f.valeurResiduelleAr], ['mensualité', f.mensualiteAr], ['charge maximale', f.chargeMaxKg]] as const)
    if (val != null && (val as number) < 0) { erreur.value = `La ${lib} ne peut pas être négative.`; return }
  if (f.modeAcquisition !== 'achat' && !f.mensualiteAr) { erreur.value = 'Un leasing ou une location porte une mensualité.'; return }
  if (f.kilometrage !== v.kilometrage) (v.relevesKm ??= []).push({ le: maintenant().toISOString(), km: f.kilometrage, source: 'Saisie manuelle' })
  const { immatriculation: _i, ...reste } = f
  Object.assign(v, { ...reste, prestataireAcquisitionId: f.prestataireAcquisitionId || undefined, dateAcquisition: f.dateAcquisition || undefined,
    mensualiteAr: f.modeAcquisition === 'achat' ? undefined : f.mensualiteAr })
  erreur.value = ''; succes.value = 'Fiche enregistrée.'
  enEdition.value = false
}

const attelage = computed(() => (courant.value ? store.attelageDe(courant.value.id) : null))
const vehiculeAttele = computed(() => {
  const at = attelage.value
  if (!at || !courant.value) return null
  const autreId = at.tracteurId === courant.value.id ? at.semiRemorqueId : at.tracteurId
  return store.parId(autreId)
})
const affectation = computed(() => (courant.value ? store.affectationActive(courant.value.id) : null))
const conducteurAffecte = computed(() => (affectation.value ? personnel.parId(affectation.value.conducteurId) : null))

const equipements = computed(() => (courant.value ? store.equipementsDe(courant.value.id) : []))
const equipementsHS = computed(() => equipements.value.filter(e => e.etat !== 'operationnel').length)
const interventions = computed(() => (courant.value ? maintenance.ordresDuVehicule(courant.value.id) : []))
/* Historique lu par sous-système, avec pièces et main-d'œuvre (FMS-MA-11). */
const carnetSousSysteme = ref('')
const sousSystemesCarnet = computed(() => [...new Set(interventions.value.map(o => o.sousSysteme).filter(Boolean))] as string[])
const interventionsCarnet = computed(() => interventions.value.filter(o => !carnetSousSysteme.value || o.sousSysteme === carnetSousSysteme.value))
const totauxCarnet = computed(() => interventionsCarnet.value.reduce((t, o) => ({
  pieces: t.pieces + maintenance.coutPieces(o), mo: t.mo + (maintenance.coutMainOeuvre(o) ?? 0), externe: t.externe + maintenance.coutSousTraitance(o),
}), { pieces: 0, mo: 0, externe: 0 }))
const joursImmobilise = computed(() =>
  (courant.value ? maintenance.indisposDuVehicule(courant.value.id) : []).reduce((s, i) => s + maintenance.dureeIndispo(i), 0))

const CLS_STATUT_OT: Record<StatutOT, string> = {
  ouvert: 'bg-info-bg text-info', diagnostique: 'bg-primary/10 text-primary',
  attente_piece: 'bg-warning-bg text-warning', en_cours: 'bg-primary/10 text-primary',
  attente_validation: 'bg-warning-bg text-warning', cloture: 'bg-success-bg text-success', annule: 'bg-neutral-bg text-neutral',
}
const LIB_ETAT_EQUIPEMENT: Record<EtatEquipement, { label: string; cls: string }> = {
  operationnel: { label: 'Opérationnel', cls: 'bg-success-bg text-success' },
  hors_service: { label: 'Hors service', cls: 'bg-danger-bg text-danger' },
  desinstalle: { label: 'Désinstallé', cls: 'bg-neutral-bg text-neutral' },
}

const pageTitle = computed(() =>
  courant.value ? `${courant.value.immatriculation} · ${courant.value.marque} ${courant.value.modele}` : '',
)
const lecture = 'text-[13px] text-foreground bg-background border border-border rounded-md px-2.5 h-[38px] flex items-center'
function fmtAr(n?: number) { return n != null ? `${n.toLocaleString('fr-FR')} ${devise()}` : '-' }

const optAcquisition: DropdownItem[] = [{ id: 'achat', label: 'Achat' }, { id: 'location', label: 'Location' }, { id: 'leasing', label: 'Leasing' }]
const libAcquisition = (m?: string) => optAcquisition.find(o => o.id === m)?.label ?? '-'

/* ── Cycle de vie : sortie du parc, avec une date et un motif (FMS-DB-07) ── */
const sortieOuverte = ref(false)
const formSortie = ref({ motif: '', date: aujourdhuiISO(), par: '', kilometrageSortie: undefined as number | undefined, commentaire: '' })
const obstacleSortie = computed(() => {
  if (!courant.value) return null
  if (attelage.value) return 'Dételez ce véhicule avant de le sortir du parc.'
  if (affectation.value) return 'Retirez son affectation avant de le sortir du parc.'
  return null
})
const erreurSortie = ref('')
function ouvrirSortie() {
  formSortie.value = { motif: '', date: aujourdhuiISO(), par: '', kilometrageSortie: courant.value?.kilometrage, commentaire: '' }
  erreurSortie.value = ''
  sortieOuverte.value = true
}
function confirmerSortie() {
  if (!courant.value) return
  const r = store.sortirDuParc(courant.value.id, { ...formSortie.value })
  if (!r.ok) { erreurSortie.value = r.motif ?? ''; return }
  sortieOuverte.value = false
  succes.value = 'Véhicule sorti du parc.'; erreur.value = ''
}
</script>

<template>
  <CardModalShell
    v-if="courant"
    :page-title="pageTitle"
    :page-number="courant.immatriculation"
    banner-label="Fiche véhicule"
    :is-edit-mode="enEdition"
    :sidebar-items="sidebarItems"
    :current-no="currentNo"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :has-unsaved-changes="enEdition"
    hide-action-bar
    @close="emit('close')"
    @enter-edit="enterEdit"
    @cancel-edit="cancelEdit"
    @save="save"
    @go-prev="goPrev"
    @go-next="goNext"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <StatusPill :statut="courant.statut" :libelle="STATUTS[courant.statut]" />
      <span class="text-[11px] font-medium px-2.5 py-[3px] rounded-full bg-primary/10 text-primary">
        {{ typesVeh.libelle(courant.type) }}
      </span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-4xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <!-- 1. IDENTIFICATION -->
        <FormSection title="Identification" :recaps="[courant.immatriculation, `${courant.marque} ${courant.modele}`.trim()]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Identifiant interne</label>
              <div :class="lecture" class="font-mono text-xs">{{ courant.id }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Immatriculation</label>
              <div :class="lecture" class="justify-between">
                <span>{{ courant.immatriculation }}</span>
                <button v-if="!estSorti" class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer" @click="immatOuverte = !immatOuverte">Changer</button>
              </div>
            </div>
            <div v-if="immatOuverte" class="col-span-2 max-sm:col-span-1 grid grid-cols-[1fr_1fr_auto] gap-2 items-end max-sm:grid-cols-1">
              <div :class="cls.field"><label :class="cls.fieldLabel">Nouvelle immatriculation *</label><input v-model="nouvelleImmat" :class="cls.fieldInput" class="uppercase" /></div>
              <div :class="cls.field"><label :class="cls.fieldLabel">Motif</label><input v-model="motifImmat" :class="cls.fieldInput" placeholder="Ré-immatriculation" /></div>
              <button :class="cls.btnPrimary" @click="changerImmat">Enregistrer</button>
            </div>
            <div v-if="courant.historiqueImmatriculations?.length" class="col-span-2 max-sm:col-span-1">
              <label :class="cls.fieldLabel">Immatriculations précédentes</label>
              <div v-for="h in courant.historiqueImmatriculations" :key="h.le" class="text-xs py-1 border-b border-border/60">
                <span class="font-mono">{{ h.ancienne }}</span> remplacée par <span class="font-mono">{{ h.nouvelle }}</span> le {{ formatDate(h.le) }}, par {{ h.par }}<template v-if="h.motif"> · {{ h.motif }}</template>
              </div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">VIN (numéro de châssis)</label>
              <div :class="lecture" class="font-mono text-xs">{{ courant.vin }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Marque</label>
              <input v-if="enEdition" v-model="form.marque" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.marque }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Modèle</label>
              <input v-if="enEdition" v-model="form.modele" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.modele }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Année</label>
              <input v-if="enEdition" v-model.number="form.annee" type="number" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.annee ?? '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Mise en circulation</label>
              <input v-if="enEdition" v-model="form.dateMiseEnCirculation" type="date" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.dateMiseEnCirculation ? formatDate(courant.dateMiseEnCirculation) : '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Catégorie</label>
              <input v-if="enEdition" v-model="form.categorie" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.categorie }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Base</label>
              <SearchableDropdown v-if="enEdition" v-model="form.site" :items="optBases" placeholder="Choisir la base" />
              <div v-else :class="lecture">{{ courant.site }}</div>
            </div>
          </div>
          <div class="mt-4">
            <label :class="cls.fieldLabel">Photos</label>
            <div class="flex flex-wrap gap-2 mt-1">
              <div v-for="(ph, i) in courant.photos ?? []" :key="i" class="relative w-24 h-20 rounded-md overflow-hidden border border-border bg-background">
                <img v-if="ph.dataUrl" :src="ph.dataUrl" :alt="ph.nom" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] p-1 block">{{ ph.nom }}</span>
                <button class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white border-0 cursor-pointer flex items-center justify-center" title="Retirer" @click="store.retirerPhoto(courant.id, i)"><X class="w-3 h-3" /></button>
              </div>
              <label class="w-24 h-20 rounded-md border border-dashed border-border flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground cursor-pointer hover:border-primary hover:text-primary">
                <ImagePlus class="w-4 h-4" /> Ajouter
                <input type="file" accept="image/*" multiple class="hidden" @change="ajouterPhotos" />
              </label>
            </div>
          </div>
        </FormSection>

        <!-- 2. MOTEUR & CARBURANT (tracteur) -->
        <FormSection v-if="motorise" title="Moteur & Carburant">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Charge maximale (poids total roulant autorisé)</label>
              <input v-if="enEdition" v-model.number="form.chargeMaxKg" type="number" min="0" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.chargeMaxKg ? `${courant.chargeMaxKg.toLocaleString('fr-FR')} kg` : '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Carburant</label>
              <input v-if="enEdition" v-model="form.carburant" :class="cls.fieldInput" placeholder="Ex. Diesel" />
              <div v-else :class="lecture">{{ courant.carburant }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Kilométrage</label>
              <input v-if="enEdition" v-model.number="form.kilometrage" type="number" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.kilometrage.toLocaleString('fr-FR') }} km</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Capacité du réservoir</label>
              <input v-if="enEdition" v-model.number="form.capaciteReservoirL" type="number" min="0" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.capaciteReservoirL ? `${courant.capaciteReservoirL} L` : '-' }}</div>
            </div>
          </div>
          <div v-if="courant.relevesKm?.length" class="mt-3">
            <label :class="cls.fieldLabel">Derniers relevés</label>
            <div v-for="r in [...courant.relevesKm].reverse().slice(0, 5)" :key="r.le" class="text-xs py-1 border-b border-border/60">
              {{ formatDate(r.le) }} · {{ r.km.toLocaleString('fr-FR') }} km · {{ r.source }}<template v-if="r.voyageRef"> {{ r.voyageRef }}</template>
            </div>
          </div>
        </FormSection>

        <!-- 2b. REMORQUE (semi-remorque) -->
        <FormSection v-else :title="avecCompartiments ? 'Citerne' : 'Remorque'" :recaps="avecCompartiments ? [`${courant.compartiments?.length ?? 0} compartiment(s)`, `${volumeTotal.toLocaleString('fr-FR')} L`] : []">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Charge maximale autorisée</label>
              <input v-if="enEdition" v-model.number="form.chargeMaxKg" type="number" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.chargeMaxKg ? `${courant.chargeMaxKg.toLocaleString('fr-FR')} kg` : '-' }}</div>
            </div>
            <div v-if="courant.volumeMaxM3" :class="cls.field">
              <label :class="cls.fieldLabel">Volume utile</label>
              <div :class="lecture">{{ courant.volumeMaxM3 }} m³</div>
            </div>
          </div>
          <div v-if="avecCompartiments" class="mt-4">
            <label :class="cls.fieldLabel">Compartiments</label>
            <div v-for="(c, i) in compartimentsSaisis" :key="i" class="flex items-center gap-2 mt-1.5">
              <span class="text-xs w-28">Compartiment {{ i + 1 }}</span>
              <input v-model.number="c.volumeL" type="number" min="1" :class="cls.fieldInput" class="!w-[140px] !h-[32px]" />
              <span class="text-xs text-muted-foreground">L</span>
              <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="compartimentsSaisis.splice(i, 1)">Retirer</button>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Volume total enregistré : {{ volumeTotal.toLocaleString('fr-FR') }} L</p>
            <div class="flex gap-2 mt-2">
              <button :class="cls.btnOutline" @click="compartimentsSaisis.push({ volumeL: 0 })">Ajouter un compartiment</button>
              <button :class="cls.btnPrimary" @click="enregistrerCompartiments">Enregistrer les compartiments</button>
            </div>
          </div>
        </FormSection>

        <!-- 3. STATUT & LIAISONS -->
        <FormSection title="Statut & Liaisons" :recaps="[STATUTS[courant.statut], vehiculeAttele?.immatriculation]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Statut opérationnel</label>
              <div :class="lecture"><StatusPill v-if="!estSorti" :statut="courant.statut" :libelle="STATUTS[courant.statut]" /><span v-else>-</span></div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Statut administratif</label>
              <div :class="lecture">{{ statuts.statutAdministratif(courant) }}</div>
            </div>
            <div class="col-span-2 max-sm:col-span-1" :class="cls.field">
              <label :class="cls.fieldLabel">Cause</label>
              <div :class="lecture" class="!h-auto min-h-[38px] py-2 flex-wrap gap-1.5">
                <template v-if="cause">
                  <span v-if="cause.code" class="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-background border border-border">{{ cause.code }}</span>
                  <span>{{ cause.libelle }}</span>
                  <span v-if="cause.depuis" class="text-muted-foreground">depuis le {{ formatDate(cause.depuis) }}</span>
                  <RouterLink v-if="cause.ordreTravail" :to="{ name: 'maintenance-ordres', query: { ot: cause.ordreTravail } }" class="text-primary hover:underline">{{ cause.ordreTravail }}</RouterLink>
                </template>
                <span v-else class="text-muted-foreground">-</span>
              </div>
            </div>
            <div v-if="!estSorti" class="col-span-2 max-sm:col-span-1 grid grid-cols-[180px_1fr_auto] gap-2 items-end max-sm:grid-cols-1">
              <div :class="cls.field">
                <label :class="cls.fieldLabel">Changer le statut</label>
                <select v-model="statutVise" :class="cls.fieldSelect">
                  <option value="">Choisir…</option>
                  <option value="disponible">Disponible</option>
                  <option value="en_maintenance">En maintenance</option>
                  <option value="immobilise">Immobilisé</option>
                  <option value="hors_service">Hors service</option>
                </select>
              </div>
              <div v-if="statutVise === 'immobilise' || statutVise === 'en_maintenance'" class="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                <div :class="cls.field"><label :class="cls.fieldLabel">Cause codifiée{{ statutVise === 'immobilise' ? ' *' : '' }}</label><SearchableDropdown v-model="statutCode" :items="optCodes" placeholder="Code" /></div>
                <div :class="cls.field"><label :class="cls.fieldLabel">{{ statutVise === 'en_maintenance' ? 'Panne constatée *' : 'Commentaire' }}</label><input v-model="statutMotif" :class="cls.fieldInput" /></div>
              </div>
              <div v-else-if="statutVise === 'hors_service'" :class="cls.field"><label :class="cls.fieldLabel">Motif *</label><input v-model="statutMotif" :class="cls.fieldInput" /></div>
              <div v-else></div>
              <button :class="cls.btnPrimary" :disabled="!statutVise" @click="appliquerStatut">Appliquer</button>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">{{ motorise ? 'Remorque attelée' : 'Tracteur attelé' }}</label>
              <div :class="lecture">{{ vehiculeAttele?.immatriculation ?? 'Aucun attelage en cours' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Conducteur affecté</label>
              <div :class="lecture" class="gap-2">
                <template v-if="conducteurAffecte"><UserAvatar :nom="conducteurAffecte.nomComplet" taille="sm" />{{ conducteurAffecte.nomComplet }}</template>
                <span v-else class="text-muted-foreground italic">Non affecté</span>
              </div>
            </div>
          </div>
        </FormSection>

        <!-- DOCUMENTS -->
        <FormSection title="Documents" :recaps="[`${documents.length} document(s)`, piecesManquantes.length ? `${piecesManquantes.length} manquant(s)` : '', documentsHorsRegle ? `${documentsHorsRegle} hors validité` : '']">
          <div v-if="!documents.length && !piecesManquantes.length" class="text-xs text-muted-foreground py-2">Aucun document enregistré pour ce véhicule.</div>
          <div v-for="d in documents" :key="d.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span class="min-w-0 truncate">{{ docsVeh.libelle(d) }}<span v-if="d.numero" class="font-mono text-[11px] text-muted-foreground"> · {{ d.numero }}</span></span>
            <span class="flex items-center gap-2 shrink-0">
              <span class="text-muted-foreground">{{ d.echeance ? formatDate(d.echeance) : 'sans échéance' }}</span>
              <StatusPill :statut="docsVeh.etat(d)" />
            </span>
          </div>
          <div v-for="t in piecesManquantes" :key="t.code" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span>{{ t.libelle }}</span>
            <StatusPill statut="absent" libelle="Manquant" />
          </div>
          <RouterLink :to="{ name: 'flotte-documents-vehicule' }" class="text-[11px] text-primary hover:underline mt-2 inline-block">Ajouter un document</RouterLink>
        </FormSection>

        <!-- 4. ACQUISITION -->
        <FormSection title="Acquisition">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Mode d'acquisition</label>
              <SearchableDropdown v-if="enEdition" v-model="form.modeAcquisition" :items="optAcquisition" />
              <div v-else :class="lecture">{{ libAcquisition(courant.modeAcquisition) }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Coût d'acquisition</label>
              <input v-if="enEdition" v-model.number="form.coutAcquisitionAr" type="number" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ fmtAr(courant.coutAcquisitionAr) }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Valeur résiduelle</label>
              <input v-if="enEdition" v-model.number="form.valeurResiduelleAr" type="number" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ fmtAr(courant.valeurResiduelleAr) }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Tiers associé</label>
              <SearchableDropdown v-if="enEdition" v-model="form.prestataireAcquisitionId" :items="optTiers" placeholder="Vendeur, banque, loueur" />
              <div v-else :class="lecture">{{ prestataires.getById(courant.prestataireAcquisitionId)?.nom ?? '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Date d'acquisition</label>
              <input v-if="enEdition" v-model="form.dateAcquisition" type="date" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.dateAcquisition ? formatDate(courant.dateAcquisition) : '-' }}</div>
            </div>
            <div v-if="(enEdition ? form.modeAcquisition : courant.modeAcquisition) !== 'achat'" :class="cls.field">
              <label :class="cls.fieldLabel">Mensualité</label>
              <input v-if="enEdition" v-model.number="form.mensualiteAr" type="number" min="0" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ fmtAr(courant.mensualiteAr) }}</div>
            </div>
          </div>
          <div v-if="tco" class="mt-4">
            <label :class="cls.fieldLabel">Coût total de possession</label>
            <div class="grid grid-cols-3 gap-2 mt-1 max-sm:grid-cols-2">
              <div v-for="[lib, val] in ([['Acquisition', tco.acquisition], ['Maintenance', tco.maintenance], ['Carburant', tco.carburant], ['Pneus', tco.pneus], ['Assurances et sinistres', tco.assurances]] as [string, number][])" :key="lib" class="bg-background border border-border rounded-md px-2.5 py-2">
                <div class="text-[10px] text-muted-foreground">{{ lib }}</div><div class="text-xs font-semibold">{{ fmtAr(val) }}</div>
              </div>
              <div class="bg-primary/10 border border-primary/30 rounded-md px-2.5 py-2">
                <div class="text-[10px] text-primary">Total</div><div class="text-xs font-bold text-primary">{{ fmtAr(tco.total) }}</div>
              </div>
            </div>
          </div>
        </FormSection>

        <!-- 5. ÉQUIPEMENTS EMBARQUÉS -->
        <FormSection title="Équipements embarqués"
                     :recaps="[`${equipements.length} équipement(s)`, equipementsHS ? `${equipementsHS} hors service` : 'tous opérationnels']">
          <div v-if="!equipements.length" class="text-xs text-muted-foreground py-2">Aucun équipement enregistré pour ce véhicule.</div>
          <table v-else class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Équipement</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">N° série</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Échéance</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">État</th>
            </tr></thead>
            <tbody>
              <tr v-for="e in equipements" :key="e.id" class="border-b border-border/60">
                <td class="py-2 text-xs">{{ typesEq.libelle(e.type) }}</td>
                <td class="py-2 text-[11px] font-mono">{{ e.numeroSerie ?? '-' }}</td>
                <td class="py-2 text-xs">
                  <div class="flex items-center gap-1.5">
                    <input :value="e.echeance ?? ''" type="date" class="text-[11px] h-[26px] rounded border border-border bg-background px-1" @change="modifierEcheanceEq(e.id, $event)" />
                    <StatusPill v-if="etatEcheanceEq(e)" :statut="etatEcheanceEq(e)!" />
                  </div>
                </td>
                <td class="py-2">
                  <select :value="e.etat" class="text-[11px] h-[26px] rounded border border-border bg-background px-1" @change="ev => resultat(store.modifierEquipement(e.id, { etat: (ev.target as HTMLSelectElement).value as EtatEquipement }), 'Équipement mis à jour.')">
                    <option v-for="(lib, k) in LIB_ETAT_EQUIPEMENT" :key="k" :value="k">{{ lib.label }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end mt-3 max-sm:grid-cols-1">
            <div :class="cls.field"><label :class="cls.fieldLabel">Équipement</label><SearchableDropdown v-model="nouvelEq.type" :items="optTypesEq" placeholder="Type" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">N° de série</label><input v-model="nouvelEq.numeroSerie" :class="cls.fieldInput" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Échéance{{ typesEq.get(nouvelEq.type)?.avecEcheance ? ' *' : '' }}</label><input v-model="nouvelEq.echeance" type="date" :class="cls.fieldInput" /></div>
            <button :class="cls.btnOutline" @click="ajouterEquipement">Ajouter</button>
          </div>
        </FormSection>

        <!-- 6. CARNET D'ENTRETIEN -->
        <FormSection title="Carnet d'entretien" :recaps="[`${interventions.length} intervention(s)`, joursImmobilise ? `${joursImmobilise} j immobilisé` : '']" :default-open="false">
          <div v-if="!interventions.length" class="text-xs text-muted-foreground py-2">Aucune intervention enregistrée pour ce véhicule.</div>
          <template v-else>
          <div class="flex items-center gap-2 mb-2">
            <label :class="cls.fieldLabel">Sous-système</label>
            <select v-model="carnetSousSysteme" :class="cls.fieldSelect" class="!h-[30px] !text-xs !w-[220px]">
              <option value="">Tous</option>
              <option v-for="ss in sousSystemesCarnet" :key="ss" :value="ss">{{ LIB_SOUS_SYSTEME[ss as keyof typeof LIB_SOUS_SYSTEME] ?? ss }}</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2 mb-2 max-sm:grid-cols-1">
            <div class="rounded-md bg-background px-2.5 py-1.5"><p class="text-[11px] text-muted-foreground">Pièces</p><p class="text-xs font-semibold">{{ fmtAr(totauxCarnet.pieces) }}</p></div>
            <div class="rounded-md bg-background px-2.5 py-1.5"><p class="text-[11px] text-muted-foreground">Main-d'œuvre</p><p class="text-xs font-semibold">{{ fmtAr(totauxCarnet.mo) }}</p></div>
            <div class="rounded-md bg-background px-2.5 py-1.5"><p class="text-[11px] text-muted-foreground">Atelier externe et reprise</p><p class="text-xs font-semibold">{{ fmtAr(totauxCarnet.externe) }}</p></div>
          </div>
          <table class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Date</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Ordre</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Diagnostic</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Statut</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Km</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Coût</th>
            </tr></thead>
            <tbody>
              <tr v-for="o in interventionsCarnet" :key="o.id" class="border-b border-border/60">
                <td class="py-2 text-xs">{{ fmtDateHeure(o.declareLe) }}</td>
                <td class="py-2 text-[11px] font-mono">{{ o.reference }}</td>
                <td class="py-2 text-xs">{{ o.sousSysteme ? LIB_SOUS_SYSTEME[o.sousSysteme] : 'à diagnostiquer' }}</td>
                <td class="py-2"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="CLS_STATUT_OT[o.statut]">{{ LIB_STATUT_OT[o.statut] }}</span></td>
                <td class="py-2 text-xs">{{ o.kilometrage ? o.kilometrage.toLocaleString('fr-FR') : '-' }}</td>
                <td class="py-2 text-xs">{{ fmtAr(maintenance.coutOT(o)) }}<div class="text-[10px] text-muted-foreground">Pièces {{ fmtAr(maintenance.coutPieces(o)) }} · Main-d'œuvre {{ fmtAr(maintenance.coutMainOeuvre(o) ?? 0) }}</div></td>
              </tr>
            </tbody>
          </table>
          </template>
          <RouterLink :to="{ name: 'maintenance-ordres' }" class="text-[11px] text-primary hover:underline mt-2 inline-block">Voir tous les ordres de travail →</RouterLink>
        </FormSection>

        <!-- JOURNAL TÉLÉMATIQUE -->
        <FormSection v-if="typesVeh.estMotorise(courant.type)" title="Journal télématique" :recaps="[`${journal.length} événement(s)`]" :default-open="false">
          <div class="flex flex-wrap items-end gap-2 mb-3">
            <div class="flex flex-col gap-1"><label :class="cls.fieldLabel">Du</label><input v-model="journalDu" type="date" :class="cls.fieldInput" class="!h-[32px] !text-xs" /></div>
            <div class="flex flex-col gap-1"><label :class="cls.fieldLabel">Au</label><input v-model="journalAu" type="date" :class="cls.fieldInput" class="!h-[32px] !text-xs" /></div>
            <div class="flex flex-col gap-1"><label :class="cls.fieldLabel">Famille</label>
              <select v-model="journalFamille" :class="cls.fieldSelect" class="!h-[32px] !text-xs">
                <option value="">Toutes</option>
                <option v-for="(l, k) in LIB_JOURNAL" :key="k" :value="k">{{ l }}</option>
              </select>
            </div>
          </div>
          <p v-if="journalDu > journalAu" class="text-[11px] text-danger mb-2">La date de début suit la date de fin.</p>
          <div v-else-if="!journal.length" class="text-xs text-muted-foreground py-2">Aucun événement sur la période.</div>
          <table v-else class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Date</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Événement</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Lieu</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Conducteur</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Gravité</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Qualification</th>
            </tr></thead>
            <tbody>
              <tr v-for="l in journal" :key="l.id" class="border-b border-border/60 cursor-pointer hover:bg-background" @click="ouvrirLigneJournal(l)">
                <td class="py-2 text-xs whitespace-nowrap">{{ fmtDateHeure(l.date) }}</td>
                <td class="py-2 text-xs"><span class="font-medium">{{ l.libelle }}</span><div v-if="l.detail" class="text-[11px] text-muted-foreground">{{ l.detail }}</div></td>
                <td class="py-2 text-xs">{{ l.lieu ?? '-' }}</td>
                <td class="py-2 text-xs">{{ l.conducteurNom ?? '-' }}</td>
                <td class="py-2"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE[l.gravite].cls">{{ LIB_GRAVITE[l.gravite].label }}</span></td>
                <td class="py-2">
                  <span v-if="l.nature" class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="LIB_NATURE[l.nature].cls">{{ LIB_NATURE[l.nature].label }}</span>
                  <span v-else class="text-xs text-muted-foreground">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        <!-- 7. CYCLE DE VIE -->
        <FormSection title="Cycle de vie">
          <div v-if="estSorti && courant.sortie" class="flex flex-col gap-3">
            <div class="bg-background rounded-lg px-3.5 py-3 border border-border">
              <p class="text-sm font-semibold text-foreground">{{ courant.sortie.motif }}</p>
              <p class="text-xs text-muted-foreground mt-1">
                Sorti du parc le {{ formatDate(courant.sortie.date) }}, par {{ courant.sortie.par }}.
                <template v-if="courant.sortie.kilometrageSortie">Compteur figé à {{ courant.sortie.kilometrageSortie.toLocaleString('fr-FR') }} km.</template>
              </p>
              <p v-if="courant.sortie.commentaire" class="text-xs text-muted-foreground mt-1.5 leading-relaxed">{{ courant.sortie.commentaire }}</p>
            </div>
          </div>
          <div v-else class="flex flex-col gap-2">
            <p v-if="obstacleSortie" class="text-[11px] text-warning flex items-start gap-1.5">{{ obstacleSortie }}</p>
            <button :class="cls.btnOutline" class="self-start" :disabled="!!obstacleSortie" @click="ouvrirSortie"><Archive class="w-4 h-4" /> Sortir du parc</button>
          </div>
        </FormSection>

      </div>
    </template>
  </CardModalShell>

  <!-- Formulaire de sortie du parc -->
  <div v-if="sortieOuverte" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4" @click.self="sortieOuverte = false">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden">
      <div class="bg-primary px-5 py-3.5 flex items-center justify-between">
        <h3 class="text-white font-semibold">Sortir {{ courant?.immatriculation }} du parc</h3>
        <button class="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer" @click="sortieOuverte = false"><X class="w-5 h-5" /></button>
      </div>
      <div class="p-5 flex flex-col gap-3.5">
        <div :class="cls.field">
          <label :class="cls.fieldLabel">Motif de sortie *</label>
          <input v-model="formSortie.motif" :class="cls.fieldInput" placeholder="ex. Vendu, réforme, accident total" />
        </div>
        <div :class="cls.field">
          <label :class="cls.fieldLabel">Date *</label>
          <input v-model="formSortie.date" type="date" :class="cls.fieldInput" />
        </div>
        <div :class="cls.field">
          <label :class="cls.fieldLabel">Décidé par *</label>
          <input v-model="formSortie.par" :class="cls.fieldInput" placeholder="Nom du responsable" />
        </div>
        <div :class="cls.field">
          <label :class="cls.fieldLabel">Kilométrage au compteur</label>
          <input v-model.number="formSortie.kilometrageSortie" type="number" :class="cls.fieldInput" />
        </div>
        <div :class="cls.field">
          <label :class="cls.fieldLabel">Commentaire</label>
          <textarea v-model="formSortie.commentaire" rows="2" :class="cls.fieldTextarea"></textarea>
        </div>
        <p v-if="erreurSortie" class="text-[12px] text-danger">{{ erreurSortie }}</p>
      </div>
      <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
        <button :class="cls.btnOutline" @click="sortieOuverte = false">Annuler</button>
        <button :class="cls.btnPrimary" :disabled="!formSortie.motif.trim() || !formSortie.date || !formSortie.par.trim()" @click="confirmerSortie">Confirmer la sortie</button>
      </div>
    </div>
  </div>
</template>
