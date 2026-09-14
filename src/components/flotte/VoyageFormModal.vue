<template>
  <div class="fixed inset-0 z-[1000] flex items-start justify-center bg-black/40 overflow-y-auto py-8" @click.self="emit('close')">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-[1180px] mx-4 flex flex-col">

      <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 class="text-base font-semibold text-foreground">Nouveau voyage</h2>
        <button class="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground cursor-pointer hover:bg-background" @click="emit('close')">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="px-5 py-4 flex flex-col gap-4">

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Véhicule <span class="text-danger">*</span></label>
            <SearchableDropdown v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" />
          </div>

          <div :class="F.field">
            <label :class="F.fieldLabel">
              Chauffeur <span class="text-muted-foreground font-normal">- déduit de l'affectation</span>
            </label>
            <div class="h-[38px] px-2.5 rounded-md border flex items-center text-[13px]"
                 :class="chauffeur ? 'bg-primary/5 border-primary/20 text-primary font-medium' : 'bg-background border-border text-muted-foreground'">
              <UserCheck v-if="chauffeur" class="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <AlertCircle v-else class="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {{ chauffeur ?? 'Aucune affectation sur ce véhicule' }}
            </div>
          </div>

          <div :class="F.field">
            <label :class="F.fieldLabel">Client</label>
            <SearchableDropdown v-model="form.clientNom" :items="optClients" placeholder="Choisir un client…" />
          </div>

          <div :class="F.field">
            <label :class="F.fieldLabel">Date prévue <span class="text-danger">*</span></label>
            <input v-model="form.datePlanifiee" type="datetime-local" :class="F.fieldInput" />
          </div>
        </div>

        <!-- Véhicules écartés : un seul bandeau groupé, comme la référence -->
        <p v-if="vehiculesEcartes.length" class="text-[12px] text-warning leading-relaxed -mt-2">
          {{ vehiculesEcartes.length }} véhicule(s) écarté(s) pour pièce administrative expirée :
          {{ vehiculesEcartes.map(v => `${v.plaque} (${v.motif})`).join(' · ') }}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">N° ordre de transport</label>
            <input v-model="form.numeroOT" :class="F.fieldInput" placeholder="OT-2026-…" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Marchandise</label>
            <SearchableDropdown v-model="form.typeProduit" :items="optProduits" placeholder="Sélectionner…" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">
              Semi-remorque attelée <span class="text-muted-foreground font-normal">- déduite de l'attelage</span>
            </label>
            <div class="h-[38px] px-2.5 rounded-md bg-background border border-border flex items-center text-[13px] text-muted-foreground">
              {{ semiRemorque ?? 'Aucun attelage en cours' }}
            </div>
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Poids chargé (kg)</label>
            <input v-model.number="form.poidsChargeKg" type="number" min="0" :class="F.fieldInput" />
          </div>
        </div>

        <div v-if="blocages.length" class="flex flex-col gap-1.5">
          <div v-for="b in blocages" :key="b" class="flex items-center gap-2 rounded-lg px-3 py-2 bg-danger-bg text-danger">
            <ShieldAlert class="w-4 h-4 shrink-0" />
            <p class="text-xs flex-1">{{ b }}</p>
          </div>
        </div>

        <!-- Trajet · sélecteur interactif complet, repris du socle FMS -->
        <div>
          <h3 class="text-[13px] font-semibold text-foreground mb-2">Trajet - sélection des sites et de leur ordre</h3>
          <SelecteurTrajet v-model="etapes" @trajet-ref="id => (form.trajetId = id)" />
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-border">
        <p v-if="erreur" class="text-[12px] text-danger flex items-center gap-1.5">
          <AlertCircle class="w-3.5 h-3.5" /> {{ erreur }}
        </p>
        <span v-else class="text-[11px] text-muted-foreground">{{ etapes.length }} site(s) dans la séquence</span>
        <div class="flex items-center gap-2 shrink-0">
          <button :class="cls.btnOutline" @click="emit('close')">Annuler</button>
          <button :class="cls.btnPrimary" @click="enregistrer">Créer le voyage</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Formulaire de création de voyage, copié à la lettre de VoyageFormModal
 * du socle FMS : le chauffeur et la semi-remorque ne se saisissent jamais, ils
 * se déduisent de l'affectation et de l'attelage en cours. Le trajet se
 * compose avec SelecteurTrajet · sites ajoutés un à un, ordre modifiable
 * par glisser-déposer, carte mise à jour en direct.
 */
