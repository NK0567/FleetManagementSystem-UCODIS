<script setup lang="ts">
/**
 * Fiche véhicule, copiée à la lettre de la structure de VehiculeCard de
 * le socle FMS : Identification, Moteur & Carburant (tracteur) ou Remorque
 * (semi-remorque), Statut & Liaisons, Acquisition, Équipements
 * embarqués, Carnet d'entretien, Cycle de vie. Les équipements
 * spécifiques à une citerne d'hydrocarbures (caméra dôme, caméra vanne)
 * n'ont pas d'équivalent chez UCODIS et ne sont pas repris ; seuls le
 * boîtier embarqué, la balise GPS et le détecteur de fatigue le sont.
 */
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import StatusPill from '../ui/StatusPill.vue'
import UserAvatar from '../ui/UserAvatar.vue'
import { Archive, Undo2, X } from '@lucide/vue'
import * as cls from '../../lib/formClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useMaintenanceStore } from '../../stores/maintenance'
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

const STATUTS: Record<StatutVehicule, string> = store.LIBELLES_STATUT

const idCourant = ref(props.vehiculeId)
watch(() => props.vehiculeId, v => { idCourant.value = v; enEdition.value = false })

const courant = computed<Vehicule | null>(() => props.vehicules.find(v => v.id === idCourant.value) ?? null)
const index = computed(() => props.vehicules.findIndex(v => v.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.vehicules.length - 1)
const sidebarItems = computed(() => props.vehicules.map(v => ({ no: v.immatriculation, label: `${v.marque} ${v.modele}` })))
const currentNo = computed(() => courant.value?.immatriculation ?? null)
const estSorti = computed(() => courant.value?.statut === 'vendu')

function goPrev() { if (hasPrev.value) { idCourant.value = props.vehicules[index.value - 1]!.id; enEdition.value = false } }
function goNext() { if (hasNext.value) { idCourant.value = props.vehicules[index.value + 1]!.id; enEdition.value = false } }
function selectSidebar(no: string) {
  const v = props.vehicules.find(x => x.immatriculation === no)
  if (v) { idCourant.value = v.id; enEdition.value = false }
}

const enEdition = ref(false)
const form = ref({
  immatriculation: '', marque: '', modele: '', categorie: '', carburant: '',
  chargeMaxKg: undefined as number | undefined, site: '', statut: 'actif' as StatutVehicule,
  motifIndisponibilite: '', kilometrage: 0, annee: undefined as number | undefined,
  dateMiseEnCirculation: '', modeAcquisition: 'achat' as NonNullable<Vehicule['modeAcquisition']>,
  coutAcquisitionAr: undefined as number | undefined, valeurResiduelleAr: undefined as number | undefined,
})

function enterEdit() {
  const v = courant.value
  if (!v) return
  form.value = {
    immatriculation: v.immatriculation, marque: v.marque, modele: v.modele,
    categorie: v.categorie, carburant: v.carburant, chargeMaxKg: v.chargeMaxKg,
    site: v.site, statut: v.statut, motifIndisponibilite: v.motifIndisponibilite ?? '',
    kilometrage: v.kilometrage, annee: v.annee, dateMiseEnCirculation: v.dateMiseEnCirculation ?? '',
    modeAcquisition: v.modeAcquisition ?? 'achat', coutAcquisitionAr: v.coutAcquisitionAr, valeurResiduelleAr: v.valeurResiduelleAr,
  }
  enEdition.value = true
}
function cancelEdit() { enEdition.value = false }
function save() {
  const v = courant.value
  if (!v) return
  Object.assign(v, { ...form.value, motifIndisponibilite: form.value.motifIndisponibilite || undefined })
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
const joursImmobilise = computed(() =>
  (courant.value ? maintenance.indisposDuVehicule(courant.value.id) : []).reduce((s, i) => s + maintenance.dureeIndispo(i), 0))

const LIB_EQUIPEMENT: Record<TypeEquipement, string> = { obc: 'Boîtier embarqué (OBC)', gps: 'Balise GPS', dms: 'Détecteur de fatigue (DMS)' }
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
function fmtAr(n?: number) { return n != null ? `${n.toLocaleString('fr-FR')} Ar` : '-' }

const optCarburants: DropdownItem[] = [{ id: 'Diesel', label: 'Diesel' }, { id: 'Essence', label: 'Essence' }]
const optAcquisition: DropdownItem[] = [{ id: 'achat', label: 'Achat' }, { id: 'location', label: 'Location' }, { id: 'leasing', label: 'Leasing' }]

/* ── Cycle de vie : sortie du parc, toujours réversible ──────── */
const sortieOuverte = ref(false)
const formSortie = ref({ motif: '', date: new Date().toISOString().slice(0, 10), par: '', kilometrageSortie: undefined as number | undefined, commentaire: '' })
const obstacleSortie = computed(() => {
  if (!courant.value) return null
  if (attelage.value) return 'Détachez ce véhicule avant de le sortir du parc.'
  if (affectation.value) return 'Retirez son affectation avant de le sortir du parc.'
  return null
})
function ouvrirSortie() {
  formSortie.value = { motif: '', date: new Date().toISOString().slice(0, 10), par: '', kilometrageSortie: courant.value?.kilometrage, commentaire: '' }
  sortieOuverte.value = true
}
function confirmerSortie() {
  if (!courant.value || !formSortie.value.motif.trim() || !formSortie.value.par.trim()) return
  store.sortirDuParc(courant.value.id, { ...formSortie.value })
  sortieOuverte.value = false
}
function reintegrer() { if (courant.value) store.reintegrer(courant.value.id) }
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
        {{ courant.type === 'tracteur' ? 'Tracteur' : 'Semi-remorque' }}
      </span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-4xl mx-auto">

        <!-- 1. IDENTIFICATION -->
        <FormSection title="Identification" :recaps="[courant.immatriculation, `${courant.marque} ${courant.modele}`.trim()]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Immatriculation</label>
              <input v-if="enEdition" v-model="form.immatriculation" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.immatriculation }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">VIN</label>
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
              <label :class="cls.fieldLabel">Site d'affectation</label>
              <input v-if="enEdition" v-model="form.site" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.site }}</div>
            </div>
          </div>
        </FormSection>

        <!-- 2. MOTEUR & CARBURANT (tracteur) -->
        <FormSection v-if="courant.type === 'tracteur'" title="Moteur & Carburant">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Type de carburant</label>
              <SearchableDropdown v-if="enEdition" v-model="form.carburant" :items="optCarburants" placeholder="Type de carburant…" />
              <div v-else :class="lecture">{{ courant.carburant }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Kilométrage</label>
              <input v-if="enEdition" v-model.number="form.kilometrage" type="number" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.kilometrage.toLocaleString('fr-FR') }} km</div>
            </div>
          </div>
          <p class="text-[11px] text-muted-foreground mt-3">
            Le relevé automatique par télématique n'est confirmé par aucun document UCODIS :
            le kilométrage se met à jour manuellement, à chaque retour de voyage.
          </p>
        </FormSection>

        <!-- 2b. REMORQUE (semi-remorque) -->
        <FormSection v-else title="Remorque">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Charge maximale autorisée</label>
              <input v-if="enEdition" v-model.number="form.chargeMaxKg" type="number" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.chargeMaxKg ? `${courant.chargeMaxKg.toLocaleString('fr-FR')} kg` : '-' }}</div>
            </div>
          </div>
        </FormSection>

        <!-- 3. STATUT & LIAISONS -->
        <FormSection title="Statut & Liaisons" :recaps="[STATUTS[courant.statut], vehiculeAttele?.immatriculation]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Statut</label>
              <template v-if="enEdition && !estSorti">
                <select v-model="form.statut" :class="cls.fieldSelect">
                  <option v-for="(l, v) in STATUTS" :key="v" :value="v">{{ l }}</option>
                </select>
              </template>
              <div v-else :class="lecture"><StatusPill :statut="courant.statut" :libelle="STATUTS[courant.statut]" /></div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Motif d'indisponibilité</label>
              <input v-if="enEdition" v-model="form.motifIndisponibilite" :class="cls.fieldInput" placeholder="Si applicable" />
              <div v-else :class="lecture">{{ courant.motifIndisponibilite || '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">{{ courant.type === 'tracteur' ? 'Semi-remorque attelée' : 'Tracteur attelé' }}</label>
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

        <!-- 4. ACQUISITION -->
        <FormSection title="Acquisition">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Mode d'acquisition</label>
              <SearchableDropdown v-if="enEdition" v-model="form.modeAcquisition" :items="optAcquisition" />
              <div v-else :class="lecture" class="capitalize">{{ courant.modeAcquisition ?? '-' }}</div>
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
          </div>
        </FormSection>

        <!-- 5. ÉQUIPEMENTS EMBARQUÉS -->
        <FormSection v-if="courant.type === 'tracteur'" title="Équipements embarqués"
                     :recaps="[`${equipements.length} équipement(s)`, equipementsHS ? `${equipementsHS} hors service` : 'tous opérationnels']">
          <div v-if="!equipements.length" class="text-xs text-muted-foreground py-2">Aucun équipement enregistré pour ce véhicule.</div>
          <table v-else class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Équipement</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">N° série</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">État</th>
            </tr></thead>
            <tbody>
              <tr v-for="e in equipements" :key="e.id" class="border-b border-border/60">
                <td class="py-2 text-xs">{{ LIB_EQUIPEMENT[e.type] }}</td>
                <td class="py-2 text-[11px] font-mono">{{ e.numeroSerie ?? '-' }}</td>
                <td class="py-2"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="LIB_ETAT_EQUIPEMENT[e.etat].cls">{{ LIB_ETAT_EQUIPEMENT[e.etat].label }}</span></td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        <!-- 6. CARNET D'ENTRETIEN -->
        <FormSection title="Carnet d'entretien" :recaps="[`${interventions.length} intervention(s)`, joursImmobilise ? `${joursImmobilise} j immobilisé` : '']" :default-open="false">
          <div v-if="!interventions.length" class="text-xs text-muted-foreground py-2">Aucune intervention enregistrée pour ce véhicule.</div>
          <table v-else class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Date</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Ordre</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Diagnostic</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Statut</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Km</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Coût</th>
            </tr></thead>
            <tbody>
              <tr v-for="o in interventions" :key="o.id" class="border-b border-border/60">
                <td class="py-2 text-xs">{{ fmtDateHeure(o.declareLe) }}</td>
                <td class="py-2 text-[11px] font-mono">{{ o.reference }}</td>
                <td class="py-2 text-xs">{{ o.sousSysteme ? LIB_SOUS_SYSTEME[o.sousSysteme] : 'à diagnostiquer' }}</td>
                <td class="py-2"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="CLS_STATUT_OT[o.statut]">{{ LIB_STATUT_OT[o.statut] }}</span></td>
                <td class="py-2 text-xs">{{ o.kilometrage ? o.kilometrage.toLocaleString('fr-FR') : '-' }}</td>
                <td class="py-2 text-xs">{{ fmtAr(maintenance.coutOT(o)) }}</td>
              </tr>
            </tbody>
          </table>
          <RouterLink :to="{ name: 'maintenance-ordres' }" class="text-[11px] text-primary hover:underline mt-2 inline-block">Voir tous les ordres de travail →</RouterLink>
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
            <p class="text-[11px] text-muted-foreground leading-relaxed">
              Ce véhicule n'apparaît plus dans le parc courant ni dans les affectations. Son historique reste
              consultable et sa plaque demeure réservée.
            </p>
            <button :class="cls.btnOutline" class="self-start" @click="reintegrer"><Undo2 class="w-4 h-4" /> Réintégrer au parc</button>
          </div>
          <div v-else class="flex flex-col gap-2">
            <p class="text-xs text-muted-foreground leading-relaxed">
              Sortir un véhicule du parc l'exclut des listes courantes, des affectations et des indicateurs de
              disponibilité, sans rien supprimer de son historique.
            </p>
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
      </div>
      <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border">
        <button :class="cls.btnOutline" @click="sortieOuverte = false">Annuler</button>
        <button :class="cls.btnPrimary" :disabled="!formSortie.motif.trim() || !formSortie.par.trim()" @click="confirmerSortie">Confirmer la sortie</button>
      </div>
    </div>
  </div>
</template>
