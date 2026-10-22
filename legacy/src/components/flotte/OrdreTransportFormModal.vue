<template>
  <div class="fixed inset-0 z-[1000] flex items-start justify-center bg-black/40 overflow-y-auto py-10" @click.self="emit('close')">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-[900px] mx-4 flex flex-col">

      <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 class="text-base font-semibold text-foreground">Nouvel ordre de transport</h2>
        <button class="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground cursor-pointer hover:bg-background" @click="emit('close')">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="px-5 py-4 flex flex-col gap-4">
        <p class="text-[12px] text-muted-foreground -mt-1">
          Le reste des informations - le trajet notamment - se complète une fois l'ordre créé, directement sur sa fiche.
        </p>

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
      </div>

      <div class="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-border">
        <p v-if="erreur" class="text-[12px] text-danger flex items-center gap-1.5">
          <AlertCircle class="w-3.5 h-3.5" /> {{ erreur }}
        </p>
        <span v-else></span>
        <div class="flex items-center gap-2 shrink-0">
          <button :class="cls.btnOutline" @click="emit('close')">Annuler</button>
          <button :class="cls.btnPrimary" @click="enregistrer">Créer l'ordre</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Création rapide d'un ordre de transport : uniquement l'identification
 * du véhicule, du chauffeur (déduit), du client et de la date prévue,
 * plus les quelques champs complémentaires qui ne dépendent pas du
 * trajet. Le trajet, lui, se définit juste après, sur la fiche de
 * l'ordre fraîchement créé - à la différence du formulaire de voyage
 * complet, qui exige le trajet dès la création.
 */
import { ref, computed } from 'vue'
import { AlertCircle, ShieldAlert, UserCheck, X } from '@lucide/vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useVoyagesStore } from '../../stores/voyages'
import { useTrajetsStore } from '../../stores/trajets'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'

const emit = defineEmits<{ close: []; created: [id: string] }>()

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const voyages = useVoyagesStore()
const trajets = useTrajetsStore()
const docsVehicule = useDocumentsVehiculeStore()

const form = ref({
  vehiculeId: '', clientNom: '', datePlanifiee: '', numeroOT: '',
  typeProduit: 'Produits alimentaires secs', poidsChargeKg: 0,
})
const erreur = ref('')

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
  if (form.value.vehiculeId && !chauffeur.value) out.push("Ce véhicule n'a aucun conducteur affecté : affectez un conducteur avant de créer l'ordre.")
  return out
})

function enregistrer() {
  erreur.value = ''
  if (!form.value.vehiculeId) { erreur.value = 'Choisissez un véhicule.'; return }
  if (!form.value.datePlanifiee) { erreur.value = 'Renseignez la date prévue.'; return }
  if (!chauffeur.value) { erreur.value = 'Ce véhicule doit avoir un conducteur affecté.'; return }

  const vehicule = vehicules.parId(form.value.vehiculeId)
  const af = vehicules.affectationActive(form.value.vehiculeId)
  const at = vehicules.attelageActif(form.value.vehiculeId)

  const id = voyages.creerRapide({
    vehiculeId: form.value.vehiculeId, vehiculePlaque: vehicule?.immatriculation ?? '',
    chauffeurId: af?.conducteurId, chauffeurNom: chauffeur.value ?? undefined,
    semiRemorqueId: at?.semiRemorqueId, semiRemorquePlaque: semiRemorque.value ?? undefined,
    clientNom: form.value.clientNom, datePlanifiee: form.value.datePlanifiee,
    numeroOT: form.value.numeroOT, typeProduit: form.value.typeProduit, poidsChargeKg: form.value.poidsChargeKg,
  })

  emit('created', id)
}
</script>
