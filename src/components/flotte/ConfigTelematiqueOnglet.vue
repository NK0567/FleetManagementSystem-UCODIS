<script setup lang="ts">
/** Onglet Télématique de la configuration : événements remontés par les équipements embarqués
 *  et règles de détection (FMS-GP-02 à GP-04, PA-05). */
import { ref, computed } from 'vue'
import { Radio, SlidersHorizontal, Undo2 } from '@lucide/vue'
import { useTelematiqueStore, LIB_FAMILLE_EVENEMENT, type FamilleEvenement, type TypeEvenementDef } from '../../stores/telematique'
import { useInfractionsStore } from '../../stores/infractions'
import { useSitesStore } from '../../stores/sites'
import { useTypesSitesStore } from '../../stores/typesSites'
import { LIB_GRAVITE, useConfigTypesEcartStore } from '../../stores/ecarts'
import type { GraviteEcart } from '../../types'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useTelematiqueStore()
const infractions = useInfractionsStore()
const sites = useSitesStore()
const p = store.parametres

const typesSitesRef = useTypesSitesStore()
const typesSites = computed(() => [...new Set([...typesSitesRef.types.filter(t => t.actif).map(t => t.libelle), ...sites.sites.map(s => s.type as string)])].sort())
function basculer(liste: string[], t: string) { const i = liste.indexOf(t); if (i >= 0) liste.splice(i, 1); else liste.push(t) }
const avertVitesse = computed(() => p.vitesseLimiteKmh < 30 || p.vitesseLimiteKmh > 130)
const avertPenalites = computed(() => [p.penaliteCritique, p.penaliteMajeur, p.penaliteMineur].some(x => x < 0 || x > 50))

const familles = Object.keys(LIB_FAMILLE_EVENEMENT) as FamilleEvenement[]
const parFamille = computed(() => familles.map(f => ({ famille: f, types: store.types.filter(t => t.famille === f) })).filter(g => g.types.length))
const erreurs = ref<Record<string, string>>({})
function maj(t: TypeEvenementDef, d: Partial<TypeEvenementDef>) {
  const r = store.majType(t.code, d)
  erreurs.value = { ...erreurs.value, [t.code]: r.ok ? '' : r.motif ?? '' }
}
const nouveau = ref({ libelle: '', famille: 'camera' as FamilleEvenement, gravite: 'majeur' as GraviteEcart }); const erreurNouveau = ref('')
function ajouter() {
  const r = store.ajouterType(nouveau.value)
  erreurNouveau.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouveau.value = { libelle: '', famille: nouveau.value.famille, gravite: 'majeur' }
}
const typesInfraction = computed(() => infractions.types.filter(t => t.actif))

/* Un seul seuil par usage : l'événement « Arrêt » alimente le journal brut,
   l'écart « Arrêt non planifié » se règle uniquement dans l'onglet Types d'écart. */
const typesEcart = useConfigTypesEcartStore()
const typeArret = computed(() => store.typeDe('ARRET'))
const typeArretEcart = computed(() => typesEcart.types.find(t => t.detecte === 'arret_non_planifie'))
const erreurArret = ref('')
function majSeuilArret(v: number) {
  if (!typeArret.value) return
  const r = store.majType('ARRET', { seuil: v })
  erreurArret.value = r.ok ? '' : r.motif ?? ''
}
const contradictionArret = computed(() => typeArret.value?.actif && typeArretEcart.value?.actif && typeArret.value.seuil != null && typeArretEcart.value.seuilValeur != null
  && typeArret.value.seuil > typeArretEcart.value.seuilValeur)
