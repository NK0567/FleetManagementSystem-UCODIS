<template>
  <div :class="L.card" class="mt-5">
    <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
      <p class="text-sm font-semibold text-foreground">Tarifs de transport</p>
      <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="store.reinitialiser(); motif = ''">Revenir aux valeurs de départ</button>
    </div>

    <div class="flex gap-1 border-b border-border mb-3">
      <button v-for="(lib, k) in LIB_CIBLE_TARIF" :key="k" class="px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px bg-transparent cursor-pointer"
        :class="cible === k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'" @click="cible = k; nv.tiersId = ''; motif = ''">
        {{ k === 'client' ? 'Clients' : 'Transporteurs externes' }}
      </button>
    </div>

    <div class="overflow-x-auto">
      <table :class="L.table">
        <thead><tr>
          <th :class="L.th">{{ cible === 'client' ? 'Client' : 'Transporteur' }}</th><th :class="L.th">Base de calcul</th><th :class="L.th">Trajet</th>
          <th :class="L.th">Type de marchandise</th><th :class="L.th">Prix ({{ $devise() }})</th><th :class="L.th">Actif</th><th :class="L.th"></th>
        </tr></thead>
        <tbody>
          <tr v-for="t in lignes" :key="t.id">
            <td :class="L.td" class="text-xs font-medium">{{ store.nomTiers(t.cible, t.tiersId) }}</td>
            <td :class="L.td" class="text-xs">{{ LIB_BASE_TARIF[t.base] }}</td>
            <td :class="L.td" class="text-xs">{{ t.trajetId ? trajets.getById(t.trajetId)?.libelle ?? t.trajetId : '-' }}</td>
            <td :class="L.td" class="text-xs">{{ marchandise(t) }}</td>
            <td :class="L.td" class="whitespace-nowrap">
              <input :value="t.prix" type="number" min="0" :class="cls.fieldInput" class="!h-[28px] !text-[12px] !w-[120px]" @change="majPrix(t.id, $event)" />
              <span class="text-[11px] text-muted-foreground ml-1">{{ SUFFIXE[t.base] }}</span>
            </td>
            <td :class="L.td"><input :checked="t.actif" type="checkbox" class="accent-primary" @change="majActif(t.id, $event)" /></td>
            <td :class="L.td"><button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="appliquer(store.supprimer(t.id))">Supprimer</button></td>
          </tr>
          <tr v-if="!lignes.length"><td :class="L.td" colspan="7" class="text-xs text-muted-foreground">Aucune grille.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3 items-end">
      <div class="flex flex-col gap-1">
        <label :class="lbl">{{ cible === 'client' ? 'Client' : 'Transporteur' }}</label>
        <select v-model="nv.tiersId" :class="cls.fieldSelect"><option value="">Choisir…</option><option v-for="o in optTiers" :key="o.id" :value="o.id">{{ o.label }}</option></select>
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Base de calcul</label>
        <select v-model="nv.base" :class="cls.fieldSelect"><option v-for="(lib, k) in LIB_BASE_TARIF" :key="k" :value="k">{{ lib }}</option></select>
      </div>
      <div v-if="nv.base === 'trajet'" class="flex flex-col gap-1">
        <label :class="lbl">Trajet</label>
        <select v-model="nv.trajetId" :class="cls.fieldSelect"><option value="">Choisir…</option><option v-for="tr in trajets.actifs" :key="tr.id" :value="tr.id">{{ tr.libelle }}</option></select>
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Type de marchandise</label>
        <select v-model="nv.marchandise" :class="cls.fieldSelect">
          <option value="">Toutes</option>
          <optgroup label="Familles"><option v-for="f in produits.familles" :key="f" :value="`f:${f}`">{{ f }}</option></optgroup>
          <optgroup label="Produits"><option v-for="p in produits.actifs" :key="p.id" :value="`p:${p.id}`">{{ p.nom }}</option></optgroup>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Prix ({{ $devise() }}) {{ SUFFIXE[nv.base] }}</label>
        <input v-model.number="nv.prix" type="number" min="0" :class="cls.fieldInput" />
      </div>
      <button :class="cls.btnPrimary" @click="ajouter">Ajouter</button>
    </div>
    <p v-if="motif" class="text-[12px] text-destructive mt-2">{{ motif }}</p>
  </div>
</template>

<script setup lang="ts">
/** Grilles tarifaires des clients et des transporteurs externes, dans la monnaie de l'entreprise. */
import { computed, ref } from 'vue'
import { useTarifsTransportStore, LIB_BASE_TARIF, LIB_CIBLE_TARIF, type BaseTarif, type CibleTarif, type TarifTransport } from '../../stores/tarifsTransport'
import { useClientsStore } from '../../stores/clients'
import { usePrestatairesStore } from '../../stores/prestataires'
import { useTrajetsStore } from '../../stores/trajets'
import { useProduitsStore } from '../../stores/produits'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useTarifsTransportStore()
const clients = useClientsStore()
const prestataires = usePrestatairesStore()
const trajets = useTrajetsStore()
const produits = useProduitsStore()
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const SUFFIXE: Record<BaseTarif, string> = { distance: 'par km', trajet: 'par trajet', quantite: 'par unité', poids: 'par tonne' }

const cible = ref<CibleTarif>('client')
const lignes = computed(() => store.tarifs.filter(t => t.cible === cible.value))
/** Clients externes pour lesquels l'entreprise transporte (ordonnateurs ou destinataires) ; transporteurs autorisés du référentiel des prestataires. */
const optTiers = computed(() => cible.value === 'client'
  ? clients.clients.filter(c => c.nature !== 'interne' && (c.ordonnateur || c.destinataire)).map(c => ({ id: c.id, label: c.nom }))
  : prestataires.prestataires.filter(p => p.type === 'transporteur' && p.autorise).map(p => ({ id: p.id, label: p.nom })))
const marchandise = (t: TarifTransport) => t.produitId ? produits.getById(t.produitId)?.nom ?? t.produitId : t.famille ?? 'Toutes'

const vide = () => ({ tiersId: '', base: 'distance' as BaseTarif, trajetId: '', marchandise: '', prix: undefined as number | undefined })
const nv = ref(vide())
const motif = ref('')
function appliquer(r: { ok: boolean; motif?: string }) { motif.value = r.ok ? '' : r.motif ?? ''; return r.ok }
function ajouter() {
  const m = nv.value.marchandise
  const r = store.creer({ cible: cible.value, tiersId: nv.value.tiersId, base: nv.value.base, trajetId: nv.value.trajetId || undefined, prix: nv.value.prix as number,
    famille: m.startsWith('f:') ? m.slice(2) : undefined, produitId: m.startsWith('p:') ? m.slice(2) : undefined })
  if (appliquer(r)) nv.value = vide()
}
/** Case « Actif » : remise à son état si le changement est refusé. */
function majActif(id: string, e: Event) {
  const c = e.target as HTMLInputElement
  if (!appliquer(store.modifier(id, { actif: c.checked }))) c.checked = !!store.getById(id)?.actif
}
function majPrix(id: string, e: Event) {
  const zone = e.target as HTMLInputElement
  if (!appliquer(store.modifier(id, { prix: zone.value === '' ? NaN : Number(zone.value) }))) zone.value = String(store.getById(id)?.prix ?? '')
}
</script>
