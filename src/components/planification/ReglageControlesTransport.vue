<template>
  <div :class="L.card" class="mt-5">
    <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
      <p class="text-sm font-semibold text-foreground">Écarts autorisés, motifs et date dépassée</p>
      <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="store.reinitialiser(); motif = ''">Revenir aux valeurs de départ</button>
    </div>

    <p :class="lbl" class="mb-2">Écarts autorisés entre quantité chargée et quantité livrée</p>
    <div class="overflow-x-auto">
      <table :class="L.table">
        <thead><tr><th :class="L.th">Client</th><th :class="L.th">Produit</th><th :class="L.th">Écart autorisé</th><th :class="L.th"></th></tr></thead>
        <tbody>
          <tr v-for="t in store.reglages.tolerances" :key="t.id">
            <td :class="L.td" class="text-xs">{{ t.clientId ? clients.getById(t.clientId)?.nom ?? t.clientId : (t.produitId ? 'Tous' : "Toute l'entreprise") }}</td>
            <td :class="L.td" class="text-xs">{{ t.produitId ? produits.getById(t.produitId)?.nom ?? t.produitId : 'Tous' }}</td>
            <td :class="L.td" class="whitespace-nowrap">
              <input :value="t.valeur" type="number" min="0" step="0.1" :class="cls.fieldInput" class="!h-[28px] !text-[12px] !w-[100px]" @change="majValeur(t.id, $event)" />
              <span class="text-[11px] text-muted-foreground ml-1">{{ store.libelleUnite(t.unite, t.produitId) }}</span>
            </td>
            <td :class="L.td"><button v-if="t.clientId || t.produitId" class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="appliquer(store.retirerTolerance(t.id))">Retirer</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_160px_auto] gap-2 mt-3 items-end">
      <div class="flex flex-col gap-1">
        <label :class="lbl">Client</label>
        <select v-model="nvTol.clientId" :class="cls.fieldSelect"><option value="">Tous</option><option v-for="c in clients.clients" :key="c.id" :value="c.id">{{ c.nom }}</option></select>
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Produit</label>
        <select v-model="nvTol.produitId" :class="cls.fieldSelect"><option value="">Tous</option><option v-for="p in produits.produits" :key="p.id" :value="p.id">{{ p.nom }}</option></select>
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Écart</label>
        <input v-model.number="nvTol.valeur" type="number" min="0" step="0.1" :class="cls.fieldInput" />
      </div>
      <div class="flex flex-col gap-1">
        <label :class="lbl">Unité</label>
        <select v-model="nvTol.unite" :class="cls.fieldSelect">
          <option value="pourcent">%</option>
          <option value="quantite">{{ nvTol.produitId ? store.libelleUnite('quantite', nvTol.produitId) : 'Unité du produit' }}</option>
        </select>
      </div>
      <button :class="cls.btnPrimary" @click="ajouterTol">Ajouter</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
      <div>
        <p :class="lbl" class="mb-2">Valeur hors tolérance</p>
        <label v-for="(lib, k) in LIB_MODE_DEPASSEMENT" :key="k" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer mb-1">
          <input type="radio" name="mode-depassement" class="accent-primary" :checked="store.reglages.modeDepassement === k" @change="appliquer(store.definirModeDepassement(k))" /> {{ lib }}
        </label>
      </div>
      <div>
        <p :class="lbl" class="mb-2">Commande ou tournée dont la date est dépassée sans exécution</p>
        <label v-for="(lib, k) in LIB_MODE_DATE_DEPASSEE" :key="k" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer mb-1">
          <input type="radio" name="mode-date-depassee" class="accent-primary" :checked="store.reglages.modeDateDepassee === k" @change="appliquer(store.definirModeDateDepassee(k))" /> {{ lib }}
        </label>
      </div>
    </div>

    <div class="mt-5" data-methode-volume15>
      <p :class="lbl" class="mb-2">Méthode de calcul du volume à 15 °C</p>
      <label v-for="(m, k) in METHODES_VOLUME15" :key="k" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer mb-1">
        <input type="radio" name="methode-volume15" class="accent-primary" :checked="store.methodeVolume15() === k" @change="appliquer(store.definirMethodeVolume15(k))" /> {{ m.libelle }}
      </label>
    </div>

    <div class="flex gap-1 border-b border-border mt-5 mb-3">
      <button v-for="(lib, k) in LIB_LISTE" :key="k" class="px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px bg-transparent cursor-pointer"
        :class="liste === k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'" @click="liste = k; motif = ''">{{ lib }}</button>
    </div>
    <div v-for="e in store.reglages[liste]" :key="e.code" class="flex items-center gap-2 py-1.5 border-b border-border/60">
      <span class="font-mono text-[11px] w-[90px] shrink-0">{{ e.code }}</span>
      <span v-if="liste === 'codesMotif'" class="text-[11px] text-muted-foreground w-[110px] shrink-0">{{ store.libelleMotif('typesMotif', e.typeMotif) }}</span>
      <input :value="e.libelle" :class="cls.fieldInput" class="!h-[30px] !text-[12px] flex-1" @change="majLibelle(e.code, $event)" />
      <label class="flex items-center gap-1.5 text-[12px]"><input :checked="e.actif" type="checkbox" class="accent-primary" @change="majActif(e.code, $event)" /> Actif</label>
      <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="appliquer(store.supprimerEntree(liste, e.code))">Supprimer</button>
    </div>
    <div class="flex flex-wrap gap-2 mt-2 items-center">
      <input v-model="nvEntree.code" :class="cls.fieldInput" class="!h-[32px] !w-[120px] font-mono" placeholder="Code" />
      <select v-if="liste === 'codesMotif'" v-model="nvEntree.typeMotif" :class="cls.fieldSelect" class="!h-[32px] !w-[160px]">
        <option value="">Type de motif…</option><option v-for="t in store.motifs('typesMotif')" :key="t.code" :value="t.code">{{ t.libelle }}</option>
      </select>
      <input v-model="nvEntree.libelle" :class="cls.fieldInput" class="!h-[32px] flex-1 min-w-[160px]" placeholder="Libellé" />
      <button :class="cls.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterEntree">Ajouter</button>
    </div>
    <p v-if="motif" class="text-[12px] text-destructive mt-2">{{ motif }}</p>
  </div>
