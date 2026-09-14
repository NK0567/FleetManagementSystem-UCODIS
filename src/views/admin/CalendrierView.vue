<template>
  <div :class="L.pageWrap">

    <!-- En-tête -->
    <div class="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-foreground">Calendrier de l'entreprise</h1>
        <p class="text-[13px] text-muted-foreground mt-0.5">
          Jours ouvrables, jours fériés et règles de congé
        </p>
        <span class="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-card border border-border rounded-full px-2.5 py-[3px] mt-2">
          <ClockArrowDown class="w-3 h-3" />
          Dernière mise à jour : {{ cal.majLe }} par {{ cal.majPar }}
        </span>
      </div>
      <button :class="L.btnPrimary" class="disabled:opacity-45 disabled:cursor-not-allowed"
              :disabled="!peutModifier || !modifie" @click="enregistrer">
        <Save class="w-4 h-4" /> Enregistrer les modifications
      </button>
    </div>

    <div v-if="toast" class="fixed bottom-6 right-6 bg-success text-white px-5 py-3 rounded-lg text-[13px] font-medium flex items-center gap-2 z-[2000] shadow-[0_4px_16px_rgba(0,0,0,0.16)]">
      <Check class="w-4 h-4" /> Calendrier mis à jour
    </div>

    <!-- Onglets -->
    <div class="flex gap-1 border-b-[1.5px] border-border mb-5 overflow-x-auto">
      <button v-for="t in ONGLETS" :key="t.id" :class="[tabBtn, onglet === t.id && tabActif]" @click="onglet = t.id">
        <component :is="t.icone" class="w-4 h-4" /> {{ t.libelle }}
      </button>
    </div>

    <!-- ═══ Jours de travail ═══ -->
    <div v-if="onglet === 'jours'" :class="carte">
      <h2 class="text-[15px] font-semibold text-foreground mb-4">Jours ouvrables</h2>

      <div class="flex flex-col gap-0.5">
        <div
          v-for="(j, i) in cal.jours" :key="i"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors flex-nowrap min-h-[44px] max-md:flex-wrap"
          :class="j.actif && 'bg-primary/10'"
        >
          <span class="text-[13px] font-medium text-foreground w-[90px] shrink-0">{{ cal.LIBELLES_JOURS[i] }}</span>

          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" class="sr-only peer" :checked="j.actif" :disabled="!peutModifier"
                   @change="cal.basculerJour(i); modifie = true" />
            <span :class="toggleTrack"></span>
          </label>

          <template v-if="j.actif">
            <input type="time" v-model="j.debut" :class="timeInput" :disabled="!peutModifier" @change="modifie = true" />
            <span :class="sep">→</span>
            <input type="time" v-model="j.fin" :class="timeInput" :disabled="!peutModifier" @change="modifie = true" />
            <span class="text-[11px] font-semibold text-primary bg-primary/10 rounded px-2 py-0.5 whitespace-nowrap shrink-0">
              {{ cal.formatMinutes(cal.minutesEffectives(j)) }} eff.
            </span>

            <span class="text-border text-base select-none shrink-0 max-md:hidden" aria-hidden="true">|</span>

            <label class="flex items-center gap-1.5 cursor-pointer shrink-0">
              <span class="relative inline-flex items-center shrink-0">
                <input type="checkbox" class="sr-only peer" :checked="j.pauseActive" :disabled="!peutModifier"
                       @change="cal.bascculerPause(i); modifie = true" />
                <span :class="toggleTrackSm"></span>
              </span>
              <span class="text-[11px] text-muted-foreground whitespace-nowrap">Pause</span>
            </label>

            <template v-if="j.pauseActive">
              <input type="time" v-model="j.pauseDebut" :class="timeInputSm" :disabled="!peutModifier" @change="modifie = true" />
              <span :class="sep">→</span>
              <input type="time" v-model="j.pauseFin" :class="timeInputSm" :disabled="!peutModifier" @change="modifie = true" />
            </template>
            <span v-else class="text-[11px] text-muted-foreground italic whitespace-nowrap">Aucune pause</span>
          </template>
          <span v-else class="text-[11px] text-muted-foreground italic">Jour non travaillé</span>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-3.5 px-3.5 py-2.5 rounded-lg bg-background border border-border text-[13px] font-medium text-foreground">
        <Clock class="w-[15px] h-[15px] text-primary" />
        {{ cal.nbJoursOuvres }} jour{{ cal.nbJoursOuvres > 1 ? 's' : '' }}
        · {{ cal.formatMinutes(cal.minutesHebdo) }} par semaine
      </div>

      <p class="text-[12px] text-muted-foreground mt-3.5 leading-relaxed">
        Le transport longue distance d'UCODIS roule le samedi, d'où la semaine à six jours.
        Ces horaires concernent le personnel sédentaire ; pour le personnel roulant, ce sont
        les temps de conduite et de repos, réglables dans Règles et seuils, qui font foi.
        Aucun document UCODIS ne fixe ces horaires : ils restent à confirmer.
      </p>
    </div>

    <!-- ═══ Jours fériés ═══ -->
    <div v-if="onglet === 'feries'">
      <div :class="carte">
        <div :class="enteteSection">
          <h2 class="text-[15px] font-semibold text-foreground">Fériés annuels</h2>
          <button v-if="peutModifier" :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="ouvrirAjoutFerie(true)">
            <Plus class="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
        <TableFeries :feries="feriesAnnuels" :modifiable="peutModifier" @modifier="ouvrirEditionFerie" @supprimer="supprimer" />
      </div>

      <div :class="carte">
        <div :class="enteteSection">
          <h2 class="text-[15px] font-semibold text-foreground">Fériés ponctuels</h2>
          <button v-if="peutModifier" :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="ouvrirAjoutFerie(false)">
            <Plus class="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
        <TableFeries :feries="feriesPonctuels" :modifiable="peutModifier" avec-annee @modifier="ouvrirEditionFerie" @supprimer="supprimer" />
        <p class="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
          Pâques et l'Ascension se recalculent chaque année et doivent être revalidées.
          Un jour férié n'est jamais décompté d'un solde de congé.
        </p>
      </div>
    </div>

    <!-- ═══ Types et règles de congé ═══ -->
    <div v-if="onglet === 'types'" :class="carte">
      <div :class="enteteSection">
        <h2 class="text-[15px] font-semibold text-foreground">Types et règles de congé</h2>
        <button v-if="peutModifier" :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="ouvrirAjoutType">
          <Plus class="w-3.5 h-3.5" /> Ajouter un type
        </button>
      </div>

      <div class="overflow-x-auto">
        <table :class="tableau">
          <thead>
            <tr>
              <th :class="th" style="width:36px"></th>
              <th :class="th">Nom</th>
              <th :class="[th, 'text-center']" style="width:80px">Jours/an</th>
              <th :class="[th, 'text-center']" style="width:90px">Accum./mois</th>
              <th :class="[th, 'text-center']" style="width:90px">Report max</th>
              <th :class="[th, 'text-center']" style="width:70px">Préavis</th>
              <th :class="[th, 'text-center']" style="width:70px">Justif.</th>
              <th :class="[th, 'text-center']" style="width:60px">Actif</th>
              <th :class="[th, 'text-center']" style="width:60px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in classification.typesConge" :key="t.id" class="hover:bg-background">
              <td :class="td">
                <div class="w-7 h-7 rounded-md flex items-center justify-center text-white" :style="{ background: t.couleur }">
                  <component :is="ICONES[t.icone]" class="w-3.5 h-3.5" />
                </div>
              </td>
              <td :class="td">
                <span class="text-[13px] font-medium text-foreground mr-1">{{ t.libelle }}</span>
                <Lock v-if="t.systeme" class="w-3 h-3 text-muted-foreground inline-block align-middle" title="Type légalement obligatoire" />
                <div v-if="t.commentaire" class="text-[11px] text-muted-foreground mt-0.5">{{ t.commentaire }}</div>
              </td>
              <td :class="[td, 'text-center']">
                <input v-if="t.droitAnnuel !== null" type="number" min="0" :class="ruleInput"
                       v-model.number="t.droitAnnuel" :disabled="!peutModifier" @change="modifie = true" />
                <span v-else class="text-[11px] text-muted-foreground">Sans droit fixe</span>
              </td>
              <td :class="[td, 'text-center']">
                <input v-if="t.accumMensuelle !== null" type="number" min="0" step="0.5" :class="ruleInput"
                       v-model.number="t.accumMensuelle" :disabled="!peutModifier" @change="modifie = true" />
                <span v-else>·</span>
              </td>
              <td :class="[td, 'text-center']">
                <span v-if="!t.reportMax" class="text-[11px] text-muted-foreground">Aucun</span>
                <span v-else class="text-[11px] font-medium text-info">{{ t.reportMax }}j max</span>
              </td>
              <td :class="[td, 'text-center']">
                <input type="number" min="0" :class="ruleInput" v-model.number="t.preavisJours"
                       :disabled="!peutModifier" @change="modifie = true" />
              </td>
              <td :class="[td, 'text-center']">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" class="sr-only peer" :checked="t.justificatif" :disabled="!peutModifier"
                         @change="t.justificatif = !t.justificatif; modifie = true" />
                  <span :class="toggleTrack"></span>
                </label>
              </td>
              <td :class="[td, 'text-center']">
                <label class="relative inline-flex items-center cursor-pointer" :title="t.systeme ? 'Toujours actif' : ''">
                  <input type="checkbox" class="sr-only peer" :checked="t.actif" :disabled="!peutModifier || t.systeme"
                         @change="t.actif = !t.actif; modifie = true" />
                  <span :class="[toggleTrack, 'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed']"></span>
                </label>
              </td>
              <td :class="[td, 'text-center']">
                <div class="flex gap-1 items-center justify-center">
                  <button :class="iconBtn" title="Modifier" :disabled="!peutModifier" @click="ouvrirEditionType(t)"><Pencil class="w-3.5 h-3.5" /></button>
                  <button v-if="!t.systeme" :class="[iconBtn, 'hover:!bg-danger-bg hover:!text-danger']" title="Supprimer" :disabled="!peutModifier"
                          @click="confirmerSuppressionType(t)">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[11px] text-muted-foreground mt-3.5 pt-3 border-t border-border leading-relaxed">
        Les durées de congé annuel et de maternité reprennent le code du travail malgache ;
        elles ne figurent dans aucun document UCODIS et restent à confirmer. Les types
        « légalement obligatoires » ne peuvent pas être désactivés.
      </p>
    </div>

    <!-- ═══ Modale : jour férié ═══ -->
    <ModalShell :ouvert="modaleFerie.ouvert" :titre="modaleFerie.id ? 'Modifier le jour férié' : 'Nouveau jour férié'" @fermer="modaleFerie.ouvert = false">
      <div class="flex flex-col gap-3.5">
        <div :class="F.field">
          <label :class="F.fieldLabel">Libellé *</label>
          <input v-model="modaleFerie.libelle" :class="F.fieldInput" placeholder="Ex. Fête de la victoire" />
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Date *</label>
          <input v-model="modaleFerie.date" type="date" :class="F.fieldInput" />
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="modaleFerie.recurrent" class="accent-[var(--ucodis-red)]" />
          <span class="text-[13px] text-foreground">Férié annuel (même date chaque année)</span>
        </label>
        <p v-if="erreurFerie" class="text-[12px] text-danger">{{ erreurFerie }}</p>
      </div>
      <template #pied>
        <button :class="cls.btnPrimary" @click="validerFerie"><Check class="w-4 h-4" /> {{ modaleFerie.id ? 'Enregistrer' : 'Créer' }}</button>
        <button :class="cls.btnOutline" @click="modaleFerie.ouvert = false">Annuler</button>
      </template>
    </ModalShell>

    <!-- ═══ Modale : type de congé ═══ -->
    <ModalShell :ouvert="modaleType.ouvert" :titre="modaleType.id ? 'Modifier le type de congé' : 'Nouveau type de congé'" @fermer="modaleType.ouvert = false">
      <div class="flex flex-col gap-3.5">
        <div :class="F.fieldRow">
          <div :class="F.field">
            <label :class="F.fieldLabel">Code *</label>
            <input v-model="modaleType.code" :class="F.fieldInput" placeholder="Ex. FOR" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Icône</label>
            <SearchableDropdown v-model="modaleType.icone" :items="optIcones" placeholder="Sélectionner…" />
          </div>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Libellé *</label>
          <input v-model="modaleType.libelle" :class="F.fieldInput" placeholder="Ex. Congé formation" />
        </div>
        <div :class="F.fieldRow">
          <div :class="F.field">
            <label :class="F.fieldLabel">Jours par an</label>
            <input v-model.number="modaleType.droitAnnuel" type="number" min="0" :class="F.fieldInput" placeholder="Laisser vide si sans droit fixe" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Préavis (jours)</label>
            <input v-model.number="modaleType.preavisJours" type="number" min="0" :class="F.fieldInput" />
          </div>
        </div>
        <div class="flex gap-5">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="modaleType.justificatif" class="accent-[var(--ucodis-red)]" />
            <span class="text-[13px] text-foreground">Justificatif exigé</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="modaleType.remunere" class="accent-[var(--ucodis-red)]" />
            <span class="text-[13px] text-foreground">Rémunéré</span>
          </label>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Note <span class="text-muted-foreground font-normal">(optionnel)</span></label>
          <input v-model="modaleType.commentaire" :class="F.fieldInput" placeholder="Ex. Justificatif exigé sous 48 heures" />
        </div>
        <p v-if="erreurType" class="text-[12px] text-danger">{{ erreurType }}</p>
      </div>
      <template #pied>
        <button :class="cls.btnPrimary" @click="validerType"><Check class="w-4 h-4" /> {{ modaleType.id ? 'Enregistrer' : 'Créer' }}</button>
        <button :class="cls.btnOutline" @click="modaleType.ouvert = false">Annuler</button>
      </template>
    </ModalShell>

    <ConfirmDialog
      :open="confirmation.ouvert"
      :title="confirmation.titre"
      :message="confirmation.message"
      confirm-label="Supprimer"
      destructive
      @confirm="confirmation.onConfirm(); confirmation.ouvert = false"
      @cancel="confirmation.ouvert = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, defineComponent, h, type Component, type PropType } from 'vue'
