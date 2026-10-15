<script setup lang="ts">
/** Fiche prestataire : coordonnées, contrats et autorisation à travailler avec l'entreprise (FMS-DB-13). */
import { ref, computed, watch } from 'vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { usePrestatairesStore } from '../../stores/prestataires'
import { formatDate } from '../../utils/helpers'
import { aujourdhuiISO } from '../../utils/horloge'
import * as F from '../../lib/formClasses'

const props = defineProps<{ ids: string[]; prestataireId: string }>()
const emit = defineEmits<{ close: [] }>()
const store = usePrestatairesStore()
const idCourant = ref(props.prestataireId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.ids.indexOf(idCourant.value))
const sidebarItems = computed(() => props.ids.map(id => ({ no: id, label: store.getById(id)?.nom })))
function naviguer(d: number) { const c = props.ids[index.value + d]; if (c) idCourant.value = c }
const libelleType = (code: string) => store.types.find(t => t.code === code)?.libelle ?? code
const optTypes = computed<DropdownItem[]>(() => store.types.map(t => ({ id: t.code, label: t.libelle })))

const erreur = ref(''); const succes = ref('')
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }

const enEdition = ref(false)
const form = ref({ nom: '', type: '', contact: '', telephone: '', email: '', adresse: '' })
function entrer() {
  const p = item.value; if (!p) return
  form.value = { nom: p.nom, type: p.type, contact: p.contact ?? '', telephone: p.telephone ?? '', email: p.email ?? '', adresse: p.adresse ?? '' }
  enEdition.value = true
}
function enregistrer() {
  const p = item.value; if (!p) return
  const f = form.value
  if (resultat(store.modifier(p.id, { nom: f.nom.trim(), type: f.type, contact: f.contact.trim() || undefined, telephone: f.telephone.trim() || undefined, email: f.email.trim() || undefined, adresse: f.adresse.trim() || undefined }), 'Prestataire enregistré.'))
    enEdition.value = false
}
const motifRetrait = ref('')
function retirerAutorisation() { if (item.value && resultat(store.changerAutorisation(item.value.id, false, motifRetrait.value), 'Le prestataire n’est plus proposé.')) motifRetrait.value = '' }
function retablir() { if (item.value) resultat(store.changerAutorisation(item.value.id, true), 'Le prestataire est de nouveau autorisé.') }

const nouveauContrat = ref({ objet: '', debut: aujourdhuiISO(), fin: '', montantAr: undefined as number | undefined })
function ajouterContrat() {
  if (!item.value) return
  const c = nouveauContrat.value
  if (resultat(store.ajouterContrat(item.value.id, { objet: c.objet, debut: c.debut, fin: c.fin || undefined, montantAr: c.montantAr }), 'Contrat ajouté.'))
    nouveauContrat.value = { objet: '', debut: aujourdhuiISO(), fin: '', montantAr: undefined }
}
const etatContrat = (c: { debut: string; fin?: string }) => c.debut > aujourdhuiISO() ? 'À venir' : c.fin && c.fin < aujourdhuiISO() ? 'Terminé' : 'En cours'
watch(idCourant, () => { erreur.value = ''; succes.value = ''; enEdition.value = false; motifRetrait.value = '' })
</script>

<template>
  <CardModalShell v-if="item" :page-title="item.nom" :page-number="item.id" banner-label="Flotte · Prestataires" :is-edit-mode="enEdition"
    :sidebar-items="sidebarItems" :current-no="item.id" :has-prev="index > 0" :has-next="index >= 0 && index < ids.length - 1"
    :has-unsaved-changes="enEdition" :show-edit="true"
    @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)" @select-sidebar="no => { if (store.getById(no)) idCourant = no }"
    @enter-edit="entrer" @cancel-edit="enEdition = false" @save="enregistrer">
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{{ libelleType(item.type) }}</span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="item.autorise ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.autorise ? 'Autorisé' : 'Non autorisé' }}</span>
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <FormSection title="Coordonnées" :recaps="[item.contact ?? '', item.telephone ?? '']">
          <div v-if="enEdition" class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Nom *</label><input v-model="form.nom" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Type *</label><SearchableDropdown v-model="form.type" :items="optTypes" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Contact</label><input v-model="form.contact" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Téléphone</label><input v-model="form.telephone" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">E-mail</label><input v-model="form.email" type="email" :class="F.fieldInput" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Adresse</label><input v-model="form.adresse" :class="F.fieldInput" /></div>
          </div>
          <div v-else class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Identifiant" mono>{{ item.id }}</ChampLecture>
            <ChampLecture libelle="Type">{{ libelleType(item.type) }}</ChampLecture>
            <ChampLecture libelle="Contact">{{ item.contact ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Téléphone">{{ item.telephone ?? '-' }}</ChampLecture>
            <ChampLecture libelle="E-mail">{{ item.email ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Origine">{{ item.source === 'import' ? 'Repris par import' : 'Saisi dans le FMS' }}</ChampLecture>
            <ChampLecture libelle="Adresse" large>{{ item.adresse ?? '-' }}</ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Contrats" :recaps="[`${item.contrats?.length ?? 0} contrat(s)`]" :default-open="true">
          <div v-if="!item.contrats?.length" class="text-xs text-muted-foreground mb-2">Aucun contrat.</div>
          <div v-for="c in item.contrats ?? []" :key="c.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span class="min-w-0"><span class="font-mono text-[11px] mr-1.5">{{ c.id }}</span>{{ c.objet }}</span>
            <span class="flex items-center gap-2 shrink-0 text-muted-foreground">
              {{ formatDate(c.debut) }}{{ c.fin ? ` au ${formatDate(c.fin)}` : '' }}<template v-if="c.montantAr"> · {{ c.montantAr.toLocaleString('fr-FR') }} {{ $devise() }}</template>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="etatContrat(c) === 'En cours' ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral'">{{ etatContrat(c) }}</span>
            </span>
          </div>
          <div class="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end mt-3 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Objet *</label><input v-model="nouveauContrat.objet" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Début *</label><input v-model="nouveauContrat.debut" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Fin</label><input v-model="nouveauContrat.fin" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Montant ({{ $devise() }})</label><input v-model.number="nouveauContrat.montantAr" type="number" min="0" :class="F.fieldInput" /></div>
            <button :class="F.btnOutline" @click="ajouterContrat">Ajouter</button>
          </div>
        </FormSection>

        <FormSection title="Autorisation" :recaps="[item.autorise ? 'Autorisé' : 'Non autorisé']" :default-open="true">
          <template v-if="item.autorise">
            <div :class="F.field"><label :class="F.fieldLabel">Motif du retrait *</label><textarea v-model="motifRetrait" rows="2" :class="F.fieldTextarea"></textarea></div>
            <button :class="F.btnOutline" class="mt-3 !text-danger" @click="retirerAutorisation">Ne plus autoriser ce prestataire</button>
          </template>
          <template v-else>
            <ChampLecture libelle="Motif" large>{{ item.motifNonAutorise ?? '-' }}</ChampLecture>
            <button :class="F.btnOutline" class="mt-3" @click="retablir">Autoriser de nouveau</button>
          </template>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
