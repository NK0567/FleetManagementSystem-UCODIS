<template>
  <div :class="L.card" class="mt-5">
    <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
      <p class="text-sm font-semibold text-foreground">Dépôts et régions des utilisateurs</p>
      <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="store.reinitialiser(); motif = ''">Revenir aux valeurs de départ</button>
    </div>
    <div class="overflow-x-auto">
      <table :class="L.table">
        <thead><tr><th :class="L.th">Utilisateur</th><th :class="L.th">Dépôts</th><th :class="L.th">Régions</th><th :class="L.th">Ajouter</th></tr></thead>
        <tbody>
          <tr v-for="u in utilisateursConcernes" :key="u.id">
            <td :class="L.td" class="text-xs"><span class="font-medium">{{ u.nom }}</span><div class="text-[11px] text-muted-foreground">{{ LIBELLE_ROLE[u.role] }}</div></td>
            <td :class="L.td" class="text-xs">
              <span v-if="store.perimetreVisible(u.id).tout" class="text-muted-foreground">Tous</span>
              <span v-for="d in store.perimetreVisible(u.id).depots" :key="d" class="inline-flex items-center gap-1 mr-1 mb-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">
                {{ sites.getById(d)?.nom ?? d }}<button class="bg-transparent border-0 cursor-pointer p-0 text-primary" @click="appliquer(store.retirer(u.id, 'depot', d))"><X class="w-3 h-3" /></button>
              </span>
            </td>
            <td :class="L.td" class="text-xs">
              <span v-if="store.perimetreVisible(u.id).tout" class="text-muted-foreground">Toutes</span>
              <span v-for="r in store.perimetreVisible(u.id).regions" :key="r" class="inline-flex items-center gap-1 mr-1 mb-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">
                {{ r }}<button class="bg-transparent border-0 cursor-pointer p-0 text-primary" @click="appliquer(store.retirer(u.id, 'region', r))"><X class="w-3 h-3" /></button>
              </span>
            </td>
            <td :class="L.td" class="whitespace-nowrap">
              <select :class="cls.fieldSelect" class="!h-[28px] !text-[12px] !w-[170px] mr-1" value="" @change="ajouter(u.id, $event)">
                <option value="">Choisir…</option>
                <optgroup label="Dépôts"><option v-for="s in sites.depots" :key="s.id" :value="`d:${s.id}`">{{ s.nom }}</option></optgroup>
                <optgroup label="Régions"><option v-for="r in store.regionsConnues" :key="r" :value="`r:${r}`">{{ r }}</option></optgroup>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="motif" class="text-[12px] text-destructive mt-2">{{ motif }}</p>
  </div>
</template>

<script setup lang="ts">
/** Rattachement de chaque utilisateur à des dépôts et des régions : il ne voit que les expéditions qui en dépendent. Sans rattachement, il voit tout. */
import { computed, ref } from 'vue'
import { X } from '@lucide/vue'
import { usePerimetresStore } from '../../stores/perimetres'
import { useSitesStore } from '../../stores/sites'
import { useUtilisateurStore } from '../../stores/utilisateurs'
import { LIBELLE_ROLE } from '../../stores/auth'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = usePerimetresStore()
const sites = useSitesStore()
const utilisateurs = useUtilisateurStore()
/** Le personnel roulant n'accède qu'à son espace : il n'est pas concerné. */
const utilisateursConcernes = computed(() => utilisateurs.actifs.filter(u => u.role !== 'conducteur' && u.role !== 'aide_conducteur'))
const motif = ref('')
function appliquer(r: { ok: boolean; motif?: string }) { motif.value = r.ok ? '' : r.motif ?? ''; return r.ok }
function ajouter(utilisateurId: string, e: Event) {
  const s = e.target as HTMLSelectElement
  const v = s.value
  if (v.startsWith('d:')) appliquer(store.ajouterDepot(utilisateurId, v.slice(2)))
  else if (v.startsWith('r:')) appliquer(store.ajouterRegion(utilisateurId, v.slice(2)))
  s.value = ''
}
</script>
