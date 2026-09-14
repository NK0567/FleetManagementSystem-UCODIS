<template>
  <div v-if="p" :class="L.pageWrap" class="max-w-[1200px]">

    <button class="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-4 cursor-pointer hover:text-foreground"
            @click="$router.push({ name: 'admin-employes' })">
      <ChevronLeft class="w-4 h-4" /> Retour aux employés
    </button>

    <!-- En-tête de fiche -->
    <div class="bg-card border border-border rounded-lg p-5 mb-3">
      <div class="flex items-start gap-4 flex-wrap">
        <UserAvatar :nom="p.nomComplet" taille="lg" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h1 class="text-xl font-bold text-foreground">{{ p.nomComplet }}</h1>
            <StatusPill :statut="p.statut" />
          </div>
          <div class="text-[13px] text-muted-foreground mt-1">
            {{ p.fonctionLibelle }} · {{ p.entiteNom }} · {{ p.site }}
          </div>
          <div class="text-[12px] text-muted-foreground mt-0.5 font-mono">{{ p.matricule }}</div>
        </div>

        <div v-if="p.conduit" class="flex items-center gap-2">
          <StatusPill :statut="p.habilite ? 'habilite' : 'non_habilite'" />
          <button
            v-if="auth.gerePersonnel"
            :class="p.habilite ? L.btnOutline : L.btnPrimary"
            @click="basculer"
          >
            <ShieldCheck class="w-4 h-4" />
            {{ p.habilite ? "Retirer l'habilitation" : 'Habiliter' }}
          </button>
        </div>
      </div>

      <!-- Bandeau d'habilitation -->
      <div
        v-if="p.conduit"
        class="mt-4 rounded-md px-3.5 py-2.5 text-[12px] leading-relaxed"
        :class="p.habilite ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'"
      >
        <template v-if="p.habilite">
          Habilité par {{ p.habilitePar }} le {{ formatDate(p.habiliteLe) }}.
          Cette personne peut être affectée à un camion.
        </template>
        <template v-else>
          {{ p.motifRetraitHabilitation || 'Aucune habilitation enregistrée.' }}
          Cette personne ne peut pas être affectée à un camion : la conduite est réservée
          aux personnes dûment formées et habilitées.
        </template>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 max-lg:grid-cols-1">

      <!-- Identité -->
      <div :class="L.card">
        <div :class="L.cardTitle"><CircleUser class="w-4 h-4 text-primary" /> Identité</div>
        <dl class="flex flex-col gap-2.5">
          <Ligne libelle="Nom" :valeur="p.nom" />
          <Ligne libelle="Prénom" :valeur="p.prenom" />
          <Ligne libelle="Date de naissance" :valeur="formatDate(p.dateNaissance)" />
          <Ligne libelle="CIN" :valeur="p.cin" />
          <Ligne libelle="Téléphone" :valeur="p.telephone" />
          <Ligne libelle="Courriel" :valeur="p.email || '-'" />
        </dl>
      </div>

      <!-- Situation -->
      <div :class="L.card">
        <div :class="L.cardTitle"><Briefcase class="w-4 h-4 text-primary" /> Situation</div>
        <dl class="flex flex-col gap-2.5">
          <Ligne libelle="Fonction" :valeur="p.fonctionLibelle" />
          <Ligne libelle="Service" :valeur="p.entiteNom" />
          <Ligne libelle="Site" :valeur="p.site" />
          <Ligne libelle="Contrat" :valeur="p.contrat" />
          <Ligne libelle="Date d'entrée" :valeur="formatDate(p.dateEntree)" />
          <Ligne libelle="Compte système" :valeur="p.compteSysteme ? 'Oui' : 'Non'" />
        </dl>
      </div>

      <!-- Responsabilités -->
      <div :class="L.card">
        <div :class="L.cardTitle"><ListChecks class="w-4 h-4 text-primary" /> Responsabilités</div>
        <ul class="flex flex-col gap-1.5">
          <li v-for="(r, i) in responsabilites" :key="i" class="flex gap-2 text-[12px] leading-snug">
            <span class="text-primary shrink-0 mt-0.5">•</span>
            <span>{{ r }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Documents -->
    <div :class="L.card" class="mt-3">
      <div :class="L.cardTitle" class="justify-between">
        <span class="flex items-center gap-1.5"><FileText class="w-4 h-4 text-primary" /> Documents</span>
        <button v-if="auth.gerePersonnel" class="text-[12px] text-primary cursor-pointer font-normal">
          Déposer une pièce
        </button>
      </div>

      <div class="overflow-x-auto -mx-4">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Pièce</th>
              <th :class="L.th">Référence</th>
              <th :class="L.th">Délivrance</th>
              <th :class="L.th">Expiration</th>
              <th :class="L.th">État</th>
              <th :class="L.th">Fichier</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in mesDocs" :key="d.id">
              <td :class="L.td" class="font-medium">
                {{ d.libelle }}
                <span v-if="d.categorie" class="ml-1.5 text-[10px] bg-neutral-bg text-neutral px-1.5 py-0.5 rounded font-semibold">
                  {{ d.categorie }}
                </span>
              </td>
              <td :class="L.td" class="text-muted-foreground font-mono text-xs">{{ d.reference || '-' }}</td>
              <td :class="L.td">{{ formatDate(d.dateDelivrance) }}</td>
              <td :class="L.td">{{ d.dateExpiration ? formatDate(d.dateExpiration) : 'Sans échéance' }}</td>
              <td :class="L.td">
                <StatusPill v-if="d.dateExpiration" :statut="docs.etat(d)" />
                <span v-else class="text-muted-foreground text-xs">-</span>
              </td>
              <td :class="L.td">
                <span v-if="d.fichier" class="inline-flex items-center gap-1 text-primary text-xs cursor-pointer">
                  <Paperclip class="w-3.5 h-3.5" /> {{ d.fichier }}
                </span>
                <span v-else class="text-muted-foreground text-xs">Non joint</span>
              </td>
            </tr>

            <!-- Pièces obligatoires absentes -->
            <tr v-for="t in manquantes" :key="t" class="bg-danger-bg/40">
              <td :class="L.td" class="font-medium text-danger">{{ LIBELLE_TYPE_DOC[t] }}</td>
              <td :class="L.td" colspan="4" class="text-danger text-xs">
                Pièce obligatoire non déposée pour cette fonction
              </td>
              <td :class="L.td"><StatusPill statut="absent" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <div v-else :class="L.pageWrap">
    <p class="text-[13px] text-muted-foreground">Cette personne n'existe pas ou a été archivée.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import {
  Briefcase, ChevronLeft, CircleUser, FileText, ListChecks, Paperclip, ShieldCheck,
} from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import { formatDate } from '../../utils/helpers'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'

const route = useRoute()
const auth = useAuthStore()
const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const docs = useDocumentsStore()

const p = computed(() => personnel.parId(String(route.params.id)))
const mesDocs = computed(() => (p.value ? docs.parPersonnel(p.value.id) : []))
const manquantes = computed(() => (p.value ? docs.piecesManquantes(p.value.id) : []))
const responsabilites = computed(() =>
  p.value ? fonctions.parId(p.value.fonctionId)?.responsabilites ?? [] : [],
)

function basculer() {
  if (!p.value) return
  personnel.basculerHabilitation(
    p.value.id,
    auth.user?.nom ?? 'Système',
    p.value.habilite ? "Habilitation retirée par le responsable flotte" : undefined,
  )
}

const Ligne = defineComponent({
  props: { libelle: String, valeur: String },
  setup(props) {
    return () =>
      h('div', { class: 'flex items-baseline gap-3' }, [
        h('dt', { class: 'text-[11px] text-muted-foreground w-[130px] shrink-0' }, props.libelle),
        h('dd', { class: 'text-[13px] text-foreground font-medium min-w-0 break-words' }, props.valeur),
      ])
  },
})
</script>
