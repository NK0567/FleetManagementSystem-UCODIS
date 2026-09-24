<template>
  <div :class="L.pageWrap" class="max-w-[900px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Ma situation</div>
        <div :class="L.pageSub">{{ auth.user?.nom }} · {{ dateDuJour }}</div>
      </div>
    </div>

    <!-- Ma tournée : plus d'étape de validation de ma part, je suis seulement
         notifié de la tournée qui m'a été confiée. Signer ma première
         livraison la fait elle-même passer de planifiée à en cours. -->
    <div v-if="maTournee" :class="L.card" class="mb-3 !border-primary/30">
      <div :class="L.cardTitle">
        <Truck class="w-4 h-4 text-primary" /> {{ maTournee.statut === 'planifie' ? 'Ma tournée à venir' : 'Ma tournée en cours' }}
        <span class="ml-auto text-[11px] font-normal text-muted-foreground">
          {{ maTournee.etapes.filter(e => e.franchi).length }}/{{ maTournee.etapes.length }} livraisons signées
        </span>
      </div>
      <p class="text-[12px] text-muted-foreground mb-3">
        <span class="font-mono font-semibold text-foreground">{{ maTournee.numeroOT || maTournee.reference }}</span> ·
        <template v-if="maTournee.statut === 'planifie'">signer la première livraison démarre la tournée.</template>
        <template v-else>recueillez la signature du destinataire à chaque livraison, dans l'ordre.</template>
        Aucune livraison ne peut être sautée.
      </p>
      <div class="flex flex-col gap-1.5">
        <div v-for="(e, i) in lignesTriees" :key="e.id" class="rounded-md px-3 py-2.5" :class="e.franchi ? 'bg-success-bg' : 'bg-background'">
          <div class="flex items-center gap-2.5">
            <component :is="e.franchi ? CircleCheck : Circle" class="w-4 h-4 shrink-0" :class="e.franchi ? 'text-success' : 'text-muted-foreground'" />
            <span class="text-[11px] font-semibold text-muted-foreground w-5">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <span class="text-[13px] text-foreground">{{ e.destinataire ?? e.siteNom }}</span>
              <span v-if="e.destinataire" class="text-[11px] text-muted-foreground"> · {{ e.adresseLivraison }}</span>
              <span v-else class="text-[11px] text-muted-foreground"> · transfert interne</span>
            </div>
            <span v-if="e.franchi" class="text-[11px] text-success font-medium shrink-0">{{ e.destinataire ? `Signée par ${e.eBL?.signePar}` : 'Confirmé' }}</span>
            <button v-else-if="peutSigner(i) && ligneEnSignature !== e.id" :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="ouvrirSignature(e)">
              {{ e.destinataire ? 'Recueillir la signature' : 'Confirmer le passage' }}
            </button>
            <span v-else-if="!peutSigner(i)" class="text-[11px] text-muted-foreground italic shrink-0">En attente de la livraison précédente</span>
          </div>
          <div v-if="ligneEnSignature === e.id && e.destinataire" class="flex items-center gap-2 mt-2.5 pl-[26px]">
            <input v-model="nomSignataire" :class="clsForm.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Nom de la personne qui réceptionne…" />
            <button :class="clsForm.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="ligneEnSignature = null">Annuler</button>
            <button :class="clsForm.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!nomSignataire.trim()" @click="confirmerSignature(e.id)">Confirmer la signature</button>
          </div>
        </div>
      </div>
      <p v-if="maTournee.etapes.length && maTournee.etapes.every(e => e.franchi)" class="text-[12px] text-success font-medium mt-3 flex items-center gap-1.5">
        <CircleCheck class="w-4 h-4" /> Toutes les livraisons sont signées, cette tournée vient de se terminer.
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
import { CircleCheck, Circle, CircleX, Clock, FileText, ListChecks, Truck } from '@lucide/vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import * as clsForm from '../../lib/formClasses'
import { formatDate } from '../../utils/helpers'
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

/* ── Ma tournée : planifiée ou déjà en cours, peu importe - je ne fais
     que recueillir la signature du destinataire à chaque livraison,
     dans l'ordre. Signer la première la fait elle-même passer en
     cours, sans étape de validation à part. ────────────────────── */
const maTournee = computed(() =>
  moi.value ? [...voyages.planifies, ...voyages.enCoursKanban].find(v => v.chauffeurId === moi.value!.id) ?? null : null)
const lignesTriees = computed(() => maTournee.value ? [...maTournee.value.etapes].sort((a, b) => a.ordre - b.ordre) : [])

function peutSigner(index: number) {
  return lignesTriees.value.slice(0, index).every(e => e.franchi) && !lignesTriees.value[index]?.franchi
}

/** Un transfert entre sites internes se confirme directement, sans
 *  destinataire à faire signer. Une livraison chez un client, elle,
 *  exige de recueillir le nom de la personne qui réceptionne avant de
 *  valider : c'est elle qui signe, pas le chauffeur en son nom. */
const ligneEnSignature = ref<string | null>(null)
const nomSignataire = ref('')
function ouvrirSignature(e: { id: string; destinataire?: string }) {
  if (!e.destinataire) { voyages.signerLigne(maTournee.value!.id, e.id); return }
  ligneEnSignature.value = e.id
  nomSignataire.value = e.destinataire
}
function confirmerSignature(etapeId: string) {
  if (!maTournee.value || !nomSignataire.value.trim()) return
  voyages.signerLigne(maTournee.value.id, etapeId, nomSignataire.value.trim())
  ligneEnSignature.value = null
  nomSignataire.value = ''
}
</script>