import {
  Calendar, CalendarDays, CalendarRange, Check, Clock, ClockArrowDown, Heart, Home,
  Lock, Pencil, Plus, Save, Star, Stethoscope, Tag, Trash2,
} from '@lucide/vue'
import ModalShell from '../../components/ui/ModalShell.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue'
import * as F from '../../lib/formClasses'
import * as cls from '../../lib/formClasses'
import * as L from '../../lib/listClasses'
import { formatDate } from '../../utils/helpers'
import { useAuthStore } from '../../stores/auth'
import { useCalendrierStore } from '../../stores/calendrier'
import { useClassificationStore } from '../../stores/classification'
import type { JourFerie } from '../../stores/calendrier'

const auth = useAuthStore()
const cal = useCalendrierStore()
const classification = useClassificationStore()

const carte = 'bg-card border border-border rounded-lg p-5 mb-4'
const enteteSection = 'flex items-center justify-between mb-4 gap-3 flex-wrap'
const tabBtn = 'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium text-muted-foreground border-b-2 border-transparent cursor-pointer whitespace-nowrap transition-colors hover:text-foreground'
const tabActif = '!text-primary !border-primary'
const tableau = 'w-full border-collapse text-[13px]'
const th = 'text-left px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] bg-background border-b border-border'
const td = 'px-3 py-2.5 border-b border-border align-middle'
const iconBtn = 'w-7 h-7 flex items-center justify-center border-0 rounded-md bg-background text-muted-foreground cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed'
const ruleInput = 'w-[60px] h-7 px-1.5 text-center border border-border rounded bg-background text-xs text-foreground outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed'
const toggleTrack = "w-9 h-5 rounded-full bg-foreground/20 transition-colors peer-checked:bg-primary relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-3.5 after:h-3.5 after:bg-white after:rounded-full after:shadow after:transition-all peer-checked:after:left-[19px]"
const toggleTrackSm = "w-7 h-4 rounded-full bg-foreground/20 transition-colors peer-checked:bg-primary relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-2.5 after:h-2.5 after:bg-white after:rounded-full after:transition-all peer-checked:after:left-[15px]"
const sep = 'text-muted-foreground text-sm shrink-0'
const timeInput = 'h-8 px-2 border border-border rounded-md text-[13px] text-foreground bg-card outline-none w-24 shrink-0 transition-colors focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed'
const timeInputSm = 'h-7 px-2 border border-border rounded-md text-xs text-foreground bg-card outline-none w-20 shrink-0 transition-colors focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed'

