<template>
  <div class="px-7 py-6 max-w-[1100px] mx-auto max-md:p-4">

    <!-- En-tête -->
    <div class="flex items-center justify-between gap-4 mb-5 flex-wrap max-md:flex-col max-md:items-start">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-foreground">Mon planning</h1>
        <span class="text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-[3px] capitalize">
          {{ libelleMois }}
        </span>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button :class="navBtn" title="Semaine précédente" @click="semainePrecedente">
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-[13px] font-medium text-foreground whitespace-nowrap">{{ libelleSemaine }}</span>
        <button :class="navBtn" title="Semaine suivante" @click="semaineSuivante">
          <ChevronRight class="w-4 h-4" />
        </button>
        <button :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="revenirAujourdhui">Aujourd'hui</button>
        <button :class="L.btnPrimary" @click="demandeOuverte = true"><Plus class="w-4 h-4" /> Nouvelle demande</button>
      </div>
    </div>

    <NouvelleDemandeModal
      :ouvert="demandeOuverte"
      :personnel-id-fixe="auth.user?.personnelId"
      @fermer="demandeOuverte = false"
    />

    <!-- Grille de la semaine -->
    <div class="overflow-x-auto mb-5">
      <div class="grid gap-2 min-w-[760px]" style="grid-template-columns: repeat(7, minmax(130px, 1fr))">
        <div
          v-for="j in semaine" :key="j.date"
          class="rounded-[10px] border overflow-hidden min-h-[132px] flex flex-col"
          :class="classeJour(j)"
        >
          <div class="flex items-center gap-2 px-2.5 py-2 border-b border-border">
            <span class="text-[11px] font-bold uppercase tracking-[0.06em]"
                  :class="j.date === aujourdhui ? 'text-primary' : 'text-muted-foreground'">{{ j.abrege }}</span>
            <span class="text-lg font-bold" :class="j.date === aujourdhui ? 'text-primary' : 'text-foreground'">
              {{ j.numero }}
            </span>
            <span v-if="j.date === aujourdhui"
                  class="ml-auto bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-[0.03em]">
              Aujourd'hui
            </span>
          </div>

          <!-- Jour travaillé -->
          <template v-if="j.ouvre && !j.absence && !j.ferie">
            <div class="p-2.5 flex flex-col gap-1.5 flex-1">
              <div :class="ligneInfo"><Clock class="w-3.5 h-3.5 shrink-0" /><span>{{ HORAIRE.debut }} → {{ HORAIRE.fin }}</span></div>
              <div :class="ligneInfo"><Coffee class="w-3.5 h-3.5 shrink-0" /><span>Pause {{ HORAIRE.pauseDebut }} → {{ HORAIRE.pauseFin }}</span></div>
              <div class="text-[11px] font-semibold text-primary mt-1">{{ HEURES_EFFECTIVES }} h effectives</div>
            </div>
          </template>

          <!-- Absence approuvée -->
          <template v-else-if="j.absence && j.absence.statut === 'approuve'">
            <div :class="corpsCentre">
              <span class="inline-block text-[11px] font-semibold text-primary bg-primary/10 rounded-md px-2 py-[3px] text-center break-words">
                {{ j.absence.type }}
              </span>
              <span :class="[pastille, 'bg-success-bg text-success']">Approuvé</span>
            </div>
          </template>

          <!-- Absence en attente -->
          <template v-else-if="j.absence && j.absence.statut === 'attente'">
            <div :class="corpsCentre">
              <span class="inline-block text-[11px] font-semibold text-warning bg-warning-bg rounded-md px-2 py-[3px] text-center break-words">
                {{ j.absence.type }}
              </span>
              <span :class="[pastille, 'bg-warning-bg text-warning']">En attente</span>
            </div>
          </template>

          <!-- Jour férié -->
          <template v-else-if="j.ferie">
            <div :class="corpsCentre">
              <span class="text-xs font-semibold text-info text-center break-words mb-1">{{ j.ferie }}</span>
              <span :class="[pastille, 'bg-info-bg text-info']">Jour férié</span>
            </div>
          </template>

          <!-- Jour non ouvrable -->
          <template v-else>
            <div :class="[corpsCentre, 'text-muted-foreground text-xs']">
              <Moon class="w-5 h-5 mb-1" /><span>Non ouvrable</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Résumé de la semaine -->
    <div class="bg-card border border-border rounded-[10px] p-5">
      <h2 class="text-sm font-semibold text-foreground mb-4">Résumé de la semaine</h2>

      <div class="grid grid-cols-3 gap-3 mb-4 max-md:grid-cols-1">
        <div :class="resume">
          <Briefcase class="w-5 h-5 text-primary shrink-0" />
          <div class="flex flex-col gap-0.5">
            <span class="text-lg font-bold text-foreground">{{ joursTravailles }}/{{ joursOuvrables }}</span>
            <span class="text-[11px] text-muted-foreground">Jours travaillés</span>
          </div>
        </div>
        <div :class="resume">
          <CalendarOff class="w-5 h-5 text-primary shrink-0" />
          <div class="flex flex-col gap-0.5">
            <span class="text-lg font-bold text-foreground">{{ joursAbsence }}</span>
            <span class="text-[11px] text-muted-foreground">Jour(s) d'absence</span>
          </div>
        </div>
        <div :class="resume">
          <Clock class="w-5 h-5 text-primary shrink-0" />
          <div class="flex flex-col gap-0.5">
            <span class="text-lg font-bold text-foreground">{{ heuresPrevues }} h</span>
            <span class="text-[11px] text-muted-foreground">Heures effectives prévues</span>
          </div>
        </div>
      </div>

      <div v-if="solde" class="pt-3 border-t border-border">
        <span class="text-xs font-semibold text-muted-foreground block mb-2.5">Soldes restants</span>
        <div class="flex gap-2 flex-wrap">
          <div v-for="b in soldes" :key="b.libelle"
               class="flex items-center gap-1.5 bg-background border border-border rounded-full px-3 py-1 text-xs">
            <span class="text-muted-foreground">{{ b.libelle }}</span>
            <span class="font-bold text-primary">{{ b.jours }}j</span>
          </div>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
      Les horaires de journée sont affichés à titre indicatif et restent à confirmer.
      Pour le personnel roulant, ce sont les temps de conduite et de repos qui font foi.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Briefcase, CalendarOff, ChevronLeft, ChevronRight, Clock, Coffee, Moon, Plus } from '@lucide/vue'