import { ref, computed } from 'vue'
import { AlertCircle, ShieldAlert, UserCheck, X } from '@lucide/vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import SelecteurTrajet from './SelecteurTrajet.vue'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useVoyagesStore } from '../../stores/voyages'
import { useTrajetsStore } from '../../stores/trajets'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import type { EtapeVoyage } from '../../types'

const emit = defineEmits<{ close: []; created: [id: string] }>()

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const voyages = useVoyagesStore()
const trajets = useTrajetsStore()
const docsVehicule = useDocumentsVehiculeStore()

const form = ref({
  vehiculeId: '', clientNom: '', datePlanifiee: '', numeroOT: '',
  typeProduit: 'Produits alimentaires secs', poidsChargeKg: 0, trajetId: '',
})
const etapes = ref<EtapeVoyage[]>([])
const erreur = ref('')

/** Un véhicule dont un document est expiré n'est pas proposé · motif détaillé, comme la référence. */
const vehiculesEcartes = computed(() =>
  vehicules.tracteurs
    .filter(t => !docsVehicule.enRegle(t.id))
    .map(t => ({
      plaque: t.immatriculation,
      motif: docsVehicule.documentsDe(t.id).filter(d => docsVehicule.etat(d) === 'expire').map(d => d.type).join(', ') || 'document expiré',
    })))

const optVehicules = computed<DropdownItem[]>(() =>
  vehicules.tracteurs.filter(t => docsVehicule.enRegle(t.id)).map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))

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

const clientsConnus = computed(() => [...new Set(trajets.trajets.map(t => t.clientNom))])
const optClients = computed<DropdownItem[]>(() => clientsConnus.value.map(c => ({ id: c, label: c })))

const optProduits: DropdownItem[] = [
  { id: 'Produits alimentaires secs', label: 'Produits alimentaires secs' },
  { id: 'Produits ménagers', label: 'Produits ménagers' },
  { id: 'Boissons', label: 'Boissons' },
  { id: 'Textile', label: 'Textile' },
  { id: 'Matériaux de construction', label: 'Matériaux de construction' },
]

const blocages = computed(() => {
  const out: string[] = []
  if (form.value.vehiculeId && !chauffeur.value) out.push("Ce véhicule n'a aucun conducteur affecté : affectez un conducteur avant de créer le voyage.")
  if (form.value.vehiculeId && !semiRemorque.value) out.push("Ce véhicule n'est attelé à aucune semi-remorque.")
  return out
})

function enregistrer() {
  erreur.value = ''
  if (!form.value.vehiculeId) { erreur.value = 'Choisissez un véhicule.'; return }
  if (!form.value.datePlanifiee) { erreur.value = 'Renseignez la date prévue.'; return }
  if (!chauffeur.value) { erreur.value = 'Ce véhicule doit avoir un conducteur affecté.'; return }
  if (!etapes.value.length) { erreur.value = 'Ajoutez au moins un site à la séquence.'; return }

  const t = form.value.trajetId ? trajets.getById(form.value.trajetId) : null
  const vehicule = vehicules.parId(form.value.vehiculeId)
  const af = vehicules.affectationActive(form.value.vehiculeId)
  const at = vehicules.attelageActif(form.value.vehiculeId)
  const tries = [...etapes.value].sort((a, b) => a.ordre - b.ordre)

  const id = voyages.creer({
    statut: 'planifie',
    clientNom: form.value.clientNom || (t?.clientNom ?? 'Client non précisé'),
    toleranceEcartPoidsPourcent: 1,
    trajetId: form.value.trajetId || undefined,
    trajetLibelle: t?.libelle,
    origine: tries[0]?.siteNom ?? 'Dépôt UCODIS Tanjombato',
    destination: tries[tries.length - 1]?.siteNom ?? '-',
    vehiculeId: form.value.vehiculeId,
    vehiculePlaque: vehicule?.immatriculation,
    semiRemorqueId: at?.semiRemorqueId,
    semiRemorquePlaque: semiRemorque.value ?? undefined,
    chauffeurId: af?.conducteurId,
    chauffeurNom: chauffeur.value ?? undefined,
    datePlanifiee: form.value.datePlanifiee,
    kmReference: t?.distanceEstimeeKm ?? trajets.distanceSimulee(etapes.value),
    numeroOT: form.value.numeroOT || undefined,
    marchandise: { typeProduit: form.value.typeProduit, nombreCartons: 0, poidsChargeKg: form.value.poidsChargeKg || 0 },
    etapesPersonnalisees: form.value.trajetId ? undefined : etapes.value,
  })

  emit('created', id)
}
</script>
