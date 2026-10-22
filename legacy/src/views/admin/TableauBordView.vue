<template>
  <div class="px-7 py-6 max-w-[1400px] mx-auto w-full max-[640px]:px-4">

    <div class="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
      <div>
        <div class="text-lg font-semibold">Tableau de bord RH</div>
        <div class="text-[13px] text-muted-foreground mt-px">
          Bienvenue, {{ auth.user?.nom }} · {{ aujourdhui }}
        </div>
      </div>
    </div>

    <!-- Indicateurs -->
    <div class="grid grid-cols-4 gap-2.5 mb-3.5 max-lg:grid-cols-2">
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-success-bg"><Users class="w-[17px] h-[17px] text-success" /></div>
        <div :class="kpiLabel">Employés actifs</div>
        <div :class="kpiValue">{{ personnel.effectif }}</div>
        <div :class="kpiSub">{{ personnel.roulants.length }} roulants</div>
      </div>
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-warning-bg"><Clock class="w-[17px] h-[17px] text-warning" /></div>
        <div :class="kpiLabel">En attente</div>
        <div :class="kpiValue">{{ absences.enAttente.length }}</div>
        <div :class="kpiSub">à traiter</div>
      </div>
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-success-bg"><Check class="w-[17px] h-[17px] text-success" /></div>
        <div :class="kpiLabel">Approuvés (mois)</div>
        <div :class="kpiValue">{{ absences.approuveesCeMois.length }}</div>
        <div :class="kpiSub">congés / absences</div>
      </div>
      <div :class="kpiCard">
        <div :class="kpiAccent" class="bg-primary/10"><UserX class="w-[17px] h-[17px] text-primary" /></div>
        <div :class="kpiLabel">Absents aujourd'hui</div>
        <div :class="kpiValue">{{ absences.absentsAujourdhui.length }}</div>
        <div :class="kpiSub">sur {{ personnel.effectif }} employés</div>
      </div>
    </div>

    <!-- Structure organisationnelle -->
    <RouterLink
      :to="{ name: 'admin-entites' }"
      class="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3.5 mb-3 no-underline text-foreground cursor-pointer transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:border-primary/20"
    >
      <div class="flex items-center gap-3">
        <div class="w-[38px] h-[38px] rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Network class="w-5 h-5" />
        </div>
        <div>
          <div class="text-sm font-semibold">Structure organisationnelle</div>
          <div class="text-xs text-muted-foreground mt-0.5">
            {{ entites.validees.length }} entités approuvées · {{ personnel.effectif }} employés rattachés
          </div>
        </div>
      </div>
      <ChevronRight class="w-4 h-4 text-muted-foreground" />
    </RouterLink>

    <!-- Demandes en attente -->
    <div :class="[card, 'mb-3']">
      <div :class="cardHeader">
        <div :class="cardTitle">
          <CalendarClock class="w-4 h-4 text-primary" />
          Demandes en attente
          <span class="bg-primary text-primary-foreground text-[11px] font-semibold px-[7px] py-px rounded-full">
            {{ absences.enAttente.length }}
          </span>
        </div>
        <RouterLink :to="{ name: 'admin-demandes' }" class="text-xs text-primary no-underline cursor-pointer">
          Voir tout →
        </RouterLink>
      </div>

      <div class="flex border-b border-border mb-3.5">
        <div :class="[tabClass, onglet === 'attente' && tabActif]" @click="onglet = 'attente'">
          En attente ({{ absences.enAttente.length }})
        </div>
        <div :class="[tabClass, onglet === 'approuve' && tabActif]" @click="onglet = 'approuve'">
          Récents approuvés ({{ absences.approuvees.length }})
        </div>
      </div>

      <div
        v-for="d in demandesAffichees" :key="d.id"
        class="flex items-center gap-2.5 py-2 border-b border-border last:border-b-0 flex-wrap"
      >
        <UserAvatar :nom="d.nom" taille="md" />
        <div class="flex-1 min-w-[180px]">
          <div class="text-sm font-medium">{{ d.nom }}</div>
          <div class="text-xs text-muted-foreground">
            {{ d.type }} · {{ d.debut }} → {{ d.fin }} · {{ d.jours }} jour{{ d.jours > 1 ? 's' : '' }}
          </div>
        </div>
        <StatutDemandePill :statut="d.statut" />

        <div v-if="d.statut === 'attente' && peutValider" class="flex gap-1">
          <button class="px-2.5 py-[5px] rounded text-xs font-medium cursor-pointer bg-success-bg text-success"
                  @click="absences.approuver(d.id)">✓ Approuver</button>
          <button class="px-2.5 py-[5px] rounded text-xs font-medium cursor-pointer bg-info-bg text-info flex items-center"
                  title="Retourner pour correction" @click="ouvrirRetour(d)">
            <Undo2 class="w-3.5 h-3.5" />
          </button>
          <button class="px-2.5 py-[5px] rounded text-xs font-medium cursor-pointer bg-danger-bg text-danger"
                  @click="ouvrirRefus(d)">✗ Refuser</button>
        </div>
        <span v-else-if="d.statut === 'attente'" class="text-xs text-muted-foreground italic">
          Aucune action disponible
        </span>
        <button v-else class="px-2.5 py-[5px] rounded text-xs font-medium cursor-pointer bg-background text-muted-foreground"
                @click="$router.push({ name: 'admin-demandes' })">Voir</button>
      </div>

      <div v-if="demandesAffichees.length === 0" class="py-6 text-center text-[13px] text-muted-foreground">
        Aucune demande dans cet onglet.
      </div>
    </div>

    <!-- Soldes + calendrier -->
    <div class="grid grid-cols-2 gap-3 max-lg:grid-cols-1">

      <div :class="card">
        <div :class="cardHeader">
          <div :class="cardTitle"><ChartColumn class="w-4 h-4 text-primary" /> Soldes individuels</div>
          <RouterLink :to="{ name: 'admin-soldes' }" class="text-xs text-primary no-underline">Voir tout →</RouterLink>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th :class="balTh" @click="trier('nom')">
                  <div class="flex items-center gap-1.5">Employé
                    <component :is="iconeTri('nom')" class="w-3 h-3 ml-auto"
                               :class="triCle === 'nom' ? 'text-primary' : 'text-foreground/30'" />
                  </div>
                </th>
                <th v-for="c in colonnes" :key="c.cle" :class="balTh" @click="trier(c.cle)">
                  <div class="flex items-center gap-1">{{ c.libelle }}
                    <component :is="iconeTri(c.cle)" class="w-3 h-3 ml-auto"
                               :class="triCle === c.cle ? 'text-primary' : 'text-foreground/30'" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in soldesPage" :key="s.personnelId" class="hover:bg-primary/5">
                <td :class="balTd">
                  <div class="flex items-center gap-1.5">
                    <UserAvatar :nom="s.nom" taille="sm" />
                    <span>{{ s.nom }}</span>
                  </div>
                </td>
                <td :class="[balTd, 'text-center font-medium']">{{ s.congeAnnuel }}j</td>
                <td :class="[balTd, 'text-center font-medium']">{{ s.recuperation }}j</td>
                <td :class="[balTd, 'text-center font-medium']">{{ s.maladie }}j</td>
                <td :class="[balTd, 'text-center font-medium']">{{ s.permission }}j</td>
              </tr>
            </tbody>
          </table>

          <div class="flex items-center gap-3 px-2.5 py-2 border-t border-border text-xs text-muted-foreground">
            <span class="flex-1 whitespace-nowrap text-[11px]">{{ absences.soldes.length }} employés</span>
            <div class="flex items-center gap-1.5 text-[11px] whitespace-nowrap">
              Par page
              <select v-model.number="taillePage" class="h-6 px-1.5 border border-border rounded text-[11px] bg-card outline-none cursor-pointer focus:border-primary">
                <option :value="5">5</option><option :value="10">10</option><option :value="25">25</option>
              </select>
            </div>
            <div v-if="totalPages > 1" class="flex items-center gap-[3px]">
              <button :class="pagBtn" :disabled="page === 1" @click="page--"><ChevronLeft class="w-3 h-3" /></button>
              <button v-for="p in totalPages" :key="p" :class="[pagBtn, p === page && pagBtnActif]" @click="page = p">{{ p }}</button>
              <button :class="pagBtn" :disabled="page === totalPages" @click="page++"><ChevronRight class="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      </div>

      <div :class="card">
        <div :class="cardHeader">
          <div :class="cardTitle">
            <Calendar class="w-4 h-4 text-primary" /><span class="capitalize">{{ titreMois }}</span>
          </div>
          <div class="flex gap-1">
            <button :class="calBtn" @click="moisPrecedent"><ChevronLeft class="w-3 h-3" /></button>
            <button :class="calBtn" @click="moisSuivant"><ChevronRight class="w-3 h-3" /></button>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-0.5">
          <div v-for="(j, i) in JOURS" :key="i" class="text-xs text-muted-foreground text-center py-[3px] font-medium">{{ j }}</div>
          <div
            v-for="(j, i) in jours" :key="i"
            class="text-xs text-center py-[5px] px-0.5 rounded relative"
            :class="classeJour(j)"
            :title="j.infobulle"
          >{{ j.n ?? '' }}</div>
        </div>
        <div class="flex gap-3 mt-2.5 flex-wrap">
          <span :class="legende"><span class="w-2 h-2 rounded-full bg-primary"></span>Aujourd'hui</span>
          <span :class="legende"><span class="w-2 h-2 rounded-full bg-success"></span>Absence</span>
          <span :class="legende"><span class="w-2 h-2 rounded-full bg-warning"></span>Férié</span>
        </div>
      </div>
    </div>

    <!-- Modale : retour pour correction -->
    <ModalShell :ouvert="retour.ouvert" :titre="`Retourner la demande de ${retour.nom}`" @fermer="retour.ouvert = false">
      <label class="text-xs font-medium text-foreground">Commentaire</label>
      <textarea v-model="retour.commentaire" rows="4" :class="champTexte"
                placeholder="Expliquez ce qui doit être corrigé…"></textarea>
      <p v-if="retour.erreur" class="text-[11px] text-danger mt-1">{{ retour.erreur }}</p>
      <template #pied>
        <button :class="btnPrimary" @click="confirmerRetour"><Undo2 class="w-4 h-4" /> Retourner</button>
        <button :class="btnOutline" @click="retour.ouvert = false">Annuler</button>
      </template>
    </ModalShell>

    <!-- Modale : refus -->
    <ModalShell :ouvert="refus.ouvert" :titre="`Refuser la demande de ${refus.nom}`" @fermer="refus.ouvert = false">
      <label class="text-xs font-medium text-foreground">Motif du refus</label>
      <textarea v-model="refus.motif" rows="4" :class="champTexte"
                placeholder="Le motif sera communiqué à l'employé…"></textarea>
      <p v-if="refus.erreur" class="text-[11px] text-danger mt-1">{{ refus.erreur }}</p>
      <template #pied>
        <button :class="btnDanger" @click="confirmerRefus">Confirmer le refus</button>
        <button :class="btnOutline" @click="refus.ouvert = false">Annuler</button>
      </template>
    </ModalShell>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowDown, ArrowUp, ArrowUpDown, Calendar, CalendarClock, ChartColumn, Check,
  ChevronLeft, ChevronRight, Clock, Network, Undo2, Users, UserX,
} from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatutDemandePill from '../../components/ui/StatutDemandePill.vue'
import ModalShell from '../../components/ui/ModalShell.vue'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useEntiteStore } from '../../stores/entites'
import { useAbsenceStore, type Demande } from '../../stores/absences'
import { useCalendrierStore } from '../../stores/calendrier'
import { aujourdhuiDate } from '../../utils/horloge'

