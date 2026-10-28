<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Documents du personnel</div>
        <div :class="L.pageSub">
          {{ filtres.length }} pièce(s) · permis, visites médicales, contrats, formations
        </div>
      </div>
      <button v-if="auth.gerePersonnel" :class="L.btnPrimary"><Upload class="w-4 h-4" /> Déposer une pièce</button>
    </div>

    <!-- Couverture par type -->
    <div class="grid grid-cols-4 gap-2.5 mb-4 max-lg:grid-cols-2">
      <div v-for="c in couverture" :key="c.type" :class="L.kpiCard">
        <div :class="L.kpiLabel">{{ c.libelle }}</div>
        <div :class="L.kpiValue">
          {{ c.deposes }}<span class="text-base text-muted-foreground font-normal"> / {{ c.attendus }}</span>
        </div>
        <div class="h-1.5 bg-background rounded-full overflow-hidden mt-2.5">
          <div class="h-full rounded-full transition-all"
               :class="c.deposes === c.attendus ? 'bg-success' : 'bg-warning'"
               :style="{ width: `${Math.round((c.deposes / c.attendus) * 100)}%` }"></div>
        </div>
      </div>
    </div>

    <div :class="L.tableCard">
      <div :class="L.toolbar">
        <div class="flex items-center gap-2 flex-wrap">
          <div :class="L.searchBox">
            <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input v-model="recherche" type="text" placeholder="Nom, référence…" :class="L.searchInput" />
          </div>
          <select v-model="fType" :class="L.selectSm">
            <option value="">Tous les types</option>
            <option v-for="(lib, t) in LIBELLE_TYPE_DOC" :key="t" :value="t">{{ lib }}</option>
          </select>
          <select v-model="fEtat" :class="L.selectSm">
            <option value="">Tous les états</option>
            <option value="valide">Valide</option>
            <option value="proche">À renouveler</option>
            <option value="expire">Expiré</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="L.th">Personne</th>
              <th :class="L.th">Pièce</th>
              <th :class="L.th">Référence</th>
              <th :class="L.th">Délivrance</th>
              <th :class="L.th">Expiration</th>
              <th :class="L.th">État</th>
              <th :class="L.th">Fichier</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in filtres" :key="d.id" :class="L.rowClickable" @click="ouvrir(d.personnelId)">
              <td :class="L.td">
                <div class="flex items-center gap-2.5">
                  <UserAvatar :nom="nom(d.personnelId)" taille="sm" />
                  <span class="font-medium">{{ nom(d.personnelId) }}</span>
                </div>
              </td>
              <td :class="L.td">
                {{ d.libelle }}
                <span v-if="d.categorie" class="ml-1.5 text-[10px] bg-neutral-bg text-neutral px-1.5 py-0.5 rounded font-semibold">
                  {{ d.categorie }}
                </span>
              </td>
              <td :class="L.td" class="font-mono text-xs text-muted-foreground">{{ d.reference || '-' }}</td>
              <td :class="L.td">{{ formatDate(d.dateDelivrance) }}</td>
              <td :class="L.td">{{ d.dateExpiration ? formatDate(d.dateExpiration) : 'Sans échéance' }}</td>
              <td :class="L.td">
                <StatusPill v-if="d.dateExpiration" :statut="docs.etat(d)" />
                <span v-else class="text-xs text-muted-foreground">-</span>
              </td>
              <td :class="L.td">
                <span v-if="d.fichier" class="inline-flex items-center gap-1 text-primary text-xs">
                  <Paperclip class="w-3.5 h-3.5" /> Joint
                </span>
                <span v-else class="text-xs text-muted-foreground">Non joint</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filtres.length === 0" :class="L.emptyState">
          <Inbox class="w-8 h-8" /><p>Aucune pièce ne correspond.</p>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-3xl">
      Une pièce remplacée n'écrase pas la précédente : l'ancienne version est archivée avec
      sa date et reste consultable.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Inbox, Paperclip, Search, Upload } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import * as L from '../../lib/listClasses'
import { formatDate } from '../../utils/helpers'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'
import type { TypeDocument } from '../../types'

const router = useRouter()
const auth = useAuthStore()
const personnel = usePersonnelStore()
const docs = useDocumentsStore()

const recherche = ref('')
const fType = ref('')
const fEtat = ref('')

function nom(id: string) {
  return personnel.parId(id)?.nomComplet ?? '-'
}

const filtres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  return docs.actifs.filter(d => {
    if (fType.value && d.type !== fType.value) return false
    if (fEtat.value) {
      if (!d.dateExpiration) return false
      if (docs.etat(d) !== fEtat.value) return false
    }
    if (q) {
      const cible = `${nom(d.personnelId)} ${d.libelle} ${d.reference ?? ''}`.toLowerCase()
      if (!cible.includes(q)) return false
    }
    return true
  })
})

/** Couverture : combien de personnes ont réellement déposé la pièce attendue. */
const couverture = computed(() => {
  const types: TypeDocument[] = ['permis', 'visite_medicale', 'cin', 'contrat']
  return types.map(t => {
    const concernes = personnel.actifs.filter(p =>
      t === 'permis' || t === 'visite_medicale' ? p.conduit : true,
    )
    const deposes = concernes.filter(p =>
      docs.parPersonnel(p.id).some(d => d.type === t),
    ).length
    return {
      type: t,
      libelle: LIBELLE_TYPE_DOC[t],
      attendus: concernes.length,
      deposes,
    }
  })
})

function ouvrir(personnelId: string) {
  router.push({ name: 'admin-personnel-detail', params: { id: personnelId } })
}
</script>
