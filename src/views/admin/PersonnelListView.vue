<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Effectif</div>
        <div :class="L.pageSub">
          {{ filtres.length }} personne(s) sur {{ personnel.effectif }} · UCODIS Transport
        </div>
      </div>
      <div class="flex gap-2">
        <button :class="L.btnOutline"><Download class="w-4 h-4" /> Exporter</button>
        <button v-if="auth.gerePersonnel" :class="L.btnPrimary"><UserPlus class="w-4 h-4" /> Ajouter</button>
      </div>
    </div>

    <div :class="L.tableCard">

      <!-- Barre d'outils -->
      <div :class="L.toolbar">
        <div class="flex items-center gap-2 flex-wrap">
          <div :class="L.searchBox">
            <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input v-model="recherche" type="text" placeholder="Nom, matricule, CIN…" :class="L.searchInput" />
            <button v-if="recherche" class="text-muted-foreground hover:text-foreground" @click="recherche = ''">
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <select v-model="fFonction" :class="L.selectSm">
            <option value="">Toutes les fonctions</option>
            <option v-for="f in fonctions.liste" :key="f.id" :value="f.id">{{ f.libelle }}</option>
          </select>

          <select v-model="fStatut" :class="L.selectSm">
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="conge">En congé</option>
            <option value="suspendu">Suspendu</option>
          </select>

          <label class="flex items-center gap-1.5 text-xs text-foreground cursor-pointer select-none">
            <input v-model="seulementProblemes" type="checkbox" class="accent-[var(--ucodis-red)] cursor-pointer" />
            Uniquement les situations à traiter
          </label>
        </div>

        <button v-if="filtreActif" class="text-[12px] text-primary cursor-pointer" @click="reinitialiser">
          Réinitialiser
        </button>
      </div>

      <!-- Tableau -->
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Personne</th>
              <th :class="L.th">Matricule</th>
              <th :class="L.th">Fonction</th>
              <th :class="L.th">Service</th>
              <th :class="L.th">Statut</th>
              <th :class="L.th">Habilitation</th>
              <th :class="L.th">Documents</th>
              <th :class="L.th"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in filtres" :key="p.id"
              :class="[L.rowClickable]"
              @click="ouvrir(p.id)"
            >
              <td :class="L.td">
                <div class="flex items-center gap-2.5">
                  <UserAvatar :nom="p.nomComplet" taille="sm" />
                  <div class="min-w-0">
                    <div class="font-medium truncate">{{ p.nomComplet }}</div>
                    <div class="text-[11px] text-muted-foreground">{{ p.telephone }}</div>
                  </div>
                </div>
              </td>
              <td :class="L.td" class="font-mono text-xs">{{ p.matricule }}</td>
              <td :class="L.td">{{ p.fonctionLibelle }}</td>
              <td :class="L.td" class="text-muted-foreground">{{ p.entiteNom }}</td>
              <td :class="L.td"><StatusPill :statut="p.statut" /></td>
              <td :class="L.td">
                <StatusPill v-if="!p.conduit" statut="sans_objet" />
                <StatusPill v-else :statut="p.habilite ? 'habilite' : 'non_habilite'" />
              </td>
              <td :class="L.td">
                <StatusPill :statut="docs.enRegle(p.id) ? 'valide' : 'expire'"
                            :libelle="docs.enRegle(p.id) ? 'En règle' : 'À régulariser'" />
              </td>
              <td :class="L.td" class="text-right">
                <ChevronRight class="w-4 h-4 text-muted-foreground inline" />
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filtres.length === 0" :class="L.emptyState">
          <Inbox class="w-8 h-8" />
          <p>Aucune personne ne correspond à ces critères.</p>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-3xl">
      Une personne qui quitte l'entreprise est archivée, jamais supprimée : ses voyages
      et ses documents restent rattachés à elle. Les archivés sont masqués par défaut.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight, Download, Inbox, Search, UserPlus, X } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useFonctionStore } from '../../stores/fonctions'
import { useDocumentsStore } from '../../stores/documentsPersonnel'

const router = useRouter()
const auth = useAuthStore()
const personnel = usePersonnelStore()
const fonctions = useFonctionStore()
const docs = useDocumentsStore()

const recherche = ref('')
const fFonction = ref('')
const fStatut = ref('')
const seulementProblemes = ref(false)

const filtreActif = computed(
  () => !!recherche.value || !!fFonction.value || !!fStatut.value || seulementProblemes.value,
)

function reinitialiser() {
  recherche.value = ''
  fFonction.value = ''
  fStatut.value = ''
  seulementProblemes.value = false
}

const filtres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  return personnel.actifs.filter(p => {
    if (fFonction.value && p.fonctionId !== fFonction.value) return false
    if (fStatut.value && p.statut !== fStatut.value) return false
    if (seulementProblemes.value) {
      const souci = (p.conduit && !p.habilite) || !docs.enRegle(p.id)
      if (!souci) return false
    }
    if (q) {
      const cible = `${p.nomComplet} ${p.matricule} ${p.cin} ${p.fonctionLibelle}`.toLowerCase()
      if (!cible.includes(q)) return false
    }
    return true
  })
})

function ouvrir(id: string) {
  router.push({ name: 'admin-personnel-detail', params: { id } })
}
</script>