const ICONES: Record<string, Component> = { calendar: Calendar, stethoscope: Stethoscope, heart: Heart, clock: Clock, star: Star, home: Home }

const ONGLETS = [
  { id: 'jours',  libelle: 'Jours de travail', icone: CalendarRange },
  { id: 'feries', libelle: 'Jours fériés',     icone: CalendarDays },
  { id: 'types',  libelle: 'Types de congé',   icone: Tag },
]
const onglet = ref('jours')

/** Le responsable flotte gère aussi le calendrier, au même titre que l'administrateur. */
const peutModifier = computed(() => auth.gerePersonnel)
const modifie = ref(false)
const toast = ref(false)

function supprimer(id: string) {
  confirmation.titre = 'Supprimer le jour férié'
  confirmation.message = 'Ce jour férié sera retiré du calendrier. Cette action ne peut pas être annulée dans la maquette.'
  confirmation.onConfirm = () => { cal.supprimerFerie(id); modifie.value = true }
  confirmation.ouvert = true
}

function enregistrer() {
  cal.enregistrer(auth.user?.nom ?? 'Système')
  modifie.value = false
  toast.value = true
  setTimeout(() => { toast.value = false }, 2500)
}

const feriesAnnuels = computed(() => cal.feries.filter(f => f.recurrent))
const feriesPonctuels = computed(() => cal.feries.filter(f => !f.recurrent))

