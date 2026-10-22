<script setup lang="ts">
/**
 * Fiche entité en superposition, sur la même coquille que la fiche employé.
 * Contenu tiré du contexte UCODIS : rattachement, responsable, site,
 * effectif réel et fonctions rattachées à l'entité.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import UserAvatar from '../ui/UserAvatar.vue'
import * as cls from '../../lib/formClasses'
import { useEntiteStore } from '../../stores/entites'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useParametresStore } from '../../stores/parametres'
import type { Entite, TypeEntite } from '../../types'

const props = defineProps<{ entites: Entite[]; entiteId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useEntiteStore()
const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const params = useParametresStore()

const TYPES: Record<TypeEntite, string> = {
  direction: 'Direction', service: 'Service', equipe: 'Équipe',
}

const idCourant = ref(props.entiteId)
watch(() => props.entiteId, v => { idCourant.value = v; enEdition.value = false })

const courant = computed<Entite | null>(() => props.entites.find(e => e.id === idCourant.value) ?? null)
const index = computed(() => props.entites.findIndex(e => e.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.entites.length - 1)
const sidebarItems = computed(() => props.entites.map(e => ({ no: e.code, label: e.nom })))
const currentNo = computed(() => courant.value?.code ?? null)

function goPrev() { if (hasPrev.value) { idCourant.value = props.entites[index.value - 1]!.id; enEdition.value = false } }
function goNext() { if (hasNext.value) { idCourant.value = props.entites[index.value + 1]!.id; enEdition.value = false } }
function selectSidebar(no: string) {
  const e = props.entites.find(x => x.code === no)
  if (e) { idCourant.value = e.id; enEdition.value = false }
}

const enEdition = ref(false)
const form = ref({ code: '', nom: '', type: 'service' as TypeEntite, parentId: '' as string, site: '', description: '' })

function enterEdit() {
  const e = courant.value
  if (!e) return
  form.value = {
    code: e.code, nom: e.nom, type: e.type,
    parentId: e.parentId ?? '', site: e.site ?? '', description: e.description ?? '',
  }
  enEdition.value = true
}
function cancelEdit() { enEdition.value = false }
function save() {
  const e = courant.value
  if (!e) return
  Object.assign(e, { ...form.value, parentId: form.value.parentId || null })
  enEdition.value = false
}

const membres = computed(() => (courant.value ? personnel.parEntite(courant.value.id) : []))
const sousEntites = computed(() => (courant.value ? store.enfants(courant.value.id) : []))
const parent = computed(() =>
  courant.value?.parentId ? store.parId(courant.value.parentId) : null,
)
const optEntitesParentes = computed<DropdownItem[]>(() =>
  props.entites.filter(e => e.id !== courant.value?.id).map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))
const fonctionsRattachees = computed(() =>
  courant.value ? fonctions.liste.filter(f => f.entiteId === courant.value!.id) : [],
)

const pageTitle = computed(() => (courant.value ? `${courant.value.code} · ${courant.value.nom}` : ''))
const lecture = 'text-[13px] text-foreground bg-background border border-border rounded-md px-2.5 min-h-[38px] flex items-center'
</script>

<template>
  <CardModalShell
    v-if="courant"
    :page-title="pageTitle"
    :page-number="courant.code"
    banner-label="Fiche entité"
    :is-edit-mode="enEdition"
    :show-title-new-button="false"
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
      <span class="text-[11px] font-medium px-2.5 py-[3px] rounded-full bg-primary/10 text-primary">
        {{ TYPES[courant.type] }}
      </span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-4xl mx-auto">

        <FormSection title="Identification" :recaps="[courant.nom, TYPES[courant.type]]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Code</label>
              <input v-if="enEdition" v-model="form.code" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.code }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Nom</label>
              <input v-if="enEdition" v-model="form.nom" :class="cls.fieldInput" />
              <div v-else :class="lecture">{{ courant.nom }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Type</label>
              <select v-if="enEdition" v-model="form.type" :class="cls.fieldSelect">
                <option v-for="(l, v) in TYPES" :key="v" :value="v">{{ l }}</option>
              </select>
              <div v-else :class="lecture">{{ TYPES[courant.type] }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Rattachée à</label>
              <SearchableDropdown v-if="enEdition" v-model="form.parentId" :items="optEntitesParentes" placeholder="Aucune (entité racine)" />
              <div v-else :class="lecture">{{ parent?.nom ?? 'Entité racine' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Site</label>
              <select v-if="enEdition" v-model="form.site" :class="cls.fieldSelect">
                <option v-for="s in params.sites" :key="s.id" :value="s.nom">{{ s.nom }}</option>
              </select>
              <div v-else :class="lecture">{{ courant.site || '-' }}</div>
            </div>
            <div :class="cls.field">
              <label :class="cls.fieldLabel">Responsable</label>
              <div :class="lecture">
                <template v-if="courant.responsableNom">
                  <UserAvatar :nom="courant.responsableNom" taille="sm" class="mr-2" />{{ courant.responsableNom }}
                </template>
                <template v-else>Sans responsable</template>
              </div>
            </div>
          </div>

          <div :class="cls.field" class="mt-4">
            <label :class="cls.fieldLabel">Description</label>
            <textarea v-if="enEdition" v-model="form.description" rows="3" :class="cls.fieldTextarea"></textarea>
            <div v-else class="text-[13px] text-foreground bg-background border border-border rounded-md px-2.5 py-2 leading-relaxed">
              {{ courant.description || '-' }}
            </div>
          </div>
        </FormSection>

        <FormSection title="Effectif" :recaps="[`${membres.length} personne(s)`]">
          <div v-if="membres.length" class="flex flex-wrap gap-1.5">
            <div v-for="m in membres" :key="m.id"
                 class="flex items-center gap-1.5 bg-background border border-border rounded-full pl-1 pr-2.5 py-1">
              <UserAvatar :nom="m.nomComplet" taille="sm" />
              <div class="min-w-0">
                <div class="text-[12px] leading-tight">{{ m.nomComplet }}</div>
                <div class="text-[10px] text-muted-foreground leading-tight">{{ m.fonctionLibelle }}</div>
              </div>
            </div>
          </div>
          <p v-else class="text-[13px] text-muted-foreground">Aucune personne rattachée à cette entité.</p>
        </FormSection>

        <FormSection
          title="Fonctions rattachées"
          :default-open="false"
          :recaps="[`${fonctionsRattachees.length} fonction(s)`]"
        >
          <div v-if="fonctionsRattachees.length" class="flex flex-col gap-3">
            <div v-for="f in fonctionsRattachees" :key="f.id" class="bg-background rounded-lg p-3.5 border border-border">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-[13px] font-semibold">{{ f.libelle }}</span>
                <span class="text-[10px] font-mono bg-card text-muted-foreground px-1.5 py-0.5 rounded border border-border">{{ f.code }}</span>
                <span v-if="f.conduit" class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                  Permis et habilitation requis
                </span>
              </div>
              <ul class="flex flex-col gap-1">
                <li v-for="(r, i) in f.responsabilites" :key="i" class="flex gap-2 text-[12px] leading-snug">
                  <span class="text-primary shrink-0">•</span><span>{{ r }}</span>
                </li>
              </ul>
            </div>
          </div>
          <p v-else class="text-[13px] text-muted-foreground">Aucune fonction rattachée.</p>
        </FormSection>

        <FormSection
          v-if="sousEntites.length"
          title="Entités rattachées"
          :default-open="false"
          :recaps="[`${sousEntites.length}`]"
        >
          <div class="flex flex-col gap-1.5">
            <button
              v-for="e in sousEntites" :key="e.id"
              class="flex items-center gap-2.5 bg-background border border-border rounded-md px-3 py-2 text-left cursor-pointer hover:border-primary/40"
              @click="idCourant = e.id"
            >
              <span class="text-[10px] font-mono bg-card text-muted-foreground px-1.5 py-0.5 rounded border border-border">{{ e.code }}</span>
              <span class="text-[13px] font-medium flex-1">{{ e.nom }}</span>
              <span class="text-[11px] text-muted-foreground">{{ personnel.parEntite(e.id).length }} personne(s)</span>
            </button>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