</template>

<script setup lang="ts">
/** Écarts autorisés (entreprise, client, produit), comportement hors tolérance, méthode de calcul du volume à 15 °C, listes de motifs et comportement en cas de date dépassée. */
import { ref } from 'vue'
import { useControlesTransportStore, LIB_MODE_DEPASSEMENT, LIB_MODE_DATE_DEPASSEE, LIB_LISTE, type NomListe, type UniteTolerance } from '../../stores/controlesTransport'
import { useClientsStore } from '../../stores/clients'
import { useProduitsStore } from '../../stores/produits'
import { METHODES_VOLUME15 } from '../../lib/volume15'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useControlesTransportStore()
const clients = useClientsStore()
const produits = useProduitsStore()
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const motif = ref('')
function appliquer(r: { ok: boolean; motif?: string }) { motif.value = r.ok ? '' : r.motif ?? ''; return r.ok }

const tolVide = () => ({ clientId: '', produitId: '', valeur: undefined as number | undefined, unite: 'pourcent' as UniteTolerance })
const nvTol = ref(tolVide())
function ajouterTol() {
  const n = nvTol.value
  if (!n.clientId && !n.produitId) { motif.value = "L'écart de l'entreprise existe déjà : modifiez sa valeur, ou choisissez un client ou un produit."; return }
  if (appliquer(store.ajouterTolerance({ clientId: n.clientId || undefined, produitId: n.produitId || undefined, valeur: n.valeur as number, unite: n.unite }))) nvTol.value = tolVide()
}
function majValeur(id: string, e: Event) {
  const zone = e.target as HTMLInputElement
  if (!appliquer(store.modifierTolerance(id, { valeur: zone.value === '' ? NaN : Number(zone.value) }))) zone.value = String(store.reglages.tolerances.find(t => t.id === id)?.valeur ?? '')
}

const liste = ref<NomListe>('typesIncident')
const nvEntree = ref({ code: '', libelle: '', typeMotif: '' })
function ajouterEntree() {
  if (appliquer(store.ajouterEntree(liste.value, nvEntree.value))) nvEntree.value = { code: '', libelle: '', typeMotif: nvEntree.value.typeMotif }
}
function majLibelle(code: string, e: Event) {
  const zone = e.target as HTMLInputElement
  if (!appliquer(store.modifierEntree(liste.value, code, { libelle: zone.value }))) zone.value = store.libelleMotif(liste.value, code)
}
function majActif(code: string, e: Event) {
  const c = e.target as HTMLInputElement
  if (!appliquer(store.modifierEntree(liste.value, code, { actif: c.checked }))) c.checked = !c.checked
}
</script>
