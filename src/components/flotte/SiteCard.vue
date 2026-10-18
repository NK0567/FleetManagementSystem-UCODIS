<script setup lang="ts">
/** Fiche site : informations, adresse et zone de géorepérage, éditables en place (FMS-DB-14). */
import { ref, computed, watch } from 'vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import * as cls from '../../lib/formClasses'
import { useSitesStore } from '../../stores/sites'
import { useTypesSitesStore } from '../../stores/typesSites'
import { useClientsStore } from '../../stores/clients'
import ZoneSiteEditeur from './ZoneSiteEditeur.vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import type { SiteReseau, TypeSiteReseau } from '../../types'

const props = defineProps<{ sites: SiteReseau[]; siteId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useSitesStore()
const typesSites = useTypesSitesStore()
const clients = useClientsStore()
const optClients = computed<DropdownItem[]>(() => [{ id: '', label: 'Aucun' }, ...clients.destinataires().map(c => ({ id: c.id, label: c.nom, sublabel: c.ville }))])
const erreur = ref(''); const succes = ref('')

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
const form = ref({ type: '' as TypeSiteReseau | '', nom: '', ville: '', region: '', adresse: '', actif: true, lat: null as number | null, lng: null as number | null, rayonM: null as number | null, proprietaireTiers: '', email: '', clientId: '' })

function loadForm() {
  const s = current.value
  form.value = { type: s.type, nom: s.nom, ville: s.ville, region: s.region ?? '', adresse: s.adresse ?? '', actif: s.actif, lat: s.lat, lng: s.lng, rayonM: s.rayonM ?? null, proprietaireTiers: s.proprietaireTiers ?? '', email: s.email ?? '', clientId: s.clientId ?? '' }
  erreur.value = ''
}
watch(() => current.value, loadForm, { immediate: true })

const isDirty = computed(() => isEditMode.value && (
  form.value.nom !== current.value.nom || form.value.ville !== current.value.ville ||
  form.value.region !== (current.value.region ?? '') || form.value.actif !== current.value.actif ||
  form.value.type !== current.value.type || form.value.adresse !== (current.value.adresse ?? '') ||
  form.value.lat !== current.value.lat || form.value.lng !== current.value.lng || form.value.rayonM !== (current.value.rayonM ?? null) ||
  form.value.proprietaireTiers !== (current.value.proprietaireTiers ?? '') || form.value.email !== (current.value.email ?? '') || form.value.clientId !== (current.value.clientId ?? '')
))

function handleCancel() { isEditMode.value = false; loadForm() }

async function handleSave() {
  saving.value = true
  const f = form.value
  const r = store.modifier(current.value.id, {
    type: f.type as TypeSiteReseau, nom: f.nom, ville: f.ville, region: f.region || undefined, adresse: f.adresse.trim() || undefined, actif: f.actif,
    lat: f.lat ?? NaN, lng: f.lng ?? NaN, rayonM: f.rayonM ?? undefined, proprietaireTiers: f.proprietaireTiers.trim() || undefined, email: f.email.trim() || undefined, clientId: f.clientId || undefined,
  })
  saving.value = false
  if (!r.ok) { erreur.value = r.motif ?? ''; succes.value = ''; return }
  erreur.value = ''; succes.value = 'Site enregistré.'
  isEditMode.value = false
}

function couleurType(t: TypeSiteReseau) { return typesSites.get(t)?.couleur ?? '#6b7280' }
const optType = computed<DropdownItem[]>(() => typesSites.types.filter(t => t.actif || t.libelle === current.value.type).map(t => ({ id: t.libelle, label: t.libelle })))
</script>

<template>
  <CardModalShell
    page-title="Fiche site"
    :page-number="current.code"
    banner-label="Flotte · Sites"
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
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

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
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :style="{ background: couleurType(current.type) + '1F', color: couleurType(current.type) }">{{ current.type }}</span>
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
            <div class="col-span-2 flex flex-col gap-1">
              <label :class="cls.fieldLabel">Adresse</label>
              <input v-if="isEditMode" v-model="form.adresse" :class="cls.fieldInput" />
              <span v-else class="text-[13px] text-foreground">{{ current.adresse ?? '-' }}</span>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <label :class="cls.fieldLabel">Adresse e-mail</label>
              <input v-if="isEditMode" v-model="form.email" type="email" :class="cls.fieldInput" />
              <span v-else class="text-[13px] text-foreground">{{ current.email ?? '-' }}</span>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <label :class="cls.fieldLabel">Client</label>
              <SearchableDropdown v-if="isEditMode" v-model="form.clientId" :items="optClients" placeholder="Facultatif : site de livraison d'un client" />
              <span v-else class="text-[13px] text-foreground">{{ current.clientId ? clients.getById(current.clientId)?.nom ?? '-' : '-' }}</span>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <label :class="cls.fieldLabel">Appartient à un tiers</label>
              <input v-if="isEditMode" v-model="form.proprietaireTiers" :class="cls.fieldInput" placeholder="Vide : site de l'entreprise" />
              <span v-else class="text-[13px] text-foreground">{{ current.proprietaireTiers ?? 'Non, site de l’entreprise' }}</span>
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

        <FormSection title="Zone de géorepérage" :recaps="[`${current.rayonM ?? '-'} m`]">
          <ZoneSiteEditeur v-if="isEditMode" v-model:lat="form.lat" v-model:lng="form.lng" v-model:rayon-m="form.rayonM" :couleur="couleurType(form.type)" editable :libelle="form.nom" />
          <p v-if="!isEditMode" class="text-[13px] mb-2">Rayon : {{ current.rayonM ?? '-' }} m · centre {{ current.lat.toFixed(4) }}, {{ current.lng.toFixed(4) }}</p>
          <ZoneSiteEditeur v-if="!isEditMode" :key="current.id" :lat="current.lat" :lng="current.lng" :rayon-m="current.rayonM ?? null" :couleur="couleurType(current.type)" :libelle="current.nom" />
        </FormSection>

      </div>
    </template>
  </CardModalShell>
</template>
