<script setup lang="ts">
/**
 * Fiche d'une demande d'absence en superposition, sur la même coquille
 * que les fiches employé et entité. Les actions de validation sont dans
 * la barre d'actions, au-dessus du formulaire.
 */
import { ref, computed, watch } from 'vue'
import { Check, Undo2, X } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import UserAvatar from '../ui/UserAvatar.vue'
import StatutDemandePill from '../ui/StatutDemandePill.vue'
import ModalShell from '../ui/ModalShell.vue'
import * as cls from '../../lib/formClasses'
import { useAuthStore } from '../../stores/auth'
import { useAbsenceStore, type Demande } from '../../stores/absences'
import { usePersonnelStore } from '../../stores/personnel'
import { useClassificationStore } from '../../stores/classification'
import { useCalendrierStore } from '../../stores/calendrier'

const props = defineProps<{ demandes: Demande[]; demandeId: number }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const absences = useAbsenceStore()
const personnel = usePersonnelStore()
const classification = useClassificationStore()
const calendrier = useCalendrierStore()

const idCourant = ref(props.demandeId)
watch(() => props.demandeId, v => { idCourant.value = v })

const courant = computed<Demande | null>(() => props.demandes.find(d => d.id === idCourant.value) ?? null)
const index = computed(() => props.demandes.findIndex(d => d.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.demandes.length - 1)
const sidebarItems = computed(() => props.demandes.map(d => ({ no: `DEM-${String(d.id).padStart(3, '0')}`, label: d.nom })))
const currentNo = computed(() => (courant.value ? `DEM-${String(courant.value.id).padStart(3, '0')}` : null))

function goPrev() { if (hasPrev.value) idCourant.value = props.demandes[index.value - 1]!.id }
function goNext() { if (hasNext.value) idCourant.value = props.demandes[index.value + 1]!.id }
function selectSidebar(no: string) {
  const d = props.demandes.find(x => `DEM-${String(x.id).padStart(3, '0')}` === no)
  if (d) idCourant.value = d.id
}

const employe = computed(() => (courant.value ? personnel.parId(courant.value.personnelId) : null))
const solde = computed(() => (courant.value ? absences.monSolde(courant.value.personnelId) : null))
const typeConge = computed(() =>
  classification.typesConge.find(t => t.libelle === courant.value?.type) ?? null,
)

/** Jours fériés compris dans la période : ils ne sont jamais décomptés. */
const feriesDansPeriode = computed(() => {
  const d = courant.value
  if (!d) return []
  return calendrier.feries.filter(f => f.date >= d.debut && f.date <= d.fin)
})

const peutValider = computed(() => !auth.lectureSeule && courant.value?.statut === 'attente')

const retour = ref({ ouvert: false, commentaire: '', erreur: '' })
const refus = ref({ ouvert: false, motif: '', erreur: '' })

function confirmerRetour() {
  if (retour.value.commentaire.trim().length < 10) {
    retour.value.erreur = 'Le commentaire doit comporter au moins 10 caractères.'
    return
  }
  absences.retourner(idCourant.value, retour.value.commentaire.trim())
  retour.value = { ouvert: false, commentaire: '', erreur: '' }
}
function confirmerRefus() {
  if (refus.value.motif.trim().length < 10) {
    refus.value.erreur = 'Le motif doit comporter au moins 10 caractères.'
    return
  }
  absences.refuser(idCourant.value, refus.value.motif.trim())
  refus.value = { ouvert: false, motif: '', erreur: '' }
}

const pageTitle = computed(() => (courant.value ? `${currentNo.value} · ${courant.value.nom}` : ''))
const lecture = 'text-[13px] text-foreground bg-background border border-border rounded-md px-2.5 min-h-[38px] flex items-center'
const actBtn = 'px-3 py-1.5 rounded text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5'
</script>

<template>
  <CardModalShell
    v-if="courant"
    :page-title="pageTitle"
    :page-number="currentNo!"
    banner-label="Demande d'absence"
    :is-edit-mode="false"
    :show-edit="false"
    :show-title-new-button="false"
    :sidebar-items="sidebarItems"
    :current-no="currentNo"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :hide-action-bar="!peutValider"
    @close="emit('close')"
    @go-prev="goPrev"
    @go-next="goNext"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <StatutDemandePill :statut="courant.statut" />
    </template>

    <template #action-buttons>
      <button :class="[actBtn, 'bg-success-bg text-success']" @click="absences.approuver(courant!.id)">
        <Check class="w-4 h-4" /> Approuver
      </button>
      <button :class="[actBtn, 'bg-info-bg text-info']" @click="retour.ouvert = true">
        <Undo2 class="w-4 h-4" /> Retourner
      </button>
      <button :class="[actBtn, 'bg-danger-bg text-danger']" @click="refus.ouvert = true">
        <X class="w-4 h-4" /> Refuser
      </button>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-4xl mx-auto">

        <FormSection title="Demandeur" :recaps="[courant.nom, employe?.fonctionLibelle]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Employé</label>
              <div :class="lecture">
                <UserAvatar :nom="courant.nom" taille="sm" class="mr-2" />{{ courant.nom }}
              </div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Matricule</label>
              <div :class="lecture">{{ employe?.matricule ?? '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Fonction</label>
              <div :class="lecture">{{ employe?.fonctionLibelle ?? '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Entité</label>
              <div :class="lecture">{{ employe?.entiteNom ?? '-' }}</div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Demande" :recaps="[courant.type, `${courant.jours} jour(s)`]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Type de congé</label>
              <div :class="lecture">
                <span class="w-2.5 h-2.5 rounded-full shrink-0 mr-2"
                      :style="{ background: typeConge?.couleur ?? '#6B7280' }"></span>
                {{ courant.type }}
              </div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Nombre de jours ouvrés</label>
              <div :class="lecture">{{ courant.jours }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Début</label>
              <div :class="lecture">{{ courant.debut }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Fin</label>
              <div :class="lecture">{{ courant.fin }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Soumise le</label>
              <div :class="lecture">{{ courant.soumisLe }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Justificatif exigé</label>
              <div :class="lecture">{{ typeConge?.justificatif ? 'Oui' : 'Non' }}</div>
            </div>
          </div>

          <div v-if="feriesDansPeriode.length" class="mt-4 bg-warning-bg border border-warning/20 rounded-md px-3.5 py-2.5">
            <div class="text-[11px] font-semibold text-warning uppercase tracking-[0.06em] mb-1">
              Jours fériés dans la période
            </div>
            <p class="text-[12px] text-warning/90 leading-relaxed">
              {{ feriesDansPeriode.map(f => `${f.libelle} (${f.date})`).join(' · ') }} ·
              ces jours ne sont pas décomptés du solde.
            </p>
          </div>

          <div v-if="courant.motifRefus" class="mt-4 bg-danger-bg rounded-md px-3.5 py-2.5 text-[12px] text-danger leading-relaxed">
            <strong>Motif du refus :</strong> {{ courant.motifRefus }}
          </div>
          <div v-if="courant.commentaireRetour" class="mt-4 bg-info-bg rounded-md px-3.5 py-2.5 text-[12px] text-info leading-relaxed">
            <strong>Retournée pour correction :</strong> {{ courant.commentaireRetour }}
          </div>
        </FormSection>

        <FormSection
          title="Solde de l'employé"
          :default-open="false"
          :recaps="solde ? [`${solde.congeAnnuel} j annuels`] : []"
        >
          <div v-if="solde" class="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ solde.congeAnnuel }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Congé annuel</div>
            </div>
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ solde.recuperation }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Récupération</div>
            </div>
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ solde.maladie }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Congé maladie</div>
            </div>
            <div class="bg-background rounded-lg p-3 text-center border border-border">
              <div class="text-xl font-bold">{{ solde.permission }} j</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">Permission</div>
            </div>
          </div>
          <p v-else class="text-[13px] text-muted-foreground">Aucun solde suivi pour cette personne.</p>
        </FormSection>
      </div>
    </template>
  </CardModalShell>

  <ModalShell :ouvert="retour.ouvert" titre="Retourner la demande" @fermer="retour.ouvert = false">
    <label class="text-xs font-medium text-foreground">Commentaire</label>
    <textarea v-model="retour.commentaire" rows="4" :class="cls.fieldTextarea"
              placeholder="Expliquez ce qui doit être corrigé…"></textarea>
    <p v-if="retour.erreur" class="text-[11px] text-danger mt-1">{{ retour.erreur }}</p>
    <template #pied>
      <button :class="cls.btnPrimary" @click="confirmerRetour"><Undo2 class="w-4 h-4" /> Retourner</button>
      <button :class="cls.btnOutline" @click="retour.ouvert = false">Annuler</button>
    </template>
  </ModalShell>

  <ModalShell :ouvert="refus.ouvert" titre="Refuser la demande" @fermer="refus.ouvert = false">
    <label class="text-xs font-medium text-foreground">Motif du refus</label>
    <textarea v-model="refus.motif" rows="4" :class="cls.fieldTextarea"
              placeholder="Le motif sera communiqué à l'employé…"></textarea>
    <p v-if="refus.erreur" class="text-[11px] text-danger mt-1">{{ refus.erreur }}</p>
    <template #pied>
      <button :class="cls.btnDestructive" @click="confirmerRefus">Confirmer le refus</button>
      <button :class="cls.btnOutline" @click="refus.ouvert = false">Annuler</button>
    </template>
  </ModalShell>
</template>
