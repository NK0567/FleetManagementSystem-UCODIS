<template>
  <div :class="L.pageWrap" class="max-w-[900px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Mes absences</div>
        <div :class="L.pageSub">Vos demandes et vos soldes</div>
      </div>
      <button :class="L.btnPrimary" @click="creation = true"><Plus class="w-4 h-4" /> Nouvelle demande</button>
    </div>

    <!-- Mes soldes -->
    <div v-if="solde" class="grid grid-cols-4 gap-2.5 mb-4 max-md:grid-cols-2">
      <div v-for="c in colonnes" :key="c.libelle" :class="L.kpiCard">
        <div class="flex items-center gap-1.5 mb-1">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: c.couleur }"></span>
          <div :class="L.kpiLabel">{{ c.libelle }}</div>
        </div>
        <div :class="L.kpiValue">{{ c.valeur }}<span class="text-base font-normal text-muted-foreground"> j</span></div>
      </div>
    </div>

    <!-- Mes demandes -->
    <div :class="L.tableCard">
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Type</th>
              <th :class="L.th">Période</th>
              <th :class="L.th">Jours</th>
              <th :class="L.th">Soumise le</th>
              <th :class="L.th">Statut</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="d in mesDemandes" :key="d.id">
              <tr>
                <td :class="L.td" class="font-medium">{{ d.type }}</td>
                <td :class="L.td" class="tabular-nums">{{ d.debut }} → {{ d.fin }}</td>
                <td :class="L.td" class="text-center">{{ d.jours }}</td>
                <td :class="L.td" class="text-muted-foreground tabular-nums">{{ d.soumisLe }}</td>
                <td :class="L.td"><StatutDemandePill :statut="d.statut" /></td>
              </tr>
              <tr v-if="d.motifRefus || d.commentaireRetour">
                <td :class="L.td" colspan="5" class="!py-1.5">
                  <div class="text-[11px] px-2.5 py-1.5 rounded"
                       :class="d.motifRefus ? 'bg-danger-bg text-danger' : 'bg-info-bg text-info'">
                    {{ d.motifRefus ? 'Motif du refus : ' : 'Retournée pour correction : ' }}
                    {{ d.motifRefus || d.commentaireRetour }}
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <div v-if="mesDemandes.length === 0" :class="L.emptyState">
          <Inbox class="w-8 h-8" /><p>Vous n'avez pas encore fait de demande.</p>
        </div>
      </div>
    </div>

    <NouvelleDemandeModal
      :ouvert="creation"
      :personnel-id-fixe="auth.user?.personnelId"
      @fermer="creation = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Inbox, Plus } from '@lucide/vue'
import StatutDemandePill from '../../components/ui/StatutDemandePill.vue'
import NouvelleDemandeModal from '../../components/NouvelleDemandeModal.vue'
import * as L from '../../lib/listClasses'
import { useAuthStore } from '../../stores/auth'
import { useAbsenceStore } from '../../stores/absences'
import { useClassificationStore } from '../../stores/classification'

const auth = useAuthStore()
const absences = useAbsenceStore()
const classification = useClassificationStore()

const creation = ref(false)

const mesDemandes = computed(() =>
  auth.user?.personnelId ? absences.mesDemandes(auth.user.personnelId) : [],
)
const solde = computed(() =>
  auth.user?.personnelId ? absences.monSolde(auth.user.personnelId) : null,
)

function coul(l: string) {
  return classification.typesConge.find(t => t.libelle === l)?.couleur ?? '#6B7280'
}

const colonnes = computed(() => {
  const s = solde.value
  if (!s) return []
  return [
    { libelle: 'Congé annuel',  valeur: s.congeAnnuel,  couleur: coul('Congé annuel') },
    { libelle: 'Récupération',  valeur: s.recuperation, couleur: coul('Récupération') },
    { libelle: 'Congé maladie', valeur: s.maladie,      couleur: coul('Congé maladie') },
    { libelle: 'Permission',    valeur: s.permission,   couleur: coul('Permission exceptionnelle') },
  ]
})
</script>
