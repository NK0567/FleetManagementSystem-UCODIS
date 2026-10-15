<script setup lang="ts">
/**
 * Fiche conducteur : identité, score de conduite, exploitation, disponibilité,
 * pièces, affectations, formations et aptitude médicale. « Voir la page
 * complète » ouvre le tableau de bord détaillé du conducteur.
 */
import { ref, computed, watch } from 'vue'
import { ExternalLink } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useEcartsStore } from '../../stores/ecarts'
import { useCarburantStore } from '../../stores/carburant'
import { useVehiculeStore } from '../../stores/vehicules'
import { useScoresConducteursStore } from '../../stores/scoresConducteurs'
import { useDisponibilitesStore, LIB_DISPONIBILITE, MOTIF_CONGE } from '../../stores/disponibilites'
import { useFormationsStore, LIB_STATUT_FORMATION } from '../../stores/formations'
import StatusPill from '../ui/StatusPill.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useAuthStore } from '../../stores/auth'
import { useFonctionStore } from '../../stores/fonctions'
import { useEntiteStore } from '../../stores/entites'
import { useIndicateursStore } from '../../stores/indicateurs'
import { formatDate } from '../../utils/helpers'
import * as cls from '../../lib/formClasses'
import type { Personnel } from '../../types'

const props = defineProps<{ conducteurs: Personnel[]; conducteurId: string }>()
const emit = defineEmits<{ close: []; voirPageComplete: [id: string] }>()

const personnel = usePersonnelStore()
const docsPersonnel = useDocumentsStore()
const ecartsStore = useEcartsStore()
const carburantStore = useCarburantStore()
const vehicules = useVehiculeStore()
const scoresStore = useScoresConducteursStore()
const dispos = useDisponibilitesStore()
const formations = useFormationsStore()

const idCourant = ref(props.conducteurId)
const item = computed<Personnel | null>(() => personnel.parId(idCourant.value) ?? null)
/* La fiche rassemble pièces, affectations, score et formations (FMS-DB-09). */
const dispo = computed(() => dispos.disponibilite(idCourant.value))
const eligible = computed(() => dispos.eligibilite(idCourant.value))
/** Dépassements des temps de conduite et de repos relevés sur ses voyages (FMS-PA-04). */
const depassements = computed(() => dispos.depassementsTemps(idCourant.value))
const pieces = computed(() => docsPersonnel.parPersonnel(idCourant.value))
const affectations = computed(() => vehicules.affectations.filter(a => a.conducteurId === idCourant.value).sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)))
const formationsDuConducteur = computed(() => formations.duConducteur(idCourant.value))