const auth = useAuthStore()
const personnel = usePersonnelStore()
const entites = useEntiteStore()
const absences = useAbsenceStore()
const calendrier = useCalendrierStore()

/* ── Classes du design system ───────────────────────────────── */
const btnPrimary = 'px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 bg-primary text-primary-foreground transition-colors hover:bg-primary/90'
const btnOutline = 'px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 bg-card text-foreground border border-border transition-colors hover:bg-background'
const btnDanger  = 'px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90'
const kpiCard    = 'bg-card border border-border rounded-lg px-3.5 py-3'
const kpiAccent  = 'w-8 h-8 rounded-md flex items-center justify-center mb-2'
const kpiLabel   = 'text-[13px] text-muted-foreground mb-1'
const kpiValue   = 'text-[28px] font-semibold leading-none'
const kpiSub     = 'text-xs text-muted-foreground mt-[3px]'
const card       = 'bg-card border border-border rounded-lg p-3.5'
const cardHeader = 'flex items-center justify-between mb-3'
const cardTitle  = 'flex items-center gap-1.5 text-sm font-semibold text-foreground'
const tabClass   = 'px-3.5 py-2 text-[13px] text-muted-foreground cursor-pointer border-b-2 border-transparent'
const tabActif   = '!text-primary !border-primary font-medium'
const balTh      = 'px-2.5 py-2 text-left text-xs font-semibold text-foreground bg-background border-b border-border whitespace-nowrap cursor-pointer select-none hover:bg-primary/5'
const balTd      = 'px-2.5 py-2 border-b border-border'
const pagBtn     = 'min-w-[26px] h-[26px] px-1.5 rounded text-[11px] font-medium cursor-pointer border border-border bg-card text-foreground flex items-center justify-center transition-colors hover:bg-background disabled:opacity-35 disabled:cursor-not-allowed'
const pagBtnActif = '!bg-primary !text-primary-foreground !border-primary'
const calBtn     = 'border border-border rounded w-[22px] h-[22px] flex items-center justify-center cursor-pointer text-muted-foreground transition-colors hover:bg-background hover:text-foreground'
const legende    = 'flex items-center gap-1.5 text-xs text-muted-foreground'
const champTexte = 'px-2.5 py-2 mt-1 border border-border rounded-md bg-background text-[13px] text-foreground outline-none resize-y w-full focus:border-primary focus:bg-card'

