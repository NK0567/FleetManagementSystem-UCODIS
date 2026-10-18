<template>
  <div :class="L.card" class="mt-5">
    <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
      <p class="text-sm font-semibold text-foreground">Compatibilité des produits et contraintes de livraison</p>
      <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="store.reinitialiser(); motif = ''">Revenir aux valeurs de départ</button>
    </div>

    <p :class="lbl" class="mb-2">Compatibilité des produits</p>
    <div class="overflow-x-auto">
      <table :class="L.table">
        <thead><tr><th :class="L.th">Produit</th><th :class="L.th">Règle</th><th :class="L.th">Produit</th><th :class="L.th"></th></tr></thead>
        <tbody>
          <tr v-for="r in store.compatibilites" :key="r.id">
            <td :class="L.td" class="text-xs">{{ nomProduit(r.type === 'succession' ? r.produitB : r.produitA) }}</td>
            <td :class="L.td" class="text-xs text-muted-foreground">{{ r.type === 'ensemble' ? 'ne voyage pas avec' : 'ne succède pas sans nettoyage à' }}</td>
            <td :class="L.td" class="text-xs">{{ nomProduit(r.type === 'succession' ? r.produitA : r.produitB) }}</td>
            <td :class="L.td"><button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="appliquer(store.retirerCompatibilite(r.id))">Retirer</button></td>
          </tr>
          <tr v-if="!store.compatibilites.length"><td :class="L.td" colspan="4" class="text-xs text-muted-foreground">Aucune règle.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-3 items-end">
      <div class="flex flex-col gap-1">
        <label :class="lbl">Produit</label>
        <select v-model="nvCompat.produit" :class="cls.fieldSelect"><option value="">Choisir…</option><option v-for="p in produits.actifs" :key="p.id" :value="p.id">{{ p.nom }}</option></select>
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Règle</label>
        <select v-model="nvCompat.type" :class="cls.fieldSelect">
          <option value="ensemble">ne voyage pas avec</option>
          <option value="succession">ne succède pas sans nettoyage à</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Produit</label>
        <select v-model="nvCompat.autre" :class="cls.fieldSelect"><option value="">Choisir…</option><option v-for="p in produits.actifs" :key="p.id" :value="p.id">{{ p.nom }}</option></select>
      </div>
      <button :class="cls.btnPrimary" @click="ajouterCompat">Ajouter</button>
    </div>

    <p :class="lbl" class="mb-2 mt-5">Exigences sur le véhicule, par client ou par site</p>
    <div class="overflow-x-auto">
      <table :class="L.table">
        <thead><tr><th :class="L.th">Client ou site</th><th :class="L.th">Camion à pompe</th><th :class="L.th">Types de véhicule acceptés</th><th :class="L.th"></th></tr></thead>
        <tbody>
          <tr v-for="c in store.contraintes" :key="c.id">
            <td :class="L.td" class="text-xs font-medium">{{ lieu(c) }}</td>
            <td :class="L.td"><input :checked="c.pompeExigee" type="checkbox" class="accent-primary" @change="majPompe(c.id, $event)" /></td>
            <td :class="L.td" class="text-xs">
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label v-for="t in typesProposes(c)" :key="t" class="flex items-center gap-1.5 cursor-pointer">
                  <input :checked="c.typesVehicule.includes(t)" type="checkbox" class="accent-primary" @change="majType(c, t, $event)" /> {{ t }}
                </label>
              </div>
            </td>
            <td :class="L.td"><button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="appliquer(store.retirerContrainte(c.id))">Retirer</button></td>
          </tr>
          <tr v-if="!store.contraintes.length"><td :class="L.td" colspan="4" class="text-xs text-muted-foreground">Aucune exigence.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="flex flex-col gap-2 mt-3">
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div class="flex flex-col gap-1">
          <label :class="lbl">Client ou site</label>
          <select v-model="nvContrainte.lieu" :class="cls.fieldSelect">
            <option value="">Choisir…</option>
            <optgroup label="Clients"><option v-for="c in clients.destinataires()" :key="c.id" :value="`c:${c.id}`">{{ c.nom }}</option></optgroup>
            <optgroup label="Sites"><option v-for="s in sites.actifs" :key="s.id" :value="`s:${s.id}`">{{ s.nom }}</option></optgroup>
          </select>
        </div>
        <label class="flex items-center gap-2 text-[13px] pb-2"><input v-model="nvContrainte.pompe" type="checkbox" class="accent-primary" /> Camion à pompe exigé</label>
        <button :class="cls.btnPrimary" @click="ajouterContrainte">Ajouter</button>
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <span :class="lbl" class="self-center">Types de véhicule acceptés</span>
        <label v-for="t in typesVeh.types.filter(x => x.actif && x.porteMarchandise)" :key="t.code" class="flex items-center gap-1.5 text-[12px] cursor-pointer">
          <input v-model="nvContrainte.types" type="checkbox" :value="t.libelle" class="accent-primary" /> {{ t.libelle }}
        </label>
      </div>
    </div>
    <p v-if="motif" class="text-[12px] text-destructive mt-2">{{ motif }}</p>
  </div>