const index = computed(() => props.conducteurs.findIndex(c => c.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.conducteurs.length - 1)
const sidebarItems = computed(() => props.conducteurs.map(c => ({ no: c.matricule, label: c.nomComplet })))
function naviguer(delta: number) { const c = props.conducteurs[index.value + delta]; if (c) idCourant.value = c.id }
function selectSidebar(no: string) { const c = props.conducteurs.find(x => x.matricule === no); if (c) idCourant.value = c.id }

const auth = useAuthStore()
const moi = computed(() => auth.user?.nom ?? 'Utilisateur')
const LIB_STATUT_PERSONNE: Record<string, string> = { actif: 'Actif', conge: 'En congé', suspendu: 'Suspendu', fin_contrat: 'Fin de contrat', archive: 'Sorti des effectifs' }
type StatutModifiable = 'actif' | 'conge' | 'suspendu' | 'fin_contrat'
const STATUTS_MODIFIABLES: StatutModifiable[] = ['actif', 'conge', 'suspendu', 'fin_contrat']
const message = ref<{ ok: boolean; texte: string } | null>(null)
const motifHabilitation = ref(''); const motifSuspension = ref('')
const nouveauStatut = ref<StatutModifiable>('actif')
const optStatuts = computed<DropdownItem[]>(() => STATUTS_MODIFIABLES.filter(s => s !== item.value?.statut).map(s => ({ id: s, label: LIB_STATUT_PERSONNE[s]! })))
const indispo = ref({ du: '', au: '', nature: 'conge' as 'conge' | 'autre', motif: '' })
const optNatureIndispo: DropdownItem[] = [{ id: 'conge', label: MOTIF_CONGE }, { id: 'autre', label: 'Autre motif' }]
function initialiser() {
  message.value = null; motifHabilitation.value = ''; motifSuspension.value = ''
  indispo.value = { du: '', au: '', nature: 'conge', motif: '' }
  nouveauStatut.value = item.value?.statut === 'actif' ? 'conge' : 'actif'
  modeEdition.value = false; erreurEdition.value = null
}

/* Modification de la fiche : identité, fonction, entité et téléphone. */
const fonctions = useFonctionStore()
const entites = useEntiteStore()
const modeEdition = ref(false)
const erreurEdition = ref<string | null>(null)
const brouillon = ref({ prenom: '', nom: '', cin: '', telephone: '', fonctionId: '', entiteId: '' })
const optFonctions = computed<DropdownItem[]>(() => fonctions.liste.map(f => ({ id: f.id, label: f.libelle })))
const optEntites = computed<DropdownItem[]>(() => entites.liste.map(e => ({ id: e.id, label: e.nom })))
function entrerEdition() {
  if (!item.value) return
  const p = item.value
  brouillon.value = { prenom: p.prenom, nom: p.nom, cin: p.cin, telephone: p.telephone, fonctionId: p.fonctionId, entiteId: p.entiteId }
  erreurEdition.value = null; modeEdition.value = true
}
function enregistrer() {
  if (!item.value) return
  const b = brouillon.value
  const fn = fonctions.parId(b.fonctionId)
  const en = entites.parId(b.entiteId)
  const r = personnel.modifier(item.value.id, { ...b, fonctionLibelle: fn?.libelle ?? '', entiteNom: en?.nom ?? '', conduit: fn?.conduit ?? item.value.conduit })
  if (!r.ok) { erreurEdition.value = r.motif ?? null; return }
  modeEdition.value = false; erreurEdition.value = null
  message.value = { ok: true, texte: 'Fiche enregistrée.' }
}
watch(idCourant, initialiser, { immediate: true })
function basculerHabilitation() {
  if (!item.value) return
  if (item.value.habilite && !motifHabilitation.value.trim()) { message.value = { ok: false, texte: "Indiquez le motif du retrait de l'habilitation." }; return }
  personnel.basculerHabilitation(item.value.id, moi.value, motifHabilitation.value.trim() || undefined)
  message.value = { ok: true, texte: item.value.habilite ? 'Conducteur habilité.' : 'Habilitation retirée.' }; motifHabilitation.value = ''
}
function changerStatut() {
  if (!item.value) return
  const s = nouveauStatut.value
  const r = personnel.changerStatut(item.value.id, s, motifSuspension.value)
  message.value = r.ok ? { ok: true, texte: `Statut passé à « ${LIB_STATUT_PERSONNE[s]} ».` } : { ok: false, texte: r.motif ?? '' }
  if (r.ok) { motifSuspension.value = ''; nouveauStatut.value = s === 'actif' ? 'conge' : 'actif' }
}
function declarerIndispo() {
  if (!item.value) return
  const i = indispo.value
  const motif = i.nature === 'conge' ? MOTIF_CONGE : i.motif
  const r = personnel.ajouterIndisponibilite(item.value.id, { du: i.du, au: i.au, motif }, moi.value)
  message.value = r.ok ? { ok: true, texte: i.nature === 'conge' ? 'Congé enregistré.' : 'Indisponibilité enregistrée.' } : { ok: false, texte: r.motif ?? '' }
  if (r.ok) indispo.value = { du: '', au: '', nature: 'conge', motif: '' }
}

const score = computed(() => (item.value ? scoresStore.scoreGlobal(item.value.id) : 100))
/** Bandes du score : cible de l'indicateur Score, puis seuil de formation, comme la liste. */
const indicateurs = useIndicateursStore()
const bande = computed(() => (score.value >= (indicateurs.cible('score') ?? 80) ? 0 : score.value >= formations.seuilScore ? 1 : 2))
const appreciationScore = computed(() => ['Bon conducteur', 'À surveiller', 'Alerte'][bande.value]!)
const couleurScore = computed(() => ['#16a34a', '#ca8a04', '#dc2626'][bande.value]!)
const nbEcarts = computed(() => (item.value ? ecartsStore.ecartsDuChauffeur(item.value.id).length : 0))

const consoMoyenne = computed(() => {
  if (!item.value) return 0
  const p = carburantStore.periodesConso.filter(pc => pc.chauffeurId === item.value!.id)
  if (!p.length) return 0
  return Math.round((p.reduce((s, x) => s + x.litresPour100km, 0) / p.length) * 10) / 10
})
const tracteurAffecte = computed(() => {
  if (!item.value) return null
  const af = vehicules.affectations.find(a => a.conducteurId === item.value!.id && !a.dateFin)
  return af ? vehicules.parId(af.vehiculeId) : null
})
</script>

<template>
  <CardModalShell
    v-if="item"
    :page-title="personnel.estConducteur(item) ? 'Fiche conducteur' : personnel.estAide(item) ? 'Fiche aide conducteur' : 'Fiche personne'"
    :page-number="item.matricule"
    banner-label="Flotte · Conducteurs"
    :is-edit-mode="modeEdition"
    :save-error="erreurEdition"
    :sidebar-items="sidebarItems"
    :current-no="item.matricule"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="selectSidebar"
    @enter-edit="entrerEdition"
    @cancel-edit="modeEdition = false; erreurEdition = null"
    @save="enregistrer"
    @clear-save-error="erreurEdition = null"
  >
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
          <div v-if="message" class="rounded-md px-3 py-2 mb-3 text-xs" :class="message.ok ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ message.texte }}</div>

        <FormSection title="Identité" :recaps="[item.matricule]">
          <div v-if="modeEdition" class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field"><label :class="cls.fieldLabel">Nom *</label><input v-model="brouillon.nom" :class="cls.fieldInput" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Prénom *</label><input v-model="brouillon.prenom" :class="cls.fieldInput" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Pièce d'identité *</label><input v-model="brouillon.cin" :class="cls.fieldInput" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Téléphone *</label><input v-model="brouillon.telephone" :class="cls.fieldInput" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Fonction *</label><SearchableDropdown v-model="brouillon.fonctionId" :items="optFonctions" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Entité *</label><SearchableDropdown v-model="brouillon.entiteId" :items="optEntites" /></div>
          </div>
          <div v-else class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Nom</label><span class="text-sm text-foreground">{{ item.nom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Prénom</label><span class="text-sm text-foreground">{{ item.prenom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Matricule</label><span class="text-sm font-mono text-foreground">{{ item.matricule }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Pièce d'identité</label><span class="text-sm text-foreground">{{ item.cin || '-' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Téléphone</label><span class="text-sm text-foreground">{{ item.telephone }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Entité</label><span class="text-sm text-foreground">{{ item.entiteNom }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Fonction</label><span class="text-sm text-foreground">{{ item.fonctionLibelle }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Statut</label><span class="text-sm text-foreground">{{ LIB_STATUT_PERSONNE[item.statut] ?? item.statut }}</span></div>
          </div>
        </FormSection>

        <FormSection title="Habilitation et statut" :recaps="[item.habilite ? 'Habilité' : 'Non habilité', LIB_STATUT_PERSONNE[item.statut] ?? item.statut]">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="item.habilite ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.habilite ? 'Habilité à conduire' : 'Non habilité' }}</span>
            <span v-if="item.habiliteLe" class="text-[11px] text-muted-foreground">depuis le {{ formatDate(item.habiliteLe) }}{{ item.habilitePar ? `, par ${item.habilitePar}` : '' }}</span>
            <span v-if="!item.habilite && item.motifRetraitHabilitation" class="text-[11px] text-muted-foreground">· {{ item.motifRetraitHabilitation }}</span>
          </div>
          <div class="flex flex-wrap items-end gap-2 mt-2">
            <div v-if="item.habilite" :class="cls.field" class="flex-1 min-w-[200px]"><label :class="cls.fieldLabel">Motif du retrait *</label><input v-model="motifHabilitation" :class="cls.fieldInput" /></div>
            <button :class="item.habilite ? cls.btnOutline : cls.btnPrimary" @click="basculerHabilitation">{{ item.habilite ? "Retirer l'habilitation" : 'Habiliter à conduire' }}</button>
          </div>
          <div class="flex flex-wrap items-end gap-2 mt-3 pt-3 border-t border-border">
            <template v-if="item.statut !== 'archive'">
              <div :class="cls.field" class="w-[200px]"><label :class="cls.fieldLabel">Nouveau statut</label><SearchableDropdown :model-value="nouveauStatut" :items="optStatuts" @update:model-value="v => nouveauStatut = v as StatutModifiable" /></div>
              <div v-if="nouveauStatut === 'suspendu'" :class="cls.field" class="flex-1 min-w-[200px]"><label :class="cls.fieldLabel">Motif de la suspension *</label><input v-model="motifSuspension" :class="cls.fieldInput" /></div>
              <button :class="cls.btnOutline" @click="changerStatut">Changer le statut</button>
            </template>
          </div>
        </FormSection>

        <FormSection title="Score de conduite" :recaps="[`${score}/100`, appreciationScore]">
          <div class="flex items-center gap-4">
            <svg width="70" height="70" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r="30" fill="none" stroke="var(--color-background,#eee)" stroke-width="8" />
              <circle cx="35" cy="35" r="30" fill="none" :stroke="couleurScore" stroke-width="8"
                      :stroke-dasharray="`${(score / 100) * 188.5} 188.5`" stroke-linecap="round" transform="rotate(-90 35 35)" />
              <text x="35" y="40" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">{{ score }}</text>
            </svg>
            <div>
              <p class="text-sm font-semibold" :style="{ color: couleurScore }">{{ appreciationScore }}</p>
              <p class="text-xs text-muted-foreground">{{ nbEcarts }} écart(s) enregistré(s)</p>
            </div>
          </div>
        </FormSection>

        <FormSection title="Exploitation" :recaps="[tracteurAffecte?.immatriculation]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Tracteur affecté</label><span class="text-sm font-mono text-foreground">{{ tracteurAffecte?.immatriculation ?? 'Aucun' }}</span></div>
            <div class="flex flex-col gap-1"><label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">Conso moyenne</label><span class="text-sm text-foreground">{{ consoMoyenne || '-' }} L/100 km</span></div>
          </div>
        </FormSection>

        <FormSection title="Disponibilité" :recaps="[LIB_DISPONIBILITE[dispo.etat].label, depassements.length ? `${depassements.length} dépassement(s) de temps` : '']">
          <div v-for="i in item.indisponibilitesManuelles ?? []" :key="i.id" class="flex items-center justify-between gap-2 py-1 mb-1 border-b border-border/60 text-xs">
            <span>{{ i.motif }} · du {{ formatDate(i.du) }} au {{ formatDate(i.au) }}</span>
            <button class="text-[11px] text-danger bg-transparent border-0 cursor-pointer p-0" @click="personnel.retirerIndisponibilite(item.id, i.id)">Retirer</button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="LIB_DISPONIBILITE[dispo.etat].cls">{{ LIB_DISPONIBILITE[dispo.etat].label }}</span>
            <span v-if="dispo.detail" class="text-xs text-muted-foreground">{{ dispo.detail }}</span>
          </div>
          <div v-for="d in depassements.slice(0, 5)" :key="d.voyageId + d.motif" class="flex items-start gap-2 rounded-md px-3 py-1.5 bg-warning-bg text-warning text-xs mt-2">
            <span class="font-mono shrink-0">{{ d.reference }}</span><span>{{ formatDate(d.date) }} · {{ d.motif }}</span>
          </div>
          <p v-if="depassements.length > 5" class="text-[11px] text-muted-foreground mt-1">et {{ depassements.length - 5 }} autre(s) dépassement(s) sur les voyages précédents.</p>
          <p v-if="!eligible.ok" class="text-[12px] text-danger mt-2">Non éligible à une affectation : {{ eligible.motif }}</p>
          <p v-else class="text-[12px] text-success mt-2">Éligible à une affectation.</p>
          <div class="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 items-end mt-3 max-sm:grid-cols-1">
            <div :class="cls.field"><label :class="cls.fieldLabel">Indisponible du</label><input v-model="indispo.du" type="date" :class="cls.fieldInput" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">au</label><input v-model="indispo.au" type="date" :class="cls.fieldInput" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Nature</label><SearchableDropdown :model-value="indispo.nature" :items="optNatureIndispo" @update:model-value="v => indispo.nature = v === 'autre' ? 'autre' : 'conge'" /></div>
            <div :class="cls.field"><label :class="cls.fieldLabel">Motif{{ indispo.nature === 'autre' ? ' *' : '' }}</label><input v-model="indispo.motif" :disabled="indispo.nature === 'conge'" :class="cls.fieldInput" /></div>
            <button :class="cls.btnOutline" @click="declarerIndispo">Déclarer</button>
          </div>
        </FormSection>

        <FormSection title="Pièces" :recaps="[`${pieces.length} pièce(s)`]">
          <div v-if="!pieces.length" class="text-xs text-muted-foreground">Aucune pièce enregistrée.</div>
          <div v-for="d in pieces" :key="d.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span>{{ docsPersonnel.libelle(d) }}</span>
            <span class="flex items-center gap-2">
              <span class="text-muted-foreground">{{ d.dateExpiration ? formatDate(d.dateExpiration) : 'sans échéance' }}</span>
              <StatusPill :statut="docsPersonnel.etat(d)" />
            </span>
          </div>
        </FormSection>

        <FormSection title="Affectations" :recaps="[`${affectations.length} affectation(s)`]" :default-open="false">
          <div v-if="!affectations.length" class="text-xs text-muted-foreground">Aucune affectation.</div>
          <div v-for="a in affectations" :key="a.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span class="font-mono">{{ vehicules.parId(a.vehiculeId)?.immatriculation }}</span>
            <span class="text-muted-foreground">du {{ formatDate(a.dateDebut) }}{{ a.dateFin ? ` au ${formatDate(a.dateFin)}` : ', en cours' }}</span>
          </div>
        </FormSection>

        <FormSection title="Formations" :recaps="[`${formationsDuConducteur.length} formation(s)`]" :default-open="false">
          <div v-if="!formationsDuConducteur.length" class="text-xs text-muted-foreground">Aucune formation.</div>
          <div v-for="f in formationsDuConducteur" :key="f.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span class="min-w-0 truncate">{{ f.theme }}</span>
            <span class="flex items-center gap-2 shrink-0">
              <span class="text-muted-foreground">{{ formatDate(f.suivieLe ?? f.prevueLe ?? f.declencheeLe) }}</span>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_FORMATION[f.statut].cls">{{ LIB_STATUT_FORMATION[f.statut].label }}</span>
            </span>
          </div>
        </FormSection>


        <button :class="cls.btnOutline" class="w-full justify-center" @click="emit('voirPageComplete', item.id)">
          <ExternalLink class="w-4 h-4" /> Voir la page complète
        </button>
      </div>
    </template>
  </CardModalShell>
</template>