const aujourdhui = aujourdhuiDate().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

/* La direction consulte, elle ne valide pas. */
const peutValider = computed(() => !auth.lectureSeule)

/* ── Demandes ───────────────────────────────────────────────── */
const onglet = ref<'attente' | 'approuve'>('attente')
const demandesAffichees = computed(() =>
  (onglet.value === 'attente' ? absences.enAttente : absences.approuvees).slice(0, 5),
)


const retour = reactive({ ouvert: false, id: 0, nom: '', commentaire: '', erreur: '' })
function ouvrirRetour(d: Demande) {
  Object.assign(retour, { ouvert: true, id: d.id, nom: d.nom, commentaire: '', erreur: '' })
}
function confirmerRetour() {
  if (retour.commentaire.trim().length < 10) {
    retour.erreur = 'Le commentaire doit comporter au moins 10 caractères.'
    return
  }
  absences.retourner(retour.id, retour.commentaire.trim())
  retour.ouvert = false
}

const refus = reactive({ ouvert: false, id: 0, nom: '', motif: '', erreur: '' })
function ouvrirRefus(d: Demande) {
  Object.assign(refus, { ouvert: true, id: d.id, nom: d.nom, motif: '', erreur: '' })
}
function confirmerRefus() {
  if (refus.motif.trim().length < 10) {
    refus.erreur = 'Le motif doit comporter au moins 10 caractères.'
    return
  }
  absences.refuser(refus.id, refus.motif.trim())
  refus.ouvert = false
}