</template>

<script setup lang="ts">
/** Règles de compatibilité des produits et exigences de livraison, appliquées à la proposition automatique comme aux corrections manuelles. */
import { ref } from 'vue'
import { useContraintesLivraisonStore, type ContrainteLivraison, type TypeCompatibilite } from '../../stores/contraintesLivraison'
import { useProduitsStore } from '../../stores/produits'
import { useClientsStore } from '../../stores/clients'
import { useSitesStore } from '../../stores/sites'
import { useTypesVehiculesStore } from '../../stores/typesVehicules'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useContraintesLivraisonStore()
const produits = useProduitsStore()
const clients = useClientsStore()
const sites = useSitesStore()
const typesVeh = useTypesVehiculesStore()
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const motif = ref('')
function appliquer(r: { ok: boolean; motif?: string }) { motif.value = r.ok ? '' : r.motif ?? ''; return r.ok }
const nomProduit = (id: string) => produits.getById(id)?.nom ?? id
const lieu = (c: ContrainteLivraison) => c.clientId ? clients.getById(c.clientId)?.nom ?? c.clientId : sites.getById(c.siteId ?? '')?.nom ?? c.siteId ?? '-'

const nvCompat = ref({ produit: '', type: 'ensemble' as TypeCompatibilite, autre: '' })
/** « B ne succède pas à A » : A est le produit précédent dans le compartiment. */
function ajouterCompat() {
  const n = nvCompat.value
  const r = n.type === 'succession'
    ? store.ajouterCompatibilite({ type: 'succession', produitA: n.autre, produitB: n.produit })
    : store.ajouterCompatibilite({ type: 'ensemble', produitA: n.produit, produitB: n.autre })
  if (appliquer(r)) nvCompat.value = { produit: '', type: n.type, autre: '' }
}

const nvContrainte = ref({ lieu: '', pompe: false, types: [] as string[] })
function ajouterContrainte() {
  const n = nvContrainte.value
  const r = store.ajouterContrainte({ clientId: n.lieu.startsWith('c:') ? n.lieu.slice(2) : undefined, siteId: n.lieu.startsWith('s:') ? n.lieu.slice(2) : undefined, pompeExigee: n.pompe, typesVehicule: n.types })
  if (appliquer(r)) nvContrainte.value = { lieu: '', pompe: false, types: [] }
}
/** Types de véhicule qui portent la marchandise, plus ceux déjà retenus sur la contrainte. */
const typesProposes = (c: ContrainteLivraison) => [...new Set([...typesVeh.types.filter(x => x.actif && x.porteMarchandise).map(x => x.libelle), ...c.typesVehicule])]
/** Types acceptés modifiables après création ; la case revient à son état si le changement est refusé. */
function majType(c: ContrainteLivraison, type: string, e: Event) {
  const box = e.target as HTMLInputElement
  const types = box.checked ? [...c.typesVehicule, type] : c.typesVehicule.filter(t => t !== type)
  if (!appliquer(store.modifierContrainte(c.id, { typesVehicule: types }))) box.checked = !box.checked
}
function majPompe(id: string, e: Event) {
  const c = e.target as HTMLInputElement
  if (!appliquer(store.modifierContrainte(id, { pompeExigee: c.checked }))) c.checked = !c.checked
}
</script>
