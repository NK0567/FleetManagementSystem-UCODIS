<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import * as F from '../../lib/formClasses'
import { useSitesStore } from '../../stores/sites'
import { useTypesSitesStore } from '../../stores/typesSites'
import { useClientsStore } from '../../stores/clients'
import ZoneSiteEditeur from './ZoneSiteEditeur.vue'
import type { TypeSiteReseau } from '../../types'

const props = defineProps<{ modelValue: boolean; editId?: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const store = useSitesStore()
const typesSites = useTypesSitesStore()
const clients = useClientsStore()
/** Site de livraison d'un client : facultatif, choisi parmi les destinataires du référentiel. */
const optClients = computed<DropdownItem[]>(() => [{ id: '', label: 'Aucun' }, ...clients.destinataires().map(c => ({ id: c.id, label: c.nom, sublabel: c.ville }))])

const form = reactive({ code: '', nom: '', ville: '', region: '', adresse: '', type: '' as TypeSiteReseau | '', actif: true, lat: null as number | null, lng: null as number | null, rayonM: null as number | null, tiers: false, proprietaireTiers: '', email: '', clientId: '' })
/* Le rayon proposé suit le type choisi, tant qu'il n'a pas été réglé à la main. */
watch(() => form.type, t => { const d = typesSites.get(t); if (d && (form.rayonM == null || typesSites.types.some(x => x.rayonDefautM === form.rayonM))) form.rayonM = d.rayonDefautM })
const errors = reactive<Partial<Record<string, string>>>({})
const submitError = ref('')
const submitting = ref(false)

watch(() => props.modelValue, open => {
  if (!open) return
  Object.keys(errors).forEach(k => delete errors[k])
  submitError.value = ''
  if (props.editId) {
    const s = store.getById(props.editId)
    if (s) Object.assign(form, { code: s.code, nom: s.nom, ville: s.ville, region: s.region ?? '', adresse: s.adresse ?? '', type: s.type, actif: s.actif, lat: s.lat, lng: s.lng, rayonM: s.rayonM ?? null, tiers: !!s.proprietaireTiers, proprietaireTiers: s.proprietaireTiers ?? '', email: s.email ?? '', clientId: s.clientId ?? '' })
  } else {
    Object.assign(form, { code: '', nom: '', ville: '', region: '', adresse: '', type: '', actif: true, lat: null, lng: null, rayonM: null, tiers: false, proprietaireTiers: '', email: '', clientId: '' })
  }
})

function valider(): boolean {
  let ok = true
  if (!form.code.trim()) { errors.code = 'Le code est obligatoire.'; ok = false } else delete errors.code
  if (!form.type) { errors.type = 'Le type est obligatoire.'; ok = false } else delete errors.type
  if (!form.nom.trim()) { errors.nom = 'Le nom est obligatoire.'; ok = false } else delete errors.nom
  if (!form.ville.trim()) { errors.ville = 'La ville est obligatoire.'; ok = false } else delete errors.ville
  if (!props.editId && store.sites.some(s => s.code === form.code.trim().toUpperCase())) {
    errors.code = 'Ce code existe déjà.'; ok = false
  }
  if (form.tiers && !form.proprietaireTiers.trim()) { errors.tiers = 'Indiquez le tiers à qui appartient le site.'; ok = false } else delete errors.tiers
  if (form.lat == null || form.lng == null) { errors.zone = 'Placez le centre de la zone sur la carte.'; ok = false } else delete errors.zone
  return ok
}

function handleSubmit() {
  submitError.value = ''
  if (!valider()) return
  submitting.value = true
  const donnees = {
    code: form.code.trim().toUpperCase(), nom: form.nom.trim(), ville: form.ville.trim(),
    region: form.region.trim() || undefined, adresse: form.adresse.trim() || undefined, type: form.type as TypeSiteReseau,
    lat: form.lat!, lng: form.lng!, rayonM: form.rayonM ?? undefined, actif: form.actif,
    proprietaireTiers: form.tiers ? form.proprietaireTiers.trim() : undefined,
    email: form.email.trim() || undefined,
    clientId: form.clientId || undefined,
  }
  const { code: _c, ...modifs } = donnees
  const r = props.editId ? store.modifier(props.editId, modifs) : store.creer(donnees)
  submitting.value = false
  if (!r.ok) { submitError.value = r.motif ?? ''; return }
  emit('saved')
  emit('update:modelValue', false)
}

const optType = computed<DropdownItem[]>(() => typesSites.types.filter(t => t.actif).map(t => ({ id: t.libelle, label: t.libelle })))
</script>

<template>
  <CreateModalShell
    v-if="modelValue"
    :title="editId ? 'Modifier le site' : 'Nouveau site'"
    :banner-label="editId ? 'Sites · Modification' : 'Sites · Création'"
    :create-label="editId ? 'Enregistrer' : 'Créer le site'"
    :is-saving="submitting"
    :save-error="submitError || null"
    @close="$emit('update:modelValue', false)"
    @create="handleSubmit"
  >
    <template #form>
      <div class="flex-1 overflow-y-auto px-8 py-6 max-w-2xl mx-auto">
        <FormSection title="Informations du site">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field">
              <label :class="F.fieldLabel">Code *</label>
              <input v-model="form.code" type="text" placeholder="ex. DEP-TNJ-02" :class="F.fieldInput" class="font-mono" @input="form.code = (form.code as string).toUpperCase()" />
              <p v-if="errors.code" class="text-danger text-[11px]">{{ errors.code }}</p>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Type *</label>
              <SearchableDropdown v-model="form.type" :items="optType" placeholder="Sélectionner un type" />
              <p v-if="errors.type" class="text-danger text-[11px]">{{ errors.type }}</p>
            </div>
            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Nom complet *</label>
              <input v-model="form.nom" type="text" placeholder="ex. Entrepôt secondaire Tanjombato" :class="F.fieldInput" />
              <p v-if="errors.nom" class="text-danger text-[11px]">{{ errors.nom }}</p>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Ville *</label>
              <input v-model="form.ville" type="text" placeholder="ex. Antananarivo" :class="F.fieldInput" />
              <p v-if="errors.ville" class="text-danger text-[11px]">{{ errors.ville }}</p>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Région</label>
              <input v-model="form.region" type="text" placeholder="ex. Analamanga" :class="F.fieldInput" />
            </div>
            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Adresse</label>
              <input v-model="form.adresse" type="text" :class="F.fieldInput" />
            </div>
            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Adresse e-mail</label>
              <input v-model="form.email" type="email" placeholder="ex. chargement@depot.mg" :class="F.fieldInput" />
            </div>
            <div :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Client</label>
              <SearchableDropdown v-model="form.clientId" :items="optClients" placeholder="Facultatif : site de livraison d'un client" />
            </div>
            <div class="col-span-2 flex items-center gap-3 pt-1">
              <input id="actifModal" v-model="form.actif" type="checkbox" class="w-4 h-4 rounded" />
              <label for="actifModal" class="text-[13px] font-medium text-foreground cursor-pointer">Site actif</label>
            </div>
            <div class="col-span-2 flex items-center gap-3">
              <input id="tiersModal" v-model="form.tiers" type="checkbox" class="w-4 h-4 rounded" />
              <label for="tiersModal" class="text-[13px] font-medium text-foreground cursor-pointer">Appartient à un tiers</label>
            </div>
            <div v-if="form.tiers" :class="[F.field, 'col-span-2']">
              <label :class="F.fieldLabel">Tiers propriétaire *</label>
              <input v-model="form.proprietaireTiers" type="text" placeholder="ex. Société de stockage pétrolier" :class="F.fieldInput" />
              <p v-if="errors.tiers" class="text-danger text-[11px]">{{ errors.tiers }}</p>
            </div>
          </div>
        </FormSection>
        <FormSection title="Zone de géorepérage">
          <ZoneSiteEditeur v-model:lat="form.lat" v-model:lng="form.lng" v-model:rayon-m="form.rayonM" :couleur="typesSites.get(form.type)?.couleur" editable :libelle="form.nom || 'Nouveau site'" />
          <p v-if="errors.zone" class="text-danger text-[11px] mt-1">{{ errors.zone }}</p>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