/* ── Soldes ─────────────────────────────────────────────────── */
const colonnes = [
  { cle: 'congeAnnuel', libelle: 'Annuel' },
  { cle: 'recuperation', libelle: 'Récup.' },
  { cle: 'maladie', libelle: 'Maladie' },
  { cle: 'permission', libelle: 'Permis.' },
]

const triCle = ref('nom')
const triSens = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const taillePage = ref(5)

function trier(cle: string) {
  if (triCle.value === cle) triSens.value = triSens.value === 'asc' ? 'desc' : 'asc'
  else { triCle.value = cle; triSens.value = 'asc' }
}
function iconeTri(cle: string) {
  if (triCle.value !== cle) return ArrowUpDown
  return triSens.value === 'asc' ? ArrowUp : ArrowDown
}

const soldesPage = computed(() => {
  const l = [...absences.soldes].sort((a, b) => {
    const va = (a as unknown as Record<string, string | number>)[triCle.value]!
    const vb = (b as unknown as Record<string, string | number>)[triCle.value]!
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return triSens.value === 'asc' ? c : -c
  })
  const d = (page.value - 1) * taillePage.value
  return l.slice(d, d + taillePage.value)
})
const totalPages = computed(() => Math.max(1, Math.ceil(absences.soldes.length / taillePage.value)))

/* ── Calendrier ─────────────────────────────────────────────── */
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const maintenant = aujourdhuiDate()
const annee = ref(maintenant.getFullYear())
const mois = ref(maintenant.getMonth())

const titreMois = computed(() =>
  new Date(annee.value, mois.value, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
)
function moisPrecedent() {
  if (mois.value === 0) { mois.value = 11; annee.value-- } else mois.value--
}
function moisSuivant() {
  if (mois.value === 11) { mois.value = 0; annee.value++ } else mois.value++
}

interface Jour { n: number | null; date: string | null; aujourdhui: boolean; absence: boolean; ferie: boolean; infobulle: string }

const jours = computed<Jour[]>(() => {
  const y = annee.value, m = mois.value
  const nb = new Date(y, m + 1, 0).getDate()
  const premier = (new Date(y, m, 1).getDay() + 6) % 7
  const now = aujourdhuiDate()
  const ceMois = now.getFullYear() === y && now.getMonth() === m
  const out: Jour[] = []

  for (let i = 0; i < premier; i++) out.push({ n: null, date: null, aujourdhui: false, absence: false, ferie: false, infobulle: '' })

  for (let d = 1; d <= nb; d++) {
    const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const abs = absences.absencesLe(date)
    const ferie = calendrier.estFerie(date)
    const lignes = [
      ferie ? ferie.libelle : '',
      ...abs.map(a => `${a.nom} · ${a.type}`),
    ].filter(Boolean)
    out.push({
      n: d, date,
      aujourdhui: ceMois && now.getDate() === d,
      absence: abs.length > 0,
      ferie: !!ferie,
      infobulle: lignes.join('\n'),
    })
  }
  return out
})

function classeJour(j: Jour): string {
  if (j.n === null) return 'text-transparent pointer-events-none'
  if (j.aujourdhui) return 'bg-primary text-primary-foreground font-semibold'
  if (j.ferie) return 'bg-warning-bg text-warning font-medium'
  if (j.absence) return 'bg-success-bg text-success font-medium'
  return 'text-foreground hover:bg-background'
}
</script>
