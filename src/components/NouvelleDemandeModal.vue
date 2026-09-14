<template>
  <ModalShell :ouvert="ouvert" titre="Nouvelle demande de congé" @fermer="fermer">
    <div class="flex flex-col gap-4">

      <div :class="F.field">
        <label :class="F.fieldLabel">Employé *</label>
        <SearchableDropdown v-model="form.personnelId" :items="optPersonnel" placeholder="Sélectionner…" />
      </div>

      <div :class="F.field">
        <label :class="F.fieldLabel">Type de congé *</label>
        <SearchableDropdown v-model="form.typeId" :items="optTypes" placeholder="Sélectionner…" />
        <span v-if="typeChoisi" :class="F.fieldHint">
          {{ typeChoisi.droitAnnuel !== null ? `${typeChoisi.droitAnnuel} j/an` : 'Sans droit annuel fixe' }}
          <template v-if="typeChoisi.preavisJours > 0"> · préavis {{ typeChoisi.preavisJours }} j</template>
          <template v-if="typeChoisi.justificatif"> · justificatif requis</template>
        </span>
      </div>

      <div :class="F.fieldRow">
        <div :class="F.field">
          <label :class="F.fieldLabel">Date de début *</label>
          <input type="date" v-model="form.debut" :class="F.fieldInput" />
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Date de fin *</label>
          <input type="date" v-model="form.fin" :class="F.fieldInput" />
        </div>
      </div>

      <div v-if="form.debut && form.fin" class="flex items-center gap-2 bg-background rounded-md px-3 py-2 text-[12px]">
        <CalendarCheck class="w-4 h-4 text-primary shrink-0" />
        <span v-if="joursOuvresCalcules > 0">
          <strong>{{ joursOuvresCalcules }}</strong> jour(s) ouvré(s) décompté(s)
          <span v-if="joursFeriesDansPeriode > 0" class="text-muted-foreground">
            ({{ joursFeriesDansPeriode }} jour(s) férié(s) exclu(s))
          </span>
        </span>
        <span v-else class="text-danger">La date de fin doit suivre la date de début.</span>
      </div>

      <div v-if="soldeInsuffisant" class="flex items-center gap-2 bg-danger-bg text-danger rounded-md px-3 py-2 text-[12px]">
        <TriangleAlert class="w-4 h-4 shrink-0" />
        Solde insuffisant : {{ soldeDisponible }} jour(s) disponible(s) pour ce type.
      </div>

      <div :class="F.field">
        <label :class="F.fieldLabel">Motif <span class="text-muted-foreground font-normal">(optionnel)</span></label>
        <textarea v-model="form.motif" rows="2" :class="F.fieldTextarea" placeholder="Précisez si nécessaire…"></textarea>
      </div>

      <p v-if="erreur" class="text-[12px] text-danger">{{ erreur }}</p>
    </div>

    <template #pied>
      <button :class="cls.btnPrimary" @click="soumettre"><Send class="w-4 h-4" /> Soumettre</button>
      <button :class="cls.btnOutline" @click="fermer">Annuler</button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
/**
 * Formulaire de demande de congé, réellement fonctionnel : calcule les
 * jours ouvrés décomptés en excluant les jours fériés, vérifie le solde
 * disponible et crée une vraie demande « en attente » dans le store.
 */
import { ref, computed, watch } from 'vue'
import { CalendarCheck, Send, TriangleAlert } from '@lucide/vue'
import ModalShell from './ui/ModalShell.vue'
import SearchableDropdown from './ui/SearchableDropdown.vue'
import type { DropdownItem } from './ui/SearchableDropdown.vue'
import * as F from '../lib/formClasses'
import * as cls from '../lib/formClasses'
import { useAuthStore } from '../stores/auth'
import { usePersonnelStore } from '../stores/personnel'
import { useClassificationStore } from '../stores/classification'
import { useCalendrierStore } from '../stores/calendrier'
import { useAbsenceStore } from '../stores/absences'
import { aujourdhuiISO } from '../utils/horloge'

