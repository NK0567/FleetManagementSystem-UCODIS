<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Habilitations</div>
        <div :class="L.pageSub">
          Qui est autorisé à prendre un camion, et qui ne l'est pas
        </div>
      </div>
    </div>

    <!-- Rappel de la règle -->
    <div class="bg-card border-l-[3px] border-primary rounded-r-lg px-4 py-3 mb-4 max-w-4xl">
      <div class="text-[11px] font-semibold text-primary uppercase tracking-[0.06em] mb-1">
        Règle appliquée
      </div>
      <p class="text-[13px] text-foreground leading-relaxed">
        Seuls les conducteurs dûment formés et habilités sont autorisés à conduire le camion.
        Toute autre utilisation est strictement interdite.
      </p>
    </div>

    <!-- Compteurs -->
    <div class="grid grid-cols-3 gap-2.5 mb-4 max-md:grid-cols-1">
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-success-bg"><ShieldCheck class="w-[18px] h-[18px] text-success" /></div>
        <div :class="L.kpiLabel">Habilités</div>
        <div :class="L.kpiValue">{{ habilites.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-danger-bg"><ShieldOff class="w-[18px] h-[18px] text-danger" /></div>
        <div :class="L.kpiLabel">Non habilités</div>
        <div :class="L.kpiValue">{{ nonHabilites.length }}</div>
      </div>
      <div :class="L.kpiCard">
        <div :class="L.kpiIcon" class="bg-warning-bg"><FileWarning class="w-[18px] h-[18px] text-warning" /></div>
        <div :class="L.kpiLabel">Habilités mais document à régulariser</div>
        <div :class="L.kpiValue">{{ aRegulariser.length }}</div>
      </div>
    </div>

    <div :class="L.tableCard">
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Personne</th>
              <th :class="L.th">Fonction</th>
              <th :class="L.th">Permis</th>
              <th :class="L.th">Visite médicale</th>
              <th :class="L.th">Habilitation</th>
              <th :class="L.th">Décision</th>
              <th :class="L.th" class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in lignes" :key="r.p.id" :class="L.rowClickable" @click="ouvrir(r.p.id)">
              <td :class="L.td">
                <div class="flex items-center gap-2.5">
                  <UserAvatar :nom="r.p.nomComplet" taille="sm" />
                  <div>
                    <div class="font-medium">{{ r.p.nomComplet }}</div>
                    <div class="text-[11px] text-muted-foreground font-mono">{{ r.p.matricule }}</div>
                  </div>
                </div>
              </td>
              <td :class="L.td">{{ r.p.fonctionLibelle }}</td>

              <td :class="L.td">
                <div class="flex items-center gap-1.5">
                  <StatusPill :statut="r.etatPermis" />
                  <span v-if="r.permis?.categorie" class="text-[10px] text-muted-foreground font-semibold">
                    {{ r.permis.categorie }}
                  </span>
                </div>
                <div v-if="r.permis?.dateExpiration" class="text-[11px] text-muted-foreground mt-0.5">
                  {{ formatDate(r.permis.dateExpiration) }}
                </div>
              </td>

              <td :class="L.td">
                <StatusPill :statut="r.etatVisite" />
                <div v-if="r.visite?.dateExpiration" class="text-[11px] text-muted-foreground mt-0.5">
                  {{ formatDate(r.visite.dateExpiration) }}
                </div>
              </td>

              <td :class="L.td">
                <StatusPill :statut="r.p.habilite ? 'habilite' : 'non_habilite'" />
              </td>

              <td :class="L.td" class="text-[11px] text-muted-foreground max-w-[220px]">
                <template v-if="r.p.habilite">
                  {{ r.p.habilitePar }}<br />le {{ formatDate(r.p.habiliteLe) }}
                </template>
                <template v-else>
                  {{ r.p.motifRetraitHabilitation || 'Jamais habilité' }}
                </template>
              </td>

              <td :class="L.td" class="text-right">
                <button
                  v-if="auth.gerePersonnel"
                  class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer whitespace-nowrap"
                  :class="r.p.habilite ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'"
                  @click.stop="basculer(r.p.id, r.p.habilite)"
                >
                  {{ r.p.habilite ? 'Retirer' : 'Habiliter' }}
                </button>
                <span v-else class="text-[11px] text-muted-foreground">Lecture seule</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-3xl">
      Habiliter et retirer sont deux décisions datées, portées par une personne identifiée.
      Rien n'est supprimé : le retrait laisse une trace avec son motif.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { FileWarning, ShieldCheck, ShieldOff } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import { formatDate } from '../../utils/helpers'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsStore } from '../../stores/documentsPersonnel'

const router = useRouter()
const auth = useAuthStore()
const personnel = usePersonnelStore()
const docs = useDocumentsStore()

const lignes = computed(() =>
  personnel.roulants.map(p => {
    const mes = docs.parPersonnel(p.id)
    const permis = mes.find(d => d.type === 'permis')
    const visite = mes.find(d => d.type === 'visite_medicale')
    return {
      p,
      permis,
      visite,
      etatPermis: permis ? docs.etat(permis) : 'absent',
      etatVisite: visite ? docs.etat(visite) : 'absent',
    }
  }),
)

const habilites = computed(() => lignes.value.filter(r => r.p.habilite))
const nonHabilites = computed(() => lignes.value.filter(r => !r.p.habilite))
const aRegulariser = computed(() =>
  lignes.value.filter(r => r.p.habilite && (r.etatPermis !== 'valide' || r.etatVisite !== 'valide')),
)

function ouvrir(id: string) {
  router.push({ name: 'admin-personnel-detail', params: { id } })
}

function basculer(id: string, habiliteActuel: boolean) {
  personnel.basculerHabilitation(
    id,
    auth.user?.nom ?? 'Système',
    habiliteActuel ? 'Habilitation retirée depuis l\u2019écran des habilitations' : undefined,
  )
}
</script>
