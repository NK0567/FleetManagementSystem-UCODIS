<script setup lang="ts">
/** Onglet Référentiels de la configuration : types de véhicules, d'équipements embarqués, de sites et de prestataires (FMS-PA-01, PA-03). */
import { ref } from 'vue'
import { Building2, ClipboardList, MapPinned, Package, Truck, Undo2, Wrench } from '@lucide/vue'
import { useFlotteEtatStore, ETATS_FLOTTE, LIB_GROUPE_ETAT } from '../../stores/flotteEtat'
import type { CodeEtatFlotte } from '../../types'
import { useTypesVehiculesStore, LIB_ROLE_ATTELAGE, type RoleAttelage, type TypeVehiculeDef } from '../../stores/typesVehicules'
import { useTypesEquipementsStore } from '../../stores/typesEquipements'
import { useTypesSitesStore } from '../../stores/typesSites'
import { usePrestatairesStore } from '../../stores/prestataires'
import { useVehiculeStore } from '../../stores/vehicules'
import { useProduitsStore, UNITES_PRODUIT, type Produit } from '../../stores/produits'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const typesVeh = useTypesVehiculesStore()
const typesEq = useTypesEquipementsStore()
const typesSites = useTypesSitesStore()
const prestataires = usePrestatairesStore()
const vehicules = useVehiculeStore()
const utilise = (code: string) => vehicules.liste.filter(v => v.type === code).length