/* ── Confirmation générique ──────────────────────────────────── */
const confirmation = reactive({ ouvert: false, titre: '', message: '', onConfirm: () => {} })

/* ── Modale jour férié ────────────────────────────────────────── */
const modaleFerie = reactive({ ouvert: false, id: '', libelle: '', date: '', recurrent: true })
const erreurFerie = ref('')

function ouvrirAjoutFerie(recurrent: boolean) {
  Object.assign(modaleFerie, { ouvert: true, id: '', libelle: '', date: '', recurrent })
  erreurFerie.value = ''
}
function ouvrirEditionFerie(f: JourFerie) {
  Object.assign(modaleFerie, { ouvert: true, id: f.id, libelle: f.libelle, date: f.date, recurrent: f.recurrent })
  erreurFerie.value = ''
}
function validerFerie() {
  if (!modaleFerie.libelle.trim() || !modaleFerie.date) {
    erreurFerie.value = 'Le libellé et la date sont obligatoires.'
    return
  }
  const patch = { libelle: modaleFerie.libelle.trim(), date: modaleFerie.date, recurrent: modaleFerie.recurrent }
  if (modaleFerie.id) cal.mettreAJourFerie(modaleFerie.id, patch)
  else cal.creerFerie(patch)
  modifie.value = true
  modaleFerie.ouvert = false
}

