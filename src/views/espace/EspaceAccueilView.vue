<template>
  <div :class="L.pageWrap" class="max-w-[900px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Ma situation</div>
        <div :class="L.pageSub">{{ auth.user?.nom }} · {{ dateDuJour }}</div>
      </div>
    </div>

    <!-- Mon ordre de transport : à confirmer ou en cours -->
    <div v-if="monOrdrePlanifie" :class="L.card" class="mb-3 !border-info/30 bg-info-bg/40">
      <div :class="L.cardTitle"><Truck class="w-4 h-4 text-info" /> Ordre de transport à confirmer</div>
      <p class="text-[13px] text-foreground mb-3">
        <span class="font-mono font-semibold">{{ monOrdrePlanifie.numeroOT || monOrdrePlanifie.reference }}</span>
        pour {{ monOrdrePlanifie.clientNom }}, prévu le {{ fmtDateHeure(monOrdrePlanifie.datePlanifiee) }}
        · {{ monOrdrePlanifie.etapes.length }} site(s) à desservir.
      </p>
      <div v-if="!refusOuvert" class="flex items-center gap-2">
        <button :class="clsForm.btnPrimary" @click="accepter"><Check class="w-4 h-4" /> Accepter</button>
        <button :class="clsForm.btnOutline" @click="refusOuvert = true"><X class="w-4 h-4" /> Refuser</button>
      </div>
      <div v-else class="flex flex-col gap-2">
        <textarea v-model="motifRefus" rows="2" :class="clsForm.fieldTextarea" placeholder="Motif du refus…"></textarea>
        <div class="flex items-center gap-2">
          <button :class="clsForm.btnOutline" @click="refusOuvert = false; motifRefus = ''">Annuler</button>
          <button :class="clsForm.btnPrimary" class="!bg-danger hover:!bg-danger/90" :disabled="!motifRefus.trim()" @click="refuser">Confirmer le refus</button>
        </div>
      </div>
    </div>

    <div v-if="monOrdreEnCours" :class="L.card" class="mb-3 !border-primary/30">
      <div :class="L.cardTitle">
        <MapPin class="w-4 h-4 text-primary" /> Mon voyage en cours
        <span class="ml-auto text-[11px] font-normal text-muted-foreground">
          {{ monOrdreEnCours.etapes.filter(e => e.franchi).length }}/{{ monOrdreEnCours.etapes.length }} sites validés
        </span>
      </div>
      <p class="text-[12px] text-muted-foreground mb-3">
        Validez chaque site dans l'ordre, au fur et à mesure que vous le desservez. Aucun site ne peut être sauté.
      </p>
      <div class="flex flex-col gap-1.5">
        <div v-for="(e, i) in etapesTriees" :key="e.id" class="flex items-center gap-2.5 rounded-md px-3 py-2.5"
             :class="e.franchi ? 'bg-success-bg' : 'bg-background'">
          <component :is="e.franchi ? CircleCheck : Circle" class="w-4 h-4 shrink-0" :class="e.franchi ? 'text-success' : 'text-muted-foreground'" />
          <span class="text-[11px] font-semibold text-muted-foreground w-5">{{ i + 1 }}</span>
          <span class="text-[13px] text-foreground flex-1">{{ e.siteNom }}</span>
          <span v-if="e.franchi" class="text-[11px] text-success font-medium">Validé</span>
          <button v-else-if="peutValider(i)" :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="valider(e.id)">Valider le passage</button>
          <span v-else class="text-[11px] text-muted-foreground italic">En attente du site précédent</span>
        </div>
      </div>
      <p v-if="monOrdreEnCours.etapes.length && monOrdreEnCours.etapes.every(e => e.franchi)" class="text-[12px] text-success font-medium mt-3 flex items-center gap-1.5">
        <CircleCheck class="w-4 h-4" /> Tous les sites sont desservis, ce voyage vient de se clôturer.
      </p>
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
      Les check-lists et le carnet de bord arriveront ici une fois le module Maintenance et le carnet de
      bord construits.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, CircleCheck, Circle, CircleX, Clock, FileText, ListChecks, MapPin, Truck, X } from '@lucide/vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import * as clsForm from '../../lib/formClasses'
import { formatDate } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'
import { useParametresStore } from '../../stores/parametres'
import { useVoyagesStore } from '../../stores/voyages'
import { aujourdhuiDate } from '../../utils/horloge'

const auth = useAuthStore()
const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const docs = useDocumentsStore()
const params = useParametresStore()
const voyages = useVoyagesStore()

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

/* ── Mon ordre de transport : confirmation ou suivi des sites ────── */
const monOrdrePlanifie = computed(() =>
  moi.value ? voyages.planifies.find(v => v.chauffeurId === moi.value!.id) ?? null : null)
const monOrdreEnCours = computed(() =>
  moi.value ? voyages.enCoursKanban.find(v => v.chauffeurId === moi.value!.id) ?? null : null)
const etapesTriees = computed(() => monOrdreEnCours.value ? [...monOrdreEnCours.value.etapes].sort((a, b) => a.ordre - b.ordre) : [])

function peutValider(index: number) {
  return etapesTriees.value.slice(0, index).every(e => e.franchi) && !etapesTriees.value[index]?.franchi
}
function valider(etapeId: string) {
  if (!monOrdreEnCours.value) return
  voyages.validerEtape(monOrdreEnCours.value.id, etapeId)
}

const refusOuvert = ref(false)
const motifRefus = ref('')
function accepter() {
  if (!monOrdrePlanifie.value) return
  voyages.confirmerParChauffeur(monOrdrePlanifie.value.id)
}
function refuser() {
  if (!monOrdrePlanifie.value || !motifRefus.value.trim()) return
  voyages.refuserParChauffeur(monOrdrePlanifie.value.id, motifRefus.value.trim())
  refusOuvert.value = false
  motifRefus.value = ''
}
</script>
