<template>
  <div :class="L.pageWrap" class="max-w-[900px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Ma situation</div>
        <div :class="L.pageSub">{{ auth.user?.nom }} · {{ dateDuJour }}</div>
      </div>
    </div>

    <!-- Aptitude à partir -->
    <div
      class="rounded-lg p-5 mb-3 border"
      :class="apte ? 'bg-success-bg border-success/25' : 'bg-danger-bg border-danger/25'"
    >
      <div class="flex items-start gap-3">
        <component :is="apte ? CircleCheck : CircleX" class="w-6 h-6 shrink-0 mt-0.5"
                   :class="apte ? 'text-success' : 'text-danger'" />
        <div>
          <div class="text-[17px] font-bold" :class="apte ? 'text-success' : 'text-danger'">
            {{ apte ? 'Vous pouvez prendre un camion' : 'Vous ne pouvez pas prendre de camion' }}
          </div>
          <p class="text-[13px] mt-1 leading-relaxed" :class="apte ? 'text-success/85' : 'text-danger/85'">
            <template v-if="apte">
              Votre habilitation est enregistrée et vos pièces sont valides.
              Présentez-vous au maintenancier pour la vérification de l'état du camion.
            </template>
            <template v-else>
              {{ motifBlocage }}
              Rapprochez-vous du responsable flotte pour régulariser.
            </template>
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">

      <!-- Mes pièces -->
      <div :class="L.card">
        <div :class="L.cardTitle"><FileText class="w-4 h-4 text-primary" /> Mes pièces</div>
        <div class="flex flex-col gap-2.5">
          <div v-for="d in mesDocs" :key="d.id" class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-medium">{{ d.libelle }}</div>
              <div class="text-[11px] text-muted-foreground">
                {{ d.dateExpiration ? `Expire le ${formatDate(d.dateExpiration)}` : 'Sans échéance' }}
              </div>
            </div>
            <StatusPill v-if="d.dateExpiration" :statut="docs.etat(d)" />
            <span v-else class="text-xs text-muted-foreground">·</span>
          </div>

          <div v-for="t in manquantes" :key="t" class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-medium text-danger">{{ LIBELLE_TYPE_DOC[t] }}</div>
              <div class="text-[11px] text-danger/80">Pièce obligatoire non déposée</div>
            </div>
            <StatusPill statut="absent" />
          </div>
        </div>
      </div>

      <!-- Mes responsabilités -->
      <div :class="L.card">
        <div :class="L.cardTitle"><ListChecks class="w-4 h-4 text-primary" /> Ce que j'ai à faire</div>
        <ul class="flex flex-col gap-1.5">
          <li v-for="(r, i) in responsabilites" :key="i" class="flex gap-2 text-[12px] leading-snug">
            <span class="text-primary shrink-0 mt-0.5">•</span><span>{{ r }}</span>
          </li>
        </ul>
        <p class="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
          Extrait de la procédure de gestion des flottes UCD-TRUCK-FLOT-001.
        </p>
      </div>
    </div>

    <!-- Rappel des règles de conduite -->
    <div :class="L.card" class="mt-3">
      <div :class="L.cardTitle"><Clock class="w-4 h-4 text-primary" /> Les limites en vigueur</div>
      <div class="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ params.valeurs.conduiteMaxJournaliereH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Conduite maximale par jour</div>
        </div>
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ params.valeurs.reposMinJournalierH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Repos minimal par jour</div>
        </div>
        <div class="bg-background rounded-lg p-3.5 text-center">
          <div class="text-2xl font-bold">{{ params.valeurs.conduiteMaxHebdoH }} h</div>
          <div class="text-[11px] text-muted-foreground mt-1">Conduite maximale par semaine</div>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
      Les voyages, les check-lists et le carnet de bord arriveront ici une fois les
      modules 1 et 2 construits.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck, CircleX, Clock, FileText, ListChecks } from '@lucide/vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import { formatDate } from '../../utils/helpers'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'
import { useParametresStore } from '../../stores/parametres'
import { aujourdhuiDate } from '../../utils/horloge'

const auth = useAuthStore()
const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const docs = useDocumentsStore()
const params = useParametresStore()

const dateDuJour = aujourdhuiDate().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

const moi = computed(() => (auth.user?.personnelId ? personnel.parId(auth.user.personnelId) : null))
const mesDocs = computed(() => (moi.value ? docs.parPersonnel(moi.value.id) : []))
const manquantes = computed(() => (moi.value ? docs.piecesManquantes(moi.value.id) : []))
const responsabilites = computed(() =>
  moi.value ? fonctions.parId(moi.value.fonctionId)?.responsabilites ?? [] : [],
)

const apte = computed(() => !!moi.value && moi.value.habilite && docs.enRegle(moi.value.id))

const motifBlocage = computed(() => {
  if (!moi.value) return ''
  if (!moi.value.habilite) return "Votre habilitation n'est pas enregistrée."
  return 'Une de vos pièces obligatoires est expirée ou absente.'
})
</script>