/* ── Modale type de congé ─────────────────────────────────────── */
const COULEURS_TYPE = ['#1D4ED8', '#15803D', '#92400E', '#BE185D', '#6D28D9', '#6B7280', '#C2410C', '#0891B2']
const optIcones: DropdownItem[] = [
  { id: 'calendar', label: 'Calendrier' }, { id: 'stethoscope', label: 'Médical' },
  { id: 'clock', label: 'Horloge' }, { id: 'heart', label: 'Cœur' },
  { id: 'star', label: 'Étoile' }, { id: 'home', label: 'Maison' },
]
const modaleType = reactive({
  ouvert: false, id: '', code: '', libelle: '', icone: 'calendar',
  droitAnnuel: null as number | null, preavisJours: 0, justificatif: false, remunere: true, commentaire: '',
})
const erreurType = ref('')

function ouvrirAjoutType() {
  Object.assign(modaleType, {
    ouvert: true, id: '', code: '', libelle: '', icone: 'calendar',
    droitAnnuel: null, preavisJours: 0, justificatif: false, remunere: true, commentaire: '',
  })
  erreurType.value = ''
}
function ouvrirEditionType(t: (typeof classification.typesConge)[number]) {
  Object.assign(modaleType, {
    ouvert: true, id: t.id, code: t.code, libelle: t.libelle, icone: t.icone,
    droitAnnuel: t.droitAnnuel, preavisJours: t.preavisJours, justificatif: t.justificatif,
    remunere: t.remunere, commentaire: t.commentaire ?? '',
  })
  erreurType.value = ''
}
function validerType() {
  if (!modaleType.code.trim() || !modaleType.libelle.trim()) {
    erreurType.value = 'Le code et le libellé sont obligatoires.'
    return
  }
  const patch = {
    code: modaleType.code.trim(), libelle: modaleType.libelle.trim(), icone: modaleType.icone,
    droitAnnuel: modaleType.droitAnnuel, preavisJours: modaleType.preavisJours,
    justificatif: modaleType.justificatif, remunere: modaleType.remunere,
    commentaire: modaleType.commentaire.trim() || undefined,
  }
  if (modaleType.id) {
    classification.mettreAJourTypeConge(modaleType.id, patch)
  } else {
    const couleur = COULEURS_TYPE[classification.typesConge.length % COULEURS_TYPE.length]!
    classification.creerTypeConge({
      ...patch, couleur, systeme: false, actif: true, accumMensuelle: null, reportMax: null,
    })
  }
  modifie.value = true
  modaleType.ouvert = false
}
function confirmerSuppressionType(t: (typeof classification.typesConge)[number]) {
  confirmation.titre = 'Supprimer le type de congé'
  confirmation.message = `Supprimer « ${t.libelle} » ? Cette action ne peut pas être annulée dans la maquette.`
  confirmation.onConfirm = () => { classification.supprimerTypeConge(t.id); modifie.value = true }
  confirmation.ouvert = true
}