const avertDelais = computed(() => [p.delaiJustificationH, p.regroupementExcesMin, p.seuilHorsZoneM].some(x => !Number.isFinite(x) || x < 0))
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><SlidersHorizontal class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Règles de détection</h2></div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Vitesse limite retenue (km/h)</label>
            <input v-model.number="p.vitesseLimiteKmh" type="number" min="1" :class="F.fieldInput" />
            <p v-if="avertVitesse" class="text-[11px] text-warning">Valeur inhabituelle pour un poids lourd.</p>
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Alerte sur un comportement de moins de (jours)</label>
            <input v-model.number="p.joursAlerteConduite" type="number" min="1" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Excès de vitesse regroupés en un seul s'ils reprennent dans les (min)</label>
            <input v-model.number="p.regroupementExcesMin" type="number" min="0" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Délai de justification d'un écart (heures)</label>
            <input v-model.number="p.delaiJustificationH" type="number" min="0" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Hors zone au-delà de (mètres du tracé), si la sortie du corridor n'a pas de seuil actif</label>
            <input v-model.number="p.seuilHorsZoneM" type="number" min="0" :class="F.fieldInput" />
          </div>
          <p v-if="avertDelais" class="text-[11px] text-danger">Une valeur doit être un nombre positif.</p>
          <div v-if="typeArret" :class="F.field">
            <label :class="F.fieldLabel">Arrêt enregistré au journal au-delà de (min)</label>
            <input :value="typeArret.seuil" type="number" min="0" :class="F.fieldInput" @change="ev => majSeuilArret(Number((ev.target as HTMLInputElement).value))" />
          </div>
          <p v-if="erreurArret" class="text-[11px] text-danger">{{ erreurArret }}</p>
          <p v-else-if="contradictionArret" class="text-[11px] text-warning">Un arrêt non planifié serait à qualifier sans figurer au journal : le seuil du journal doit rester inférieur.</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-foreground mb-1.5">Sites désignés pour le repos</p>
          <label v-for="t in typesSites" :key="t" class="flex items-center gap-2 text-[12px] py-0.5 cursor-pointer">
            <input type="checkbox" class="accent-primary" :checked="p.typesSitesRepos.includes(t)" @change="basculer(p.typesSitesRepos, t)" /> {{ t }}
          </label>
          <p class="text-xs font-semibold text-foreground mt-3 mb-1.5">Sites où l'arrêt n'est pas autorisé</p>
          <label v-for="t in typesSites" :key="'i' + t" class="flex items-center gap-2 text-[12px] py-0.5 cursor-pointer">
            <input type="checkbox" class="accent-primary" :checked="p.typesSitesInterdits.includes(t)" @change="basculer(p.typesSitesInterdits, t)" /> {{ t }}
          </label>
        </div>
        <div>
          <p class="text-xs font-semibold text-foreground mb-1.5">Points retirés du score par comportement</p>
          <div class="grid grid-cols-3 gap-2">
            <div :class="F.field"><label :class="F.fieldLabel">Critique</label><input v-model.number="p.penaliteCritique" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Majeur</label><input v-model.number="p.penaliteMajeur" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Mineur</label><input v-model.number="p.penaliteMineur" type="number" min="0" :class="F.fieldInput" /></div>
          </div>
          <p v-if="avertPenalites" class="text-[11px] text-warning mt-1">Une pénalité doit rester entre 0 et 50 points.</p>
        </div>
      </div>
    </div>

    <div :class="L.card">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2"><Radio class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Événements remontés par les équipements</h2></div>
        <button :class="F.btnOutline" class="!text-[12px]" @click="store.reinitialiser()"><Undo2 class="w-3.5 h-3.5" /> Revenir aux réglages proposés</button>
      </div>
      <div v-for="g in parFamille" :key="g.famille" class="mb-4 last:mb-0">
        <p class="text-xs font-semibold text-foreground mb-1">{{ LIB_FAMILLE_EVENEMENT[g.famille] }}</p>
        <div class="overflow-x-auto">
          <table :class="L.table">
            <thead><tr>
              <th :class="L.th">Libellé</th><th :class="L.th">Gravité</th><th :class="L.th">Seuil</th>
              <th :class="L.th">Alerte</th><th :class="L.th">Score</th><th :class="L.th">Infraction proposée</th><th :class="L.th">Actif</th>
            </tr></thead>
            <tbody>
              <tr v-for="t in g.types" :key="t.code">
                <td :class="L.td">
                  <input :value="t.libelle" :class="F.fieldInput" class="!h-[28px] !text-[12px] min-w-[180px]" @change="ev => maj(t, { libelle: (ev.target as HTMLInputElement).value })" />
                  <p v-if="erreurs[t.code]" class="text-[11px] text-danger">{{ erreurs[t.code] }}</p>
                </td>
                <td :class="L.td">
                  <select :value="t.gravite" :class="F.fieldSelect" class="!h-[28px] !text-[11px] !w-[100px]" @change="ev => maj(t, { gravite: (ev.target as HTMLSelectElement).value as GraviteEcart })">
                    <option v-for="(lib, k) in LIB_GRAVITE" :key="k" :value="k">{{ lib.label }}</option>
                  </select>
                </td>
                <td :class="L.td">
                  <div v-if="t.seuil != null && t.code !== 'ARRET'" class="flex items-center gap-1">
                    <input :value="t.seuil" type="number" min="0" step="any" :class="F.fieldInput" class="!h-[28px] !text-[11px] !w-[80px] shrink-0" @change="ev => maj(t, { seuil: Number((ev.target as HTMLInputElement).value) })" />
                    <span class="text-[11px] text-muted-foreground">{{ t.unite }}</span>
                  </div>
                  <span v-else-if="t.seuil != null" class="text-[11px]">{{ t.seuil }} {{ t.unite }}</span>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td :class="L.td"><input type="checkbox" class="accent-primary" :checked="t.alerte" @change="maj(t, { alerte: !t.alerte })" /></td>
                <td :class="L.td"><input type="checkbox" class="accent-primary" :checked="t.score" :disabled="g.famille !== 'comportement' && g.famille !== 'camera'" @change="maj(t, { score: !t.score })" /></td>
                <td :class="L.td">
                  <select v-if="g.famille === 'comportement' || g.famille === 'camera'" :value="t.typeInfraction ?? ''" :class="F.fieldSelect" class="!h-[28px] !text-[11px] !w-[170px]" @change="ev => maj(t, { typeInfraction: (ev.target as HTMLSelectElement).value || undefined })">
                    <option value="">Aucune</option>
                    <option v-for="ti in typesInfraction" :key="ti.code" :value="ti.code">{{ ti.libelle }}</option>
                  </select>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td :class="L.td">
                  <button class="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer" :class="t.actif ? 'bg-success-bg text-success' : 'bg-background text-muted-foreground'" @click="maj(t, { actif: !t.actif })">{{ t.actif ? 'Actif' : 'Inactif' }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-3 items-center">
        <input v-model="nouveau.libelle" :class="F.fieldInput" class="!h-[32px] flex-1 min-w-[200px]" placeholder="Nouveau type d'événement" />
        <select v-model="nouveau.famille" :class="F.fieldSelect" class="!h-[32px] !w-[200px]">
          <option value="comportement">{{ LIB_FAMILLE_EVENEMENT.comportement }}</option>
          <option value="camera">{{ LIB_FAMILLE_EVENEMENT.camera }}</option>
          <option value="defaut">{{ LIB_FAMILLE_EVENEMENT.defaut }}</option>
        </select>
        <select v-model="nouveau.gravite" :class="F.fieldSelect" class="!h-[32px] !w-[120px]">
          <option v-for="(lib, k) in LIB_GRAVITE" :key="k" :value="k">{{ lib.label }}</option>
        </select>
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouter">Ajouter</button>
      </div>
      <p v-if="erreurNouveau" class="text-[12px] text-danger mt-2">{{ erreurNouveau }}</p>
    </div>
  </div>
</template>
