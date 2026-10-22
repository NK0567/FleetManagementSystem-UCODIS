<script setup lang="ts">
/** Fiche d'un document de l'entreprise et son circuit de validation (FMS-SC-02). */
import { ref, computed, watch } from 'vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import StatusPill from '../ui/StatusPill.vue'
import { useDocumentsEntrepriseStore, LIB_VALIDATION } from '../../stores/documentsEntreprise'
import { useTypesDocumentsStore } from '../../stores/typesDocuments'
import { useEntiteStore } from '../../stores/entites'
import { useAuthStore } from '../../stores/auth'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ ids: string[]; documentId: string }>()
const emit = defineEmits<{ close: []; nouvelleVersion: [id: string] }>()
const store = useDocumentsEntrepriseStore()
const types = useTypesDocumentsStore()
const entites = useEntiteStore()
const auth = useAuthStore()

const idCourant = ref(props.documentId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.ids.indexOf(idCourant.value))
function naviguer(d: number) { const c = props.ids[index.value + d]; if (c) idCourant.value = c }
const sidebarItems = computed(() => props.ids.map(id => ({ no: store.getById(id)?.reference ?? id, label: store.getById(id)?.nom })))

const erreur = ref(''); const succes = ref(''); const motif = ref('')
watch(idCourant, () => { erreur.value = ''; succes.value = ''; motif.value = '' })
function decider(d: 'valide' | 'rejete') {
  if (!item.value) return
  const r = store.decider(item.value.id, d, auth.user?.nom ?? 'Utilisateur', motif.value)
  erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? (d === 'valide' ? 'Document validé : il est désormais officiel.' : 'Document rejeté.') : ''
  if (r.ok) motif.value = ''
}
const remplace = computed(() => store.documents.find(d => d.remplacePar === item.value?.id))
const remplacant = computed(() => item.value?.remplacePar ? store.getById(item.value.remplacePar) : undefined)
</script>

<template>
  <CardModalShell v-if="item" :page-title="item.nom" :page-number="item.reference" banner-label="Flotte · Documents de l'entreprise" :is-edit-mode="false"
    :sidebar-items="sidebarItems" :current-no="item.reference" :has-prev="index > 0" :has-next="index >= 0 && index < ids.length - 1" hide-action-bar
    @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)"
    @select-sidebar="no => { const d = store.documents.find(x => x.reference === no); if (d) idCourant = d.id }">
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="LIB_VALIDATION[item.statut].cls">{{ LIB_VALIDATION[item.statut].label }}</span>
      <StatusPill v-if="item.statut === 'valide' && item.dateFin" :statut="store.etat(item)" />
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>
        <div v-if="item.statut === 'en_attente'" class="flex items-center gap-2 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> Document en attente : il ne sera officiel qu'une fois validé.</div>

        <FormSection title="Document" :recaps="[types.libelle(item.type)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Type">{{ types.libelle(item.type) }}</ChampLecture>
            <ChampLecture libelle="Entité">{{ entites.parId(item.entiteId ?? '')?.nom ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Date du document">{{ formatDate(item.dateDocument) }}</ChampLecture>
            <ChampLecture libelle="Fin de validité">{{ item.dateFin ? formatDate(item.dateFin) : 'illimitée' }}</ChampLecture>
            <ChampLecture libelle="Mots-clés" large>{{ item.motsCles.join(', ') || '-' }}</ChampLecture>
            <ChampLecture libelle="Fichier" large><a v-if="item.scan?.dataUrl" :href="item.scan.dataUrl" target="_blank" rel="noopener" class="text-primary hover:underline">{{ item.scan.nom }}</a><span v-else>{{ item.scan?.nom ?? '-' }}</span></ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Validation" :recaps="[LIB_VALIDATION[item.statut].label]" :default-open="true">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3 max-sm:grid-cols-1">
            <ChampLecture libelle="Déposé par">{{ item.deposePar }}, le {{ fmtDateHeure(item.deposeLe) }}</ChampLecture>
            <ChampLecture v-if="item.decision" :libelle="item.statut === 'valide' ? 'Validé par' : 'Rejeté par'">{{ item.decision.par }}, le {{ fmtDateHeure(item.decision.le) }}</ChampLecture>
            <ChampLecture v-if="item.decision?.motif" libelle="Motif du rejet" large>{{ item.decision.motif }}</ChampLecture>
          </div>
          <template v-if="item.statut === 'en_attente'">
            <div :class="F.field" class="mb-2.5"><label :class="F.fieldLabel">Motif (obligatoire pour un rejet)</label><input v-model="motif" :class="F.fieldInput" /></div>
            <div class="flex gap-2"><button :class="F.btnPrimary" @click="decider('valide')">Valider</button><button :class="F.btnOutline" @click="decider('rejete')">Rejeter</button></div>
          </template>
        </FormSection>

        <FormSection title="Versions" :recaps="[remplacant ? 'remplacé' : remplace ? 'nouvelle version' : 'version unique']" :default-open="false">
          <p v-if="remplace" class="text-xs mb-2">Remplace {{ remplace.reference }}.</p>
          <p v-if="remplacant" class="text-xs mb-2">Remplacé par {{ remplacant.reference }} ({{ LIB_VALIDATION[remplacant.statut].label.toLowerCase() }}).</p>
          <button v-if="!item.remplacePar" :class="F.btnOutline" @click="emit('nouvelleVersion', item.id)">Déposer une nouvelle version</button>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
