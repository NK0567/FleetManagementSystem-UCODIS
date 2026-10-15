<script setup lang="ts">
/** Dépôt d'un document de l'entreprise : il reste en attente jusqu'à sa validation (FMS-SC-02). */
import { ref, computed, watch } from 'vue'
import { Paperclip, X } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useDocumentsEntrepriseStore } from '../../stores/documentsEntreprise'
import { useTypesDocumentsStore } from '../../stores/typesDocuments'
import { useEntiteStore } from '../../stores/entites'
import { useAuthStore } from '../../stores/auth'
import { aujourdhuiISO } from '../../utils/horloge'
import type { PieceJointe } from '../../types'
import * as F from '../../lib/formClasses'

const props = defineProps<{ remplaceId?: string }>()
const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = useDocumentsEntrepriseStore()
const types = useTypesDocumentsStore()
const entites = useEntiteStore()
const auth = useAuthStore()

const ancien = computed(() => props.remplaceId ? store.getById(props.remplaceId) : undefined)
const form = ref({ type: ancien.value?.type ?? '', nom: ancien.value?.nom ?? '', entiteId: ancien.value?.entiteId ?? '', motsCles: ancien.value?.motsCles.join(', ') ?? '', dateDocument: aujourdhuiISO(), dateFin: '' })
const scan = ref<PieceJointe | null>(null)
const erreur = ref('')
const optTypes = computed<DropdownItem[]>(() => types.deCible('entreprise').map(t => ({ id: t.code, label: t.libelle })))
const optEntites = computed<DropdownItem[]>(() => entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))
const def = computed(() => types.get(form.value.type))
watch(() => [form.value.type, form.value.dateDocument], () => {
  if (!form.value.nom && def.value) form.value.nom = def.value.libelle
  if (def.value?.validite === 'limitee' && def.value.dureeMois && form.value.dateDocument) {
    const f = new Date(form.value.dateDocument); f.setMonth(f.getMonth() + def.value.dureeMois); form.value.dateFin = f.toISOString().slice(0, 10)
  } else form.value.dateFin = ''
})
function chargerScan(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (f.size > 2_000_000) { erreur.value = 'Le fichier dépasse 2 Mo.'; return }
  const lecteur = new FileReader()
  lecteur.onload = () => { scan.value = { nom: f.name, dataUrl: String(lecteur.result) }; erreur.value = '' }
  lecteur.readAsDataURL(f)
}
function deposer() {
  const f = form.value
  const r = store.deposer({ type: f.type, nom: f.nom, entiteId: f.entiteId || undefined, motsCles: f.motsCles.split(',').map(m => m.trim()).filter(Boolean),
    dateDocument: f.dateDocument, dateFin: def.value?.validite === 'limitee' ? f.dateFin || undefined : undefined, scan: scan.value ?? undefined,
    deposePar: auth.user?.nom ?? 'Utilisateur' }, props.remplaceId)
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell :title="ancien ? 'Nouvelle version du document' : 'Déposer un document'" banner-label="Flotte · Documents de l'entreprise" create-label="Déposer" :save-error="erreur || null" @close="emit('close')" @create="deposer">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Document">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Type *</label><SearchableDropdown v-model="form.type" :items="optTypes" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Nom *</label><input v-model="form.nom" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Entité</label><SearchableDropdown v-model="form.entiteId" :items="optEntites" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Mots-clés (séparés par une virgule)</label><input v-model="form.motsCles" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Date du document *</label><input v-model="form.dateDocument" type="date" :class="F.fieldInput" /></div>
            <div v-if="def?.validite === 'limitee'" :class="F.field"><label :class="F.fieldLabel">Fin de validité *</label><input v-model="form.dateFin" type="date" :class="F.fieldInput" /></div>
          </div>
        </FormSection>
        <FormSection title="Fichier">
          <div v-if="scan" class="flex items-center gap-3"><span class="text-sm text-foreground flex-1 truncate">{{ scan.nom }}</span>
            <button class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Retirer le fichier" @click="scan = null"><X class="w-4 h-4" /></button></div>
          <label v-else class="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
            <Paperclip class="w-4 h-4 text-muted-foreground" /><span class="text-xs text-muted-foreground">Fichier du document *</span>
            <input type="file" class="hidden" @change="chargerScan" />
          </label>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>