import * as L from '../../lib/listClasses'
import NouvelleDemandeModal from '../../components/NouvelleDemandeModal.vue'
import { useAuthStore } from '../../stores/auth'
import { useAbsenceStore, type Demande } from '../../stores/absences'
import { useCalendrierStore } from '../../stores/calendrier'
import { aujourdhuiISO, aujourdhuiDate } from '../../utils/horloge'

const auth = useAuthStore()
const demandeOuverte = ref(false)
const absences = useAbsenceStore()
const cal = useCalendrierStore()

const navBtn = 'w-8 h-8 flex items-center justify-center border border-border rounded-md bg-card text-foreground cursor-pointer transition-colors hover:bg-background'
const ligneInfo = 'flex items-center gap-1.5 text-[11px] text-muted-foreground'
const corpsCentre = 'p-2.5 flex flex-col gap-1.5 flex-1 items-center justify-center text-center'
const pastille = 'inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-[0.05em]'
const resume = 'flex items-center gap-3 p-3 bg-background rounded-lg'

/* Horaire indicatif : rien dans les documents UCODIS ne le fixe. */
const HORAIRE = { debut: '07:30', fin: '16:30', pauseDebut: '12:00', pauseFin: '13:00' }
const HEURES_EFFECTIVES = 8

const aujourdhui = aujourdhuiISO()
const ABREGES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Lundi de la semaine affichée. */
const lundi = ref(debutSemaine(aujourdhuiDate()))

