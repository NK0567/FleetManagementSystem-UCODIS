<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Comptes et rôles</div>
        <div :class="L.pageSub">
          {{ utilisateurs.actifs.length }} compte(s) ouvert(s) ·
          {{ utilisateurs.suspendus.length }} désactivé(s)
        </div>
      </div>
      <button v-if="auth.estAdmin" :class="L.btnPrimary"><UserPlus class="w-4 h-4" /> Créer un compte</button>
    </div>

    <!-- Personnes sans compte -->
    <div
      v-if="utilisateurs.sansCompte.length"
      class="bg-warning-bg border border-warning/25 rounded-lg px-4 py-3 mb-4 flex items-start gap-2.5"
    >
      <TriangleAlert class="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <div class="min-w-0">
        <div class="text-[13px] font-semibold text-warning">
          {{ utilisateurs.sansCompte.length }} personne(s) attendent un compte
        </div>
        <div class="text-[12px] text-warning/85 mt-0.5">
          {{ utilisateurs.sansCompte.map(p => p.nomComplet).join(' · ') }}
        </div>
      </div>
    </div>

    <div :class="L.tableCard">
      <div :class="L.toolbar">
        <div :class="L.searchBox">
          <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input v-model="recherche" type="text" placeholder="Nom, identifiant…" :class="L.searchInput" />
        </div>
        <select v-model="fRole" :class="L.selectSm">
          <option value="">Tous les rôles</option>
          <option v-for="(lib, r) in LIBELLE_ROLE" :key="r" :value="r">{{ lib }}</option>
        </select>
      </div>

      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Utilisateur</th>
              <th :class="L.th">Identifiant</th>
              <th :class="L.th">Rôle</th>
              <th :class="L.th">Rattachement</th>
              <th :class="L.th">Dernier accès</th>
              <th :class="L.th">État</th>
              <th :class="L.th" class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filtres" :key="u.id">
              <td :class="L.td">
                <div class="flex items-center gap-2.5">
                  <UserAvatar :nom="u.nom" taille="sm" />
                  <span class="font-medium">{{ u.nom }}</span>
                </div>
              </td>
              <td :class="L.td" class="font-mono text-xs">{{ u.identifiant }}</td>
              <td :class="L.td">{{ LIBELLE_ROLE[u.role] }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ u.entiteNom }}</td>
              <td :class="L.td" class="text-muted-foreground text-xs tabular-nums">{{ u.dernierAcces || '-' }}</td>
              <td :class="L.td"><StatusPill :statut="u.actif ? 'ouvert' : 'ferme'" /></td>
              <td :class="L.td" class="text-right">
                <button
                  v-if="auth.estAdmin"
                  class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer"
                  :class="u.actif ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'"
                  @click="utilisateurs.basculerActivation(u.id)"
                >{{ u.actif ? 'Désactiver' : 'Réactiver' }}</button>
                <span v-else class="text-[11px] text-muted-foreground">Lecture seule</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ce que chaque rôle peut faire -->
    <div :class="L.card" class="mt-3">
      <div :class="L.cardTitle"><KeyRound class="w-4 h-4 text-primary" /> Ce que chaque rôle peut faire</div>
      <div class="grid grid-cols-3 gap-x-6 gap-y-2.5 max-lg:grid-cols-2 max-md:grid-cols-1">
        <div v-for="(droits, r) in DROITS" :key="r" class="flex flex-col gap-1">
          <div class="text-[13px] font-semibold text-foreground">{{ LIBELLE_ROLE[r] }}</div>
          <div class="text-[11px] text-muted-foreground leading-snug">{{ droits.join(' · ') }}</div>
        </div>
      </div>
      <p class="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border leading-relaxed">
        La direction dispose d'un accès en lecture seule, pour suivre les rapports de
        pilotage sans intervenir dans la saisie quotidienne.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { KeyRound, Search, TriangleAlert, UserPlus } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import { useAuthStore, LIBELLE_ROLE } from '../../stores/auth'
import { useUtilisateurStore, DROITS } from '../../stores/utilisateurs'

const auth = useAuthStore()
const utilisateurs = useUtilisateurStore()

const recherche = ref('')
const fRole = ref('')

const filtres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  return utilisateurs.liste.filter(u => {
    if (fRole.value && u.role !== fRole.value) return false
    if (q && !`${u.nom} ${u.identifiant}`.toLowerCase().includes(q)) return false
    return true
  })
})
</script>
