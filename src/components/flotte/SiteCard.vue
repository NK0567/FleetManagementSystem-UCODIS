<script setup lang="ts">
/**
 * Fiche site, reprise de la fiche site du socle FMS : édition en place
 * via CardModalShell (pas une fiche en lecture seule comme la plupart
 * des autres fiches du projet), sur le même principe que la fiche
 * employé et la fiche véhicule d'UCODIS gèrent déjà l'édition.
 */
import { ref, computed, watch } from 'vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import * as cls from '../../lib/formClasses'
import { useSitesStore } from '../../stores/sites'
import type { SiteReseau, TypeSiteReseau } from '../../types'

const props = defineProps<{ sites: SiteReseau[]; siteId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useSitesStore()

const localIndex = ref(props.sites.findIndex(s => s.id === props.siteId))
const current = computed(() => props.sites[localIndex.value] ?? props.sites[0]!)

const sidebarItems = computed(() => props.sites.map(s => ({ no: s.code, label: s.nom })))
const hasPrev = computed(() => localIndex.value > 0)
const hasNext = computed(() => localIndex.value < props.sites.length - 1)
function navigate(dir: 1 | -1) {
  const next = localIndex.value + dir
  if (next >= 0 && next < props.sites.length) localIndex.value = next
}
function selectSidebar(no: string) {
  const i = props.sites.findIndex(s => s.code === no)
  if (i >= 0) localIndex.value = i
}

const isEditMode = ref(false)
const saving = ref(false)
const form = ref({ type: '' as TypeSiteReseau | '', nom: '', ville: '', region: '', actif: true })

function loadForm() {
  const s = current.value
  form.value = { type: s.type, nom: s.nom, ville: s.ville, region: s.region ?? '', actif: s.actif }
}
watch(() => current.value, loadForm, { immediate: true })

const isDirty = computed(() => isEditMode.value && (
  form.value.nom !== current.value.nom || form.value.ville !== current.value.ville ||
  form.value.region !== (current.value.region ?? '') || form.value.actif !== current.value.actif ||
  form.value.type !== current.value.type
))

function handleCancel() { isEditMode.value = false; loadForm() }

async function handleSave() {
  saving.value = true
  store.modifier(current.value.id, {
    type: form.value.type as TypeSiteReseau, nom: form.value.nom, ville: form.value.ville,
    region: form.value.region || undefined, actif: form.value.actif,
  })
  saving.value = false
  isEditMode.value = false
}

const TYPE_BADGE: Record<TypeSiteReseau, string> = {
  'Dépôt': 'bg-primary/10 text-primary', 'Entrepôt client': 'bg-success-bg text-success',
  'Zone à risque': 'bg-danger-bg text-danger', 'Point de contrôle': 'bg-info-bg text-info', 'Relais': 'bg-warning-bg text-warning',
}
function typeBadge(t: TypeSiteReseau) { return TYPE_BADGE[t] ?? 'bg-background text-muted-foreground' }

const optType: DropdownItem[] = [
  { id: 'Dépôt', label: 'Dépôt' },
  { id: 'Entrepôt client', label: 'Entrepôt client' },
  { id: 'Zone à risque', label: 'Zone à risque' },
  { id: 'Point de contrôle', label: 'Point de contrôle' },
  { id: 'Relais', label: 'Relais' },
]
</script>

<template>
  <CardModalShell
    page-title="Fiche site"
    :page-number="current.code"
    banner-label="Flotte · Sites & géofences"
    :sidebar-items="sidebarItems"
    :current-no="current.code"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :is-edit-mode="isEditMode"
    :is-saving="saving"
    :has-unsaved-changes="isDirty"
    :show-edit="true"
    :show-title-new-button="false"
    @close="emit('close')"
    @go-prev="navigate(-1)"
    @go-next="navigate(1)"
    @select-sidebar="selectSidebar"
    @enter-edit="isEditMode = true"
    @save="handleSave"
    @cancel-edit="handleCancel"
  >
    <template #form>
      <div class="flex-1 overflow-y-auto px-8 py-6 max-w-2xl mx-auto">

        <FormSection title="Informations du site" :recaps="[current.code, current.nom, current.ville]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div class="flex flex-col gap-1">
              <label :class="cls.fieldLabel">Code</label>
              <span class="text-[13px] font-mono font-bold text-foreground">{{ current.code }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <label :class="cls.fieldLabel">Type</label>
              <template v-if="isEditMode">
                <SearchableDropdown v-model="form.type" :items="optType" />
              </template>
              <span v-else class="text-[13px]">
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="typeBadge(current.type)">{{ current.type }}</span>
              </span>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <label :class="cls.fieldLabel">Nom complet</label>
              <input v-if="isEditMode" v-model="form.nom" :class="cls.fieldInput" />
              <span v-else class="text-[13px] font-medium text-foreground">{{ current.nom }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <label :class="cls.fieldLabel">Ville</label>
              <input v-if="isEditMode" v-model="form.ville" :class="cls.fieldInput" />
              <span v-else class="text-[13px] text-foreground">{{ current.ville }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <label :class="cls.fieldLabel">Région</label>
              <input v-if="isEditMode" v-model="form.region" :class="cls.fieldInput" />
              <span v-else class="text-[13px] text-foreground">{{ current.region ?? '-' }}</span>
            </div>
            <div class="col-span-2 flex items-center gap-3 pt-1">
              <input v-if="isEditMode" id="actifCard" v-model="form.actif" type="checkbox" class="w-4 h-4 rounded" />
              <span v-else class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="current.actif ? 'bg-success-bg text-success' : 'bg-background text-muted-foreground'">
                {{ current.actif ? 'Actif' : 'Inactif' }}
              </span>
              <label v-if="isEditMode" for="actifCard" class="text-[13px] font-medium text-foreground cursor-pointer">Site actif</label>
            </div>
          </div>
        </FormSection>

      </div>
    </template>
  </CardModalShell>
</template>