const nvVeh = ref({ libelle: '', motorise: false, attelage: 'est_tracte' as RoleAttelage, porteMarchandise: true, compartiments: false }); const errVeh = ref('')
function ajouterVeh() { const r = typesVeh.ajouter(nvVeh.value); errVeh.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nvVeh.value = { libelle: '', motorise: false, attelage: 'est_tracte', porteMarchandise: true, compartiments: false } }
/* Modification d'un type tant qu'aucun véhicule ne l'utilise. */
const edVeh = ref<{ code: string; libelle: string; motorise: boolean; attelage: RoleAttelage; porteMarchandise: boolean; compartiments: boolean } | null>(null); const errEdVeh = ref('')
function modifierVeh(t: TypeVehiculeDef) { errEdVeh.value = ''; edVeh.value = { code: t.code, libelle: t.libelle, motorise: t.motorise, attelage: t.attelage, porteMarchandise: t.porteMarchandise, compartiments: t.compartiments } }
function enregistrerVeh() {
  if (!edVeh.value) return
  const { code, ...d } = edVeh.value
  const r = typesVeh.modifier(code, d)
  errEdVeh.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) edVeh.value = null
}
const nvEq = ref({ libelle: '', avecEcheance: false, camera: false }); const errEq = ref('')
function ajouterEq() { const r = typesEq.ajouter(nvEq.value.libelle, nvEq.value.avecEcheance, nvEq.value.camera); errEq.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nvEq.value = { libelle: '', avecEcheance: false, camera: false } }
const nvSite = ref({ libelle: '', rayon: 500, depot: false }); const errSite = ref('')
function ajouterSite() { const r = typesSites.ajouter(nvSite.value.libelle, nvSite.value.rayon, nvSite.value.depot); errSite.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nvSite.value = { libelle: '', rayon: 500, depot: false } }
function basculerDepot(libelle: string, e: Event) { const c = e.target as HTMLInputElement; const r = typesSites.definirDepot(libelle, c.checked); errSite.value = r.ok ? '' : r.motif ?? ''; if (!r.ok) c.checked = !c.checked }
const nvPrest = ref(''); const errPrest = ref('')
/* États de la flotte : code et libellé affichés dans l'état de flotte quotidien. */
const flotteEtat = useFlotteEtatStore()
const errEtat = ref('')
function majEtat(cle: CodeEtatFlotte, champ: 'code' | 'libelle', e: Event) {
  const zone = e.target as HTMLInputElement
  const actuel = flotteEtat.reglagesEtats[cle] ?? { code: cle, libelle: cle }
  const r = flotteEtat.modifierEtat(cle, champ === 'code' ? zone.value : actuel.code, champ === 'libelle' ? zone.value : actuel.libelle)
  errEtat.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) zone.value = actuel[champ]
}
/* Produits transportés : famille, unité, densité de référence et coefficient de dilatation pour le carburant ; un produit utilisé ne se supprime pas. */
const produits = useProduitsStore()
const produitVide = () => ({ nom: '', famille: '', unite: '', carburant: false, densiteReference: undefined as number | undefined, coefficientDilatation: undefined as number | undefined })
const nvProd = ref(produitVide()); const errProd = ref('')
function ajouterProd() { const r = produits.creer(nvProd.value); errProd.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nvProd.value = produitVide() }
const edProd = ref<(ReturnType<typeof produitVide> & { id: string }) | null>(null)
function modifierProd(p: Produit) { errProd.value = ''; edProd.value = { id: p.id, nom: p.nom, famille: p.famille, unite: p.unite, carburant: p.carburant, densiteReference: p.densiteReference, coefficientDilatation: p.coefficientDilatation } }
function enregistrerProd() {
  if (!edProd.value) return
  const { id, ...d } = edProd.value
  const r = produits.modifier(id, d); errProd.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) edProd.value = null
}
function basculerProd(p: Produit, e: Event) { const r = produits.changerActif(p.id, (e.target as HTMLInputElement).checked); errProd.value = r.ok ? '' : r.motif ?? ''; if (!r.ok) (e.target as HTMLInputElement).checked = p.actif }
function supprimerProd(p: Produit) { const r = produits.supprimer(p.id); errProd.value = r.ok ? '' : r.motif ?? '' }
function ajouterPrest() { const r = prestataires.ajouterType(nvPrest.value); errPrest.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nvPrest.value = '' }
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
    <div :class="L.card" class="lg:col-span-2">
      <div class="flex items-center gap-2 mb-3"><Truck class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Types de véhicules</h2></div>
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead><tr><th :class="L.th">Libellé</th><th :class="L.th">Motorisé</th><th :class="L.th">Attelage</th><th :class="L.th">Porte la marchandise</th><th :class="L.th">Compartiments</th><th :class="L.th">Véhicules</th><th :class="L.th">Actif</th><th :class="L.th"></th></tr></thead>
          <tbody>
            <tr v-for="t in typesVeh.types" :key="t.code">
              <template v-if="edVeh?.code === t.code">
                <td :class="L.td"><input v-model="edVeh.libelle" :class="F.fieldInput" class="!h-[28px] !text-[12px] min-w-[160px]" /></td>
                <td :class="L.td"><input v-model="edVeh.motorise" type="checkbox" class="accent-primary" /></td>
                <td :class="L.td">
                  <select v-model="edVeh.attelage" :class="F.fieldSelect" class="!h-[28px] !text-[12px] !w-[190px]">
                    <option v-for="(lib, k) in LIB_ROLE_ATTELAGE" :key="k" :value="k">{{ lib }}</option>
                  </select>
                </td>
                <td :class="L.td"><input v-model="edVeh.porteMarchandise" type="checkbox" class="accent-primary" /></td>
                <td :class="L.td"><input v-model="edVeh.compartiments" type="checkbox" class="accent-primary" /></td>
                <td :class="L.td" class="text-xs">{{ utilise(t.code) }}</td>
                <td :class="L.td"><input v-model="t.actif" type="checkbox" class="accent-primary" /></td>
                <td :class="L.td" class="whitespace-nowrap">
                  <button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer mr-2" @click="enregistrerVeh">Enregistrer</button>
                  <button class="text-[11px] text-muted-foreground hover:underline bg-transparent border-0 cursor-pointer" @click="edVeh = null; errEdVeh = ''">Annuler</button>
                </td>
              </template>
              <template v-else>
                <td :class="L.td" class="text-xs font-medium">{{ t.libelle }}</td>
                <td :class="L.td" class="text-xs">{{ t.motorise ? 'Oui' : 'Non' }}</td>
                <td :class="L.td" class="text-xs">{{ LIB_ROLE_ATTELAGE[t.attelage] }}</td>
                <td :class="L.td" class="text-xs">{{ t.porteMarchandise ? 'Oui' : 'Non' }}</td>
                <td :class="L.td" class="text-xs">{{ t.compartiments ? 'Oui' : 'Non' }}</td>
                <td :class="L.td" class="text-xs">{{ utilise(t.code) }}</td>
                <td :class="L.td"><input v-model="t.actif" type="checkbox" class="accent-primary" /></td>
                <td :class="L.td"><button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer" @click="modifierVeh(t)">Modifier</button></td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap gap-2 mt-3 items-center">
        <input v-model="nvVeh.libelle" :class="F.fieldInput" class="!h-[32px] flex-1 min-w-[180px]" placeholder="Nouveau type de véhicule" />
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="nvVeh.motorise" type="checkbox" class="accent-primary" /> Motorisé</label>
        <select v-model="nvVeh.attelage" :class="F.fieldSelect" class="!h-[32px] !w-[210px]">
          <option v-for="(lib, k) in LIB_ROLE_ATTELAGE" :key="k" :value="k">{{ lib }}</option>
        </select>
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="nvVeh.porteMarchandise" type="checkbox" class="accent-primary" /> Porte la marchandise</label>
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="nvVeh.compartiments" type="checkbox" class="accent-primary" /> Compartiments</label>
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterVeh">Ajouter</button>
      </div>
      <p v-if="errEdVeh" class="text-[12px] text-danger mt-2">{{ errEdVeh }}</p>
      <p v-if="errVeh" class="text-[12px] text-danger mt-2">{{ errVeh }}</p>
    </div>

    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><Wrench class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Équipements embarqués</h2></div>
      <div v-for="t in typesEq.types" :key="t.code" class="flex items-center gap-2 py-1.5 border-b border-border/60">
        <input v-model="t.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px] flex-1" />
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="t.avecEcheance" type="checkbox" class="accent-primary" /> Échéance</label>
        <label v-if="t.avecEcheance" class="flex items-center gap-1 text-[12px]">Préavis <input v-model.number="t.preavisJours" type="number" min="0" :class="F.fieldInput" class="!h-[30px] !w-[60px] !text-[12px]" /> jours</label>
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="t.camera" type="checkbox" class="accent-primary" /> Caméra</label>
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="t.actif" type="checkbox" class="accent-primary" /> Actif</label>
      </div>
      <div class="flex gap-2 mt-2 items-center">
        <input v-model="nvEq.libelle" :class="F.fieldInput" class="!h-[32px] flex-1" placeholder="Nouvel équipement" />
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="nvEq.avecEcheance" type="checkbox" class="accent-primary" /> Échéance</label>
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="nvEq.camera" type="checkbox" class="accent-primary" /> Caméra</label>
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterEq">Ajouter</button>
      </div>
      <p v-if="errEq" class="text-[12px] text-danger mt-2">{{ errEq }}</p>
    </div>

    <div class="flex flex-col gap-3.5">
      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><MapPinned class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Types de sites</h2></div>
        <div v-for="t in typesSites.types" :key="t.libelle" class="flex flex-wrap items-center gap-2 py-1.5 border-b border-border/60">
          <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: t.couleur }"></span>
          <span class="text-[12px] flex-1">{{ t.libelle }}</span>
          <input v-model.number="t.rayonDefautM" type="number" min="50" :class="F.fieldInput" class="!h-[30px] !text-[12px] !w-[90px]" />
          <span class="text-[11px] text-muted-foreground">m</span>
          <label class="flex items-center gap-1.5 text-[12px]"><input :checked="!!t.depotChargement" type="checkbox" class="accent-primary" @change="basculerDepot(t.libelle, $event)" /> Dépôt de chargement</label>
          <label class="flex items-center gap-1.5 text-[12px]"><input v-model="t.actif" type="checkbox" class="accent-primary" /> Actif</label>
        </div>
        <div class="flex flex-wrap gap-2 mt-2 items-center">
          <input v-model="nvSite.libelle" :class="F.fieldInput" class="!h-[32px] flex-1" placeholder="Nouveau type de site" />
          <input v-model.number="nvSite.rayon" type="number" min="50" :class="F.fieldInput" class="!h-[32px] !w-[90px]" />
          <label class="flex items-center gap-1.5 text-[12px] whitespace-nowrap"><input v-model="nvSite.depot" type="checkbox" class="accent-primary" /> Dépôt de chargement</label>
          <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterSite">Ajouter</button>
        </div>
        <p v-if="errSite" class="text-[12px] text-danger mt-2">{{ errSite }}</p>
      </div>

      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><Building2 class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Types de prestataires</h2></div>
        <div v-for="t in prestataires.types" :key="t.code" class="flex items-center gap-2 py-1.5 border-b border-border/60">
          <input v-model="t.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px] flex-1" />
        </div>
        <div class="flex gap-2 mt-2">
          <input v-model="nvPrest" :class="F.fieldInput" class="!h-[32px] flex-1" placeholder="Nouveau type de prestataire" />
          <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterPrest">Ajouter</button>
        </div>
        <p v-if="errPrest" class="text-[12px] text-danger mt-2">{{ errPrest }}</p>
      </div>
    </div>
    <div :class="L.card" class="lg:col-span-2">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2"><Package class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Produits transportés</h2></div>
        <button :class="F.btnOutline" class="!text-[12px]" @click="produits.reinitialiser(); errProd = ''; edProd = null"><Undo2 class="w-3.5 h-3.5" /> Revenir aux valeurs de départ</button>
      </div>
      <datalist id="unites-produit"><option v-for="u in UNITES_PRODUIT" :key="u" :value="u" /></datalist>
      <datalist id="familles-produit"><option v-for="f in produits.familles" :key="f" :value="f" /></datalist>
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead><tr><th :class="L.th">Nom</th><th :class="L.th">Famille</th><th :class="L.th">Unité</th><th :class="L.th">Carburant</th><th :class="L.th">Densité de référence (kg/L)</th><th :class="L.th">Coefficient de dilatation (par °C)</th><th :class="L.th">Actif</th><th :class="L.th"></th></tr></thead>
          <tbody>
            <tr v-for="p in produits.produits" :key="p.id">
              <template v-if="edProd?.id === p.id">
                <td :class="L.td"><input v-model="edProd.nom" :class="F.fieldInput" class="!h-[28px] !text-[12px] min-w-[160px]" /></td>
                <td :class="L.td"><input v-model="edProd.famille" list="familles-produit" :class="F.fieldInput" class="!h-[28px] !text-[12px] min-w-[120px]" /></td>
                <td :class="L.td"><input v-model="edProd.unite" list="unites-produit" :class="F.fieldInput" class="!h-[28px] !text-[12px] min-w-[110px]" /></td>
                <td :class="L.td"><input v-model="edProd.carburant" type="checkbox" class="accent-primary" /></td>
                <td :class="L.td"><input v-model.number="edProd.densiteReference" type="number" min="0" step="0.001" :disabled="!edProd.carburant" :class="F.fieldInput" class="!h-[28px] !text-[12px] !w-[100px]" /></td>
                <td :class="L.td"><input v-model.number="edProd.coefficientDilatation" type="number" min="0" step="0.0001" :disabled="!edProd.carburant" :class="F.fieldInput" class="!h-[28px] !text-[12px] !w-[100px]" /></td>
                <td :class="L.td"><input :checked="p.actif" type="checkbox" class="accent-primary" @change="basculerProd(p, $event)" /></td>
                <td :class="L.td" class="whitespace-nowrap">
                  <button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer mr-2" @click="enregistrerProd">Enregistrer</button>
                  <button class="text-[11px] text-muted-foreground hover:underline bg-transparent border-0 cursor-pointer" @click="edProd = null; errProd = ''">Annuler</button>
                </td>
              </template>
              <template v-else>
                <td :class="L.td" class="text-xs font-medium">{{ p.nom }}</td>
                <td :class="L.td" class="text-xs">{{ p.famille }}</td>
                <td :class="L.td" class="text-xs">{{ p.unite }}</td>
                <td :class="L.td" class="text-xs">{{ p.carburant ? 'Oui' : 'Non' }}</td>
                <td :class="L.td" class="text-xs">{{ p.densiteReference != null ? p.densiteReference.toLocaleString('fr-FR') : '-' }}</td>
                <td :class="L.td" class="text-xs">{{ p.carburant ? (p.coefficientDilatation != null ? p.coefficientDilatation.toLocaleString('fr-FR', { maximumFractionDigits: 6 }) : 'Non renseigné') : '-' }}</td>
                <td :class="L.td"><input :checked="p.actif" type="checkbox" class="accent-primary" @change="basculerProd(p, $event)" /></td>
                <td :class="L.td" class="whitespace-nowrap">
                  <button class="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer mr-2" @click="modifierProd(p)">Modifier</button>
                  <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="supprimerProd(p)">Supprimer</button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap gap-2 mt-3 items-center">
        <input v-model="nvProd.nom" :class="F.fieldInput" class="!h-[32px] flex-1 min-w-[180px]" placeholder="Nouveau produit" />
        <input v-model="nvProd.famille" list="familles-produit" :class="F.fieldInput" class="!h-[32px] !w-[150px]" placeholder="Famille" />
        <input v-model="nvProd.unite" list="unites-produit" :class="F.fieldInput" class="!h-[32px] !w-[130px]" placeholder="Unité" />
        <label class="flex items-center gap-1.5 text-[12px]"><input v-model="nvProd.carburant" type="checkbox" class="accent-primary" /> Carburant</label>
        <input v-if="nvProd.carburant" v-model.number="nvProd.densiteReference" type="number" min="0" step="0.001" :class="F.fieldInput" class="!h-[32px] !w-[150px]" placeholder="Densité (kg/L)" />
        <input v-if="nvProd.carburant" v-model.number="nvProd.coefficientDilatation" type="number" min="0" step="0.0001" :class="F.fieldInput" class="!h-[32px] !w-[190px]" placeholder="Coefficient de dilatation" />
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterProd">Ajouter</button>
      </div>
      <p v-if="errProd" class="text-[12px] text-danger mt-2">{{ errProd }}</p>
    </div>
    <div :class="L.card" class="lg:col-span-2">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2"><ClipboardList class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">États de la flotte</h2></div>
        <button :class="F.btnOutline" class="!text-[12px]" @click="flotteEtat.reinitialiserEtats(); errEtat = ''"><Undo2 class="w-3.5 h-3.5" /> Revenir aux valeurs de départ</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead><tr class="text-left text-[11px] uppercase text-muted-foreground">
            <th class="py-1.5 pr-3">Groupe</th><th class="py-1.5 pr-3">Code</th><th class="py-1.5">Libellé</th>
          </tr></thead>
          <tbody>
            <tr v-for="e in ETATS_FLOTTE" :key="e.code" class="border-t border-border/60">
              <td class="py-1.5 pr-3 text-[12px] text-muted-foreground whitespace-nowrap">{{ LIB_GROUPE_ETAT[e.groupe] }}</td>
              <td class="py-1.5 pr-3"><input :key="`c-${e.code}-${flotteEtat.reglagesEtats[e.code]?.code}`" :value="flotteEtat.reglagesEtats[e.code]?.code" :class="F.fieldInput" class="!h-[30px] !text-[12px] !w-[120px] font-mono" @change="majEtat(e.code, 'code', $event)" /></td>
              <td class="py-1.5"><input :key="`l-${e.code}-${flotteEtat.reglagesEtats[e.code]?.libelle}`" :value="flotteEtat.reglagesEtats[e.code]?.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px]" @change="majEtat(e.code, 'libelle', $event)" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="errEtat" class="text-[12px] text-danger mt-2">{{ errEtat }}</p>
    </div>
  </div>
</template>