const TableFeries = defineComponent({
  props: {
    feries: { type: Array as PropType<JourFerie[]>, required: true },
    modifiable: { type: Boolean, default: false },
    avecAnnee: { type: Boolean, default: false },
  },
  emits: ['supprimer', 'modifier'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'overflow-x-auto' }, [
        h('table', { class: tableau }, [
          h('thead', {}, h('tr', {}, [
            h('th', { class: th }, 'Libellé'),
            h('th', { class: th }, 'Date'),
            h('th', { class: th }, 'Actions'),
          ])),
          h('tbody', {}, props.feries.length
            ? props.feries.map(f =>
                h('tr', { key: f.id, class: 'hover:bg-background' }, [
                  h('td', { class: td }, f.libelle),
                  h('td', { class: td }, [
                    h('span', { class: 'text-[11px] font-mono bg-background text-muted-foreground px-1.5 py-0.5 rounded border border-border' }, formatDate(f.date)),
                    props.avecAnnee
                      ? h('span', { class: 'text-[10px] font-bold text-white bg-danger rounded px-1.5 py-px ml-1' }, f.date.slice(0, 4))
                      : null,
                  ].filter(Boolean)),
                  h('td', { class: td + ' flex gap-1' }, [
                    h('button', {
                      class: 'w-7 h-7 rounded border-0 bg-background text-muted-foreground flex items-center justify-center cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed',
                      title: 'Modifier', disabled: !props.modifiable,
                      onClick: () => emit('modifier', f),
                    }, h(Pencil, { class: 'w-3.5 h-3.5' })),
                    h('button', {
                      class: 'w-7 h-7 rounded border-0 bg-background text-muted-foreground flex items-center justify-center cursor-pointer transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-40 disabled:cursor-not-allowed',
                      title: 'Supprimer', disabled: !props.modifiable,
                      onClick: () => emit('supprimer', f.id),
                    }, h(Trash2, { class: 'w-3.5 h-3.5' })),
                  ]),
                ]),
              )
            : [h('tr', {}, h('td', { colspan: 3, class: 'text-center text-muted-foreground p-5 text-[13px]' },
                props.avecAnnee ? 'Aucun férié ponctuel' : 'Aucun férié annuel'))]),
        ]),
      ])
  },
})
</script>
