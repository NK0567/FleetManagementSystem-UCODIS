<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Paramètres de l'atelier</div>
        <div :class="L.pageSub">Les trois valeurs qui gouvernent les indicateurs de charge et de coût</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">

      <!-- 1. Capacité de l'atelier -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Building2 class="w-4 h-4 text-primary" /> Capacité de l'atelier</div>
          <BadgeOrigine groupe="capacite" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field"><label :class="F.fieldLabel">Garage</label><input :value="cap.site" type="text" :class="F.fieldInput" @input="saisirTexte('capacite', 'site', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Postes de travail</label><input :value="cap.postes" type="number" min="1" :class="F.fieldInput" placeholder="ex. 3" @input="saisir('capacite', 'postes', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Heures d'ouverture par jour</label><input :value="cap.heuresParJour" type="number" min="1" max="24" :class="F.fieldInput" placeholder="ex. 8" @input="saisir('capacite', 'heuresParJour', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Jours ouvrés par semaine</label><input :value="cap.joursOuvresParSemaine" type="number" min="1" max="7" :class="F.fieldInput" placeholder="ex. 6" @input="saisir('capacite', 'joursOuvresParSemaine', ($event.target as HTMLInputElement).value)" /></div>
        </div>
        <div v-if="store.capaciteRenseignee" class="mt-3 rounded-lg bg-background border border-border px-3.5 py-2.5">
          <div class="grid grid-cols-2 gap-3">
            <div><p class="text-lg font-bold leading-none text-foreground">{{ store.capaciteHeuresParJour }} h</p><p class="text-[11px] text-muted-foreground mt-1">Capacité par jour</p></div>
            <div><p class="text-lg font-bold leading-none text-foreground">{{ store.capaciteHeuresParSemaine }} h</p><p class="text-[11px] text-muted-foreground mt-1">Capacité par semaine</p></div>
          </div>
        </div>
      </div>

      <!-- 2. Tarif horaire de la main-d'œuvre -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Coins class="w-4 h-4 text-primary" /> Tarif horaire de la main-d'œuvre</div>
          <BadgeOrigine groupe="mainOeuvre" />
        </div>
        <div :class="F.field"><label :class="F.fieldLabel">Tarif unique (Ar / heure)</label><input :value="mo.tarifUniqueAr" type="number" min="0" step="1000" :class="F.fieldInput" placeholder="ex. 12 000" @input="saisir('mainOeuvre', 'tarifUniqueAr', ($event.target as HTMLInputElement).value)" /></div>
        <button class="mt-3 text-[11px] font-medium text-primary bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1" @click="detailSpecialite = !detailSpecialite">
          <ChevronRight class="w-3 h-3 transition-transform" :class="detailSpecialite ? 'rotate-90' : ''" /> Le tarif varie selon la spécialité
        </button>
        <div v-if="detailSpecialite" class="grid grid-cols-2 gap-3 mt-2.5">
          <div v-for="c in COMPETENCES" :key="c" :class="F.field">
            <label :class="F.fieldLabel">{{ LIB_COMPETENCE[c] }}</label>
            <input :value="mo.parCompetence[c] ?? null" type="number" min="0" step="1000" :class="F.fieldInput" :placeholder="mo.tarifUniqueAr ? `défaut ${mo.tarifUniqueAr}` : 'Ar / h'" @input="majTarifCompetence(c, ($event.target as HTMLInputElement).value)" />
          </div>
        </div>
      </div>

      <!-- 3. Coût d'immobilisation -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><CalendarOff class="w-4 h-4 text-primary" /> Coût d'immobilisation par jour</div>
          <BadgeOrigine groupe="immobilisation" />
        </div>
        <div :class="F.field"><label :class="F.fieldLabel">Manque à gagner moyen (Ar / jour)</label><input :value="immo.moyenJourAr" type="number" min="0" step="10000" :class="F.fieldInput" placeholder="ex. 450 000" @input="saisir('immobilisation', 'moyenJourAr', ($event.target as HTMLInputElement).value)" /></div>
        <button class="mt-3 text-[11px] font-medium text-primary bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1" @click="detailTypeVehicule = !detailTypeVehicule">
          <ChevronRight class="w-3 h-3 transition-transform" :class="detailTypeVehicule ? 'rotate-90' : ''" /> Le coût diffère selon le type de véhicule
        </button>
        <div v-if="detailTypeVehicule" class="grid grid-cols-2 gap-3 mt-2.5">
          <div :class="F.field"><label :class="F.fieldLabel">Tracteur (Ar / jour)</label><input :value="immo.tracteurJourAr" type="number" min="0" step="10000" :class="F.fieldInput" :placeholder="immo.moyenJourAr ? `défaut ${immo.moyenJourAr}` : 'Ar / j'" @input="saisir('immobilisation', 'tracteurJourAr', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Semi-remorque (Ar / jour)</label><input :value="immo.semiRemorqueJourAr" type="number" min="0" step="10000" :class="F.fieldInput" :placeholder="immo.moyenJourAr ? `défaut ${immo.moyenJourAr}` : 'Ar / j'" @input="saisir('immobilisation', 'semiRemorqueJourAr', ($event.target as HTMLInputElement).value)" /></div>
        </div>
        <div v-if="store.coutTotalImmobilisations != null" class="mt-3 rounded-lg bg-danger-bg px-3.5 py-2.5">
          <p class="text-lg font-bold leading-none text-danger">{{ fmtAr(store.coutTotalImmobilisations) }}</p>
          <p class="text-[11px] text-danger/80 mt-1">Coût des {{ totalJoursPerdus }} jours d'immobilisation enregistrés</p>
        </div>
      </div>

      <!-- Fonctionnalités désactivées, activables ici -->
      <div :class="L.card">
        <div :class="L.cardTitle"><Settings2 class="w-4 h-4 text-primary" /> Écrans du module</div>
        <p class="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          Activables ou désactivables à tout moment ; les données restent conservées
          lorsqu'un écran est désactivé.
        </p>
        <div class="flex flex-col gap-2">
          <div v-for="m in modulesMaintenance" :key="m.cle" class="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span class="text-xs text-foreground">{{ m.libelle }}</span>
            <button class="text-[11px] font-medium px-2.5 py-0.5 rounded-full border-0 cursor-pointer" :class="m.actif ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral'" @click="params.basculer(m.cle)">
              {{ m.actif ? 'Activé' : 'Désactivé' }}
            </button>
          </div>
        </div>
        <p class="text-[11px] text-muted-foreground mt-3">Peut aussi se faire depuis <Settings2 class="w-3 h-3 inline" /> en haut à droite de l'écran.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Paramètres de l'atelier, repris du socle FMS. Trois valeurs
 * manquent au cahier des charges UCODIS et bloquent chacune un
 * indicateur : la capacité de l'atelier, le tarif horaire de la
 * main-d'œuvre interne et le coût d'immobilisation journalier. Rien
 * n'est estimé à la place : un champ vide masque l'indicateur qu'il
 * gouverne, et chaque écran concerné le dit.
 *
 * La compétence « citerne » du socle FMS n'a pas d'équivalent en fret sec et
 * n'est pas reprise dans la liste des spécialités.
 */
import { ref, computed } from 'vue'
import { Building2, Coins, CalendarOff, ChevronRight, Settings2 } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useParametresModulesStore } from '../../stores/parametresModules'
import BadgeOrigine from '../../components/maintenance/BadgeOrigine.vue'
import { LIB_COMPETENCE } from '../../types/maintenance'
import type { CompetenceAtelier } from '../../types/maintenance'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useMaintenanceStore()
const params = useParametresModulesStore()
function fmtAr(n: number) { return n.toLocaleString('fr-FR') + ' Ar' }

const COMPETENCES: CompetenceAtelier[] = ['mecanique', 'electricite', 'pneumatique']
const detailSpecialite = ref(false)
const detailTypeVehicule = ref(false)

const cap = store.parametresAtelier.capacite
const mo = store.parametresAtelier.mainOeuvre
const immo = store.parametresAtelier.immobilisation

type Groupe = 'capacite' | 'mainOeuvre' | 'immobilisation'

/** Le marquage se fait à la saisie, pas à la validation : une valeur
 *  touchée cesse d'être une simulation même si l'exploitant a retapé le
 *  même chiffre. */
function saisir(groupe: Groupe, champ: string, valeur: string) {
  const n = Number(valeur)
  const cible = store.parametresAtelier[groupe] as unknown as Record<string, unknown>
  cible[champ] = !valeur.trim() || Number.isNaN(n) || n <= 0 ? null : n
  store.marquerSaisiParClient(groupe)
}
function saisirTexte(groupe: Groupe, champ: string, valeur: string) {
  const cible = store.parametresAtelier[groupe] as unknown as Record<string, unknown>
  cible[champ] = valeur
  store.marquerSaisiParClient(groupe)
}
function majTarifCompetence(c: CompetenceAtelier, valeur: string) {
  const n = Number(valeur)
  if (!valeur.trim() || Number.isNaN(n) || n <= 0) delete mo.parCompetence[c]
  else mo.parCompetence[c] = n
  store.marquerSaisiParClient('mainOeuvre')
}

const totalJoursPerdus = computed(() => Object.values(store.joursPerdusParFamille).reduce((s, v) => s + v, 0))

const modulesMaintenance = computed(() =>
  params.modules.filter(m => m.cle.startsWith('maintenance_')))
</script>