const props = defineProps<{ ouvert: boolean; personnelIdFixe?: string }>()
const emit = defineEmits<{ fermer: []; cree: [] }>()

const auth = useAuthStore()
const personnel = usePersonnelStore()
const classification = useClassificationStore()
const cal = useCalendrierStore()
const absences = useAbsenceStore()

const AUJOURDHUI = aujourdhuiISO()

const vide = () => ({ personnelId: props.personnelIdFixe ?? '', typeId: '', debut: '', fin: '', motif: '' })
const form = ref(vide())
const erreur = ref('')

watch(() => props.ouvert, o => {
  if (o) { form.value = vide(); erreur.value = '' }
})

const personnesEligibles = computed(() => personnel.actifs)
const optPersonnel = computed<DropdownItem[]>(() =>
  personnesEligibles.value.map(p => ({ id: p.id, label: p.nomComplet, sublabel: p.fonctionLibelle })))
const optTypes = computed<DropdownItem[]>(() =>
  classification.typesConge.filter(t => t.actif).map(t => ({ id: t.id, label: t.libelle })))

const typeChoisi = computed(() => classification.typesConge.find(t => t.id === form.value.typeId) ?? null)

/** Jours ouvrés entre début et fin, jours fériés exclus · jamais saisis à la main. */
function joursOuvresEntre(debut: string, fin: string): { jours: number; feries: number } {
  if (!debut || !fin || fin < debut) return { jours: 0, feries: 0 }
  let jours = 0, feries = 0
  const d = new Date(debut + 'T00:00:00')
  const f = new Date(fin + 'T00:00:00')
  for (let cur = new Date(d); cur <= f; cur.setDate(cur.getDate() + 1)) {
    const iso = cur.toISOString().slice(0, 10)
    const jourSemaine = (cur.getDay() + 6) % 7
    if (!cal.joursOuvres[jourSemaine]) continue
    if (cal.estFerie(iso)) { feries++; continue }
    jours++
  }
  return { jours, feries }
}

const calcul = computed(() => joursOuvresEntre(form.value.debut, form.value.fin))
const joursOuvresCalcules = computed(() => calcul.value.jours)
const joursFeriesDansPeriode = computed(() => calcul.value.feries)

const soldeDisponible = computed(() => {
  if (!form.value.personnelId || !typeChoisi.value) return null
  const s = absences.monSolde(form.value.personnelId)
  if (!s) return null
  const cle: Record<string, keyof typeof s> = {
    'Congé annuel': 'congeAnnuel', 'Récupération': 'recuperation',
    'Congé maladie': 'maladie', 'Permission exceptionnelle': 'permission',
  }
  const champ = cle[typeChoisi.value.libelle]
  return champ ? (s[champ] as number) : null
})

const soldeInsuffisant = computed(() =>
  soldeDisponible.value !== null && joursOuvresCalcules.value > soldeDisponible.value,
)

function fermer() { emit('fermer') }

function soumettre() {
  erreur.value = ''
  if (!form.value.personnelId) { erreur.value = "Choisissez l'employé concerné."; return }
  if (!form.value.typeId) { erreur.value = 'Choisissez un type de congé.'; return }
  if (!form.value.debut || !form.value.fin) { erreur.value = 'Renseignez les deux dates.'; return }
  if (form.value.fin < form.value.debut) { erreur.value = 'La date de fin doit suivre la date de début.'; return }
  if (joursOuvresCalcules.value === 0) { erreur.value = 'Aucun jour ouvré dans cette période.'; return }

  const p = personnel.parId(form.value.personnelId)
  if (!p || !typeChoisi.value) return

  absences.creerDemande({
    personnelId: p.id,
    nom: p.nomComplet,
    type: typeChoisi.value.libelle,
    debut: form.value.debut,
    fin: form.value.fin,
    jours: joursOuvresCalcules.value,
    soumisLe: AUJOURDHUI,
  })

  emit('cree')
  fermer()
}
</script>