function debutSemaine(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7))
  return c
}
function semainePrecedente() {
  const d = new Date(lundi.value); d.setDate(d.getDate() - 7); lundi.value = d
}
function semaineSuivante() {
  const d = new Date(lundi.value); d.setDate(d.getDate() + 7); lundi.value = d
}
function revenirAujourdhui() { lundi.value = debutSemaine(aujourdhuiDate()) }

interface JourPlanning {
  date: string; numero: number; abrege: string
  ouvre: boolean; ferie: string | null; absence: Demande | null
}

const semaine = computed<JourPlanning[]>(() => {
  const out: JourPlanning[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi.value)
    d.setDate(d.getDate() + i)
    const date = d.toISOString().slice(0, 10)
    const f = cal.estFerie(date)
    out.push({
      date,
      numero: d.getDate(),
      abrege: ABREGES[i]!,
      ouvre: cal.joursOuvres[i] ?? false,
      ferie: f?.libelle ?? null,
      absence: maDemandeLe(date),
    })
  }
  return out
})

function maDemandeLe(date: string): Demande | null {
  const id = auth.user?.personnelId
  if (!id) return null
  return absences.mesDemandes(id).find(
    d => (d.statut === 'approuve' || d.statut === 'attente') && d.debut <= date && d.fin >= date,
  ) ?? null
}

function classeJour(j: JourPlanning): string {
  if (j.date === aujourdhui) return '!bg-primary/10 !border-2 !border-primary'
  if (j.absence?.statut === 'approuve') return 'bg-primary/10 border-primary'
  if (j.absence?.statut === 'attente') return 'bg-warning-bg border-warning'
  if (j.ferie) return 'bg-info-bg border-info'
  if (j.ouvre) return 'bg-card border-border'
  return 'bg-background border-border opacity-60'
}

/**
 * Le badge affiche le mois qui contient le plus de jours de la semaine
 * visible, pas systématiquement celui du lundi : sinon la semaine du
 * 31 août au 6 septembre affichait « Août » alors qu'elle est presque
 * entièrement en septembre · et que « aujourd'hui » y est.
 */
const libelleMois = computed(() => {
  const fin = new Date(lundi.value); fin.setDate(fin.getDate() + 6)
  if (lundi.value.getMonth() === fin.getMonth()) {
    return lundi.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }
  // Semaine à cheval sur deux mois : on compte qui a le plus de jours.
  const joursDansMoisDebut = new Date(lundi.value.getFullYear(), lundi.value.getMonth() + 1, 0).getDate() - lundi.value.getDate() + 1
  const moisRef = joursDansMoisDebut >= 4 ? lundi.value : fin
  return moisRef.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})
const libelleSemaine = computed(() => {
  const fin = new Date(lundi.value); fin.setDate(fin.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(lundi.value)} au ${fmt(fin)}`
})

const joursOuvrables = computed(() => semaine.value.filter(j => j.ouvre).length)
const joursAbsence = computed(() => semaine.value.filter(j => j.ouvre && j.absence).length)
const joursFeries = computed(() => semaine.value.filter(j => j.ouvre && j.ferie && !j.absence).length)
const joursTravailles = computed(() => joursOuvrables.value - joursAbsence.value - joursFeries.value)
const heuresPrevues = computed(() => joursTravailles.value * HEURES_EFFECTIVES)

const solde = computed(() =>
  auth.user?.personnelId ? absences.monSolde(auth.user.personnelId) : null,
)
const soldes = computed(() => {
  const s = solde.value
  if (!s) return []
  return [
    { libelle: 'Congé annuel', jours: s.congeAnnuel },
    { libelle: 'Récupération', jours: s.recuperation },
    { libelle: 'Congé maladie', jours: s.maladie },
    { libelle: 'Permission', jours: s.permission },
  ]
})
</script>
