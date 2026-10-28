<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[1000] flex items-start justify-center bg-black/40 overflow-y-auto py-8" @click.self="emit('close')">
      <div class="bg-card rounded-xl shadow-xl w-full max-w-[980px] mx-4 flex flex-col">

        <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 class="text-base font-semibold text-foreground">{{ titre }}</h2>
          <button class="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground cursor-pointer hover:bg-background" @click="emit('close')">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          <!-- Étape 1 · le fichier -->
          <div>
            <p class="text-[13px] font-semibold text-foreground mb-2">1. Choisir le fichier</p>
            <label class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-7 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
              <Upload class="w-6 h-6 text-muted-foreground" />
              <span class="text-xs text-muted-foreground">{{ nomFichier || 'Cliquer pour sélectionner un fichier CSV' }}</span>
              <input type="file" accept=".csv,text/csv" class="hidden" @change="chargerFichier" />
            </label>
            <p v-if="erreurFichier" class="flex items-center gap-1.5 text-[12px] text-danger mt-2">
              <CircleAlert class="w-3.5 h-3.5" /> {{ erreurFichier }}
            </p>
            <button class="text-[11px] text-primary cursor-pointer mt-2" @click="telechargerModele">
              Télécharger un modèle de fichier
            </button>
          </div>

          <template v-if="entetes.length">
            <!-- Étape 2 · correspondance des colonnes -->
            <div>
              <p class="text-[13px] font-semibold text-foreground mb-1">2. Faire correspondre les colonnes</p>
              <p v-if="importId" class="text-[11px] text-muted-foreground mb-2">Les colonnes dont l'intitulé est réglé dans Configuration, Imports et indicateurs, sont reconnues d'office.</p>
              <div class="grid grid-cols-3 gap-x-5 gap-y-3 max-sm:grid-cols-1">
                <div v-for="ch in champs" :key="ch.cle" class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-foreground">
                    {{ ch.libelle }}
                    <span v-if="ch.requis" class="text-danger">*</span>
                    <span v-else class="text-muted-foreground font-normal">- facultatif</span>
                  </label>
                  <SearchableDropdown :model-value="mapping[ch.cle] ?? ''" @update:model-value="v => mapping[ch.cle] = v" :items="optEntetes" placeholder="- ignorer -" compact />
                </div>
              </div>
            </div>

            <label v-if="importId" class="flex items-center gap-2 text-[12px] text-foreground cursor-pointer -mt-2">
              <input v-model="memoriser" type="checkbox" class="accent-primary" /> Mémoriser cette correspondance pour les prochains imports
            </label>

            <!-- Étape 3 · contrôles et aperçu -->
            <div>
              <p class="text-[13px] font-semibold text-foreground mb-2">
                3. Vérifier les contrôles
                <span class="font-normal text-muted-foreground">
                  · {{ lignesValides.length }} ligne(s) importable(s), {{ lignesRejetees.length }} rejetée(s)<template v-if="exclues.length">, {{ exclues.length }} exclue(s)</template>
                </span>
              </p>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                <div v-for="c in bilan" :key="c.label" class="bg-background rounded-lg border border-border px-3 py-2.5">
                  <p class="text-lg font-bold leading-none" :class="c.nb ? 'text-danger' : 'text-success'">{{ c.nb }}</p>
                  <p class="text-[11px] text-muted-foreground mt-1">{{ c.label }}</p>
                </div>
              </div>

              <div class="border border-border rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
                <table class="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th v-if="exclusionPossible" class="px-3 py-2 text-left text-xs font-semibold text-foreground bg-background border-b border-border whitespace-nowrap">Importer</th>
                      <th v-for="c in apercuColonnes" :key="c.cle" class="px-3 py-2 text-left text-xs font-semibold text-foreground bg-background border-b border-border whitespace-nowrap">
                        {{ c.libelle }}
                      </th>
                      <th class="px-3 py-2 text-left text-xs font-semibold text-foreground bg-background border-b border-border whitespace-nowrap">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(l, i) in apercu" :key="i" class="hover:bg-background" :class="exclues.includes(i) ? 'opacity-50' : ''">
                      <td v-if="exclusionPossible" class="px-3 py-2 border-b border-border">
                        <input v-if="l.valide" type="checkbox" class="accent-primary" :checked="!exclues.includes(i)" @change="basculerExclusion(i)" />
                      </td>
                      <td v-for="c in apercuColonnes" :key="c.cle" class="px-3 py-2 border-b border-border text-xs">
                        <template v-if="choixDe(c.cle) && l.valide && !exclues.includes(i)">
                          <select :value="valeurLigne(i, l, c.cle)" class="h-[28px] rounded-md border border-border bg-card px-1.5 text-xs text-foreground" @change="choisir(i, c.cle, ($event.target as HTMLSelectElement).value)">
                            <option v-for="o in choixDe(c.cle)!.options" :key="o.valeur" :value="o.valeur">{{ o.libelle }}</option>
                          </select>
                          <span v-if="l.proposes?.includes(c.cle) && choixLigne[i]?.[c.cle] === undefined" class="ml-1 text-[10px] text-muted-foreground">proposé</span>
                        </template>
                        <template v-else>{{ choixDe(c.cle) ? libelleChoix(c.cle, valeurLigne(i, l, c.cle)) : (l.donnees as Record<string, unknown>)?.[c.cle] ?? '-' }}</template>
                      </td>
                      <td class="px-3 py-2 border-b border-border">
                        <span v-if="l.valide && exclues.includes(i)" class="text-[11px] text-muted-foreground">Exclue</span>
                        <span v-else-if="l.valide" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Importable</span>
                        <span v-else class="text-[11px] text-danger">{{ l.motif }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p v-if="descriptionControles" class="text-[11px] text-muted-foreground mt-2 leading-relaxed">{{ descriptionControles }}</p>
            </div>
          </template>

          <!-- Rapport -->
          <div v-if="rapport" class="rounded-lg border border-border overflow-hidden">
            <div class="px-3.5 py-2.5 bg-background border-b border-border">
              <p class="text-xs font-semibold text-foreground">Rapport d'import</p>
            </div>
            <div class="px-3.5 py-3">
              <p class="text-xs text-success flex items-center gap-1.5 mb-2">
                <CircleCheck class="w-3.5 h-3.5" /> {{ rapport.importees }} ligne(s) importée(s).
              </p>
              <template v-if="rapport.rejets.length">
                <p class="text-xs text-danger font-medium mb-1">{{ rapport.rejets.length }} ligne(s) rejetée(s) :</p>
                <div v-for="(r, i) in rapport.rejets" :key="i" class="text-[11px] text-muted-foreground">
                  Ligne {{ r.ligne }} : {{ r.motif }}
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-border">
          <span class="text-[11px] text-muted-foreground">
            {{ entetes.length ? "Aucune ligne n'est importée partiellement." : 'Aucun fichier chargé.' }}
          </span>
          <div class="flex items-center gap-2 shrink-0">
            <button class="px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer bg-card text-foreground border border-border hover:bg-background" @click="emit('close')">
              Fermer
            </button>
            <button
              class="px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!lignesValides.length" @click="importer"
            >
              Importer {{ lignesValides.length || '' }} ligne(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Import CSV générique, repris de ImportParcModal des projets de référence :
 * choix du fichier, correspondance des colonnes, contrôles avec aperçu,
 * puis import effectif. Le détail des contrôles et la transformation des
 * lignes sont fournis par l'écran appelant via la prop `valider`, pour que
 * ce composant reste indépendant du type de donnée importée.
 */
import { ref, reactive, computed } from 'vue'
import Papa from 'papaparse'
import { CircleAlert, CircleCheck, Upload, X } from '@lucide/vue'
import SearchableDropdown from './SearchableDropdown.vue'
import { useImportsStore, type ImportId } from '../../stores/imports'
import type { DropdownItem } from './SearchableDropdown.vue'

/** `autres` : autres intitulés reconnus pour la même colonne. */
export interface ChampImport { cle: string; libelle: string; requis: boolean; autres?: string[] }
/** `proposes` : clés dont la valeur est une proposition du système, à confirmer ou changer dans l'aperçu. */
export interface LigneValidee { valide: boolean; motif?: string; donnees?: Record<string, unknown>; proposes?: string[] }
/** Colonne de l'aperçu modifiable ligne par ligne, par une liste de valeurs. */
export interface ColonneChoix { cle: string; options: { valeur: string; libelle: string }[] }

const props = defineProps<{
  titre: string
  /** Import paramétré (FMS-PA-07) : reconnaissance des colonnes par les intitulés réglés. */
  importId?: ImportId
  champs: ChampImport[]
  apercuColonnes: { cle: string; libelle: string }[]
  descriptionControles?: string
  modele: string[]
  valider: (ligneBrute: Record<string, string>, mapping: Record<string, string>) => LigneValidee
  /** Facultatif : colonnes dont la valeur se change ligne par ligne avant l'import. */
  colonnesChoix?: ColonneChoix[]
  /** Facultatif : chaque ligne importable peut être exclue avant l'import. */
  exclusionPossible?: boolean
}>()

const emit = defineEmits<{ close: []; importer: [lignes: Record<string, unknown>[]] }>()

const nomFichier = ref('')
const erreurFichier = ref('')
const entetes = ref<string[]>([])
const lignesBrutes = ref<Record<string, string>[]>([])
const mapping = reactive<Record<string, string>>({})
const imports = useImportsStore()
const memoriser = ref(false)
const rapport = ref<{ importees: number; rejets: { ligne: number; motif: string }[] } | null>(null)
/** Valeurs changées dans l'aperçu et lignes exclues, par rang de ligne. */
const choixLigne = reactive<Record<number, Record<string, string>>>({})
const exclues = ref<number[]>([])
const choixDe = (cle: string) => props.colonnesChoix?.find(c => c.cle === cle)
const libelleChoix = (cle: string, v: unknown) => v == null || v === '' ? '-' : choixDe(cle)?.options.find(o => o.valeur === v)?.libelle ?? String(v)
const valeurLigne = (i: number, l: LigneValidee, cle: string) => choixLigne[i]?.[cle] ?? (l.donnees?.[cle] as string | undefined) ?? ''
function choisir(i: number, cle: string, v: string) { choixLigne[i] = { ...(choixLigne[i] ?? {}), [cle]: v } }
function basculerExclusion(i: number) {
  exclues.value = exclues.value.includes(i) ? exclues.value.filter(x => x !== i) : [...exclues.value, i]
}
function reinitialiserChoix() { Object.keys(choixLigne).forEach(k => delete choixLigne[Number(k)]); exclues.value = [] }

function chargerFichier(e: Event) {
  const fichier = (e.target as HTMLInputElement).files?.[0]
  if (!fichier) return
  erreurFichier.value = ''
  rapport.value = null
  nomFichier.value = fichier.name

  Papa.parse<Record<string, string>>(fichier, {
    header: true,
    skipEmptyLines: true,
    complete: res => {
      if (!res.data.length || !res.meta.fields?.length) {
        erreurFichier.value = 'Le fichier est vide ou ne contient pas de ligne d\u2019en-tête.'
        entetes.value = []
        return
      }
      entetes.value = res.meta.fields
      lignesBrutes.value = res.data
      reinitialiserChoix()
      Object.keys(mapping).forEach(k => delete mapping[k])
      if (props.importId) { Object.assign(mapping, imports.reconnaitre(props.importId, res.meta.fields)); return }
      // Correspondance automatique quand le nom de colonne correspond au libellé du champ
      props.champs.forEach(ch => {
        const trouve = res.meta.fields!.find(h => h.trim().toLowerCase() === ch.libelle.trim().toLowerCase())
        if (trouve) mapping[ch.cle] = trouve
      })
    },
    error: err => { erreurFichier.value = `Fichier illisible : ${err.message}` },
  })
}

const optEntetes = computed<DropdownItem[]>(() => entetes.value.map(h => ({ id: h, label: h })))

const lignesEvaluees = computed<LigneValidee[]>(() =>
  lignesBrutes.value.map(l => props.valider(l, mapping)),
)
/** Lignes importables : valides, non exclues, avec les valeurs changées dans l'aperçu. */
const lignesValides = computed(() => lignesEvaluees.value
  .map((l, i) => ({ l, i }))
  .filter(({ l, i }) => l.valide && !exclues.value.includes(i))
  .map(({ l, i }) => ({ ...l, donnees: l.donnees ? { ...l.donnees, ...(choixLigne[i] ?? {}) } : l.donnees })))
const lignesRejetees = computed(() =>
  lignesEvaluees.value
    .map((l, index) => ({ ...l, numeroLigne: index + 2 })) // +2 : ligne 1 = en-tête
    .filter(l => !l.valide),
)
/* Quand les lignes se corrigent une à une, toutes s'affichent. */
const apercu = computed(() => props.colonnesChoix?.length || props.exclusionPossible ? lignesEvaluees.value : lignesEvaluees.value.slice(0, 50))

const bilan = computed(() => [
  { label: 'Lignes lues', nb: lignesBrutes.value.length },
  { label: 'Importables', nb: lignesValides.value.length },
  { label: 'Rejetées', nb: lignesRejetees.value.length },
  { label: 'Colonnes reconnues', nb: Object.values(mapping).filter(Boolean).length },
])

function importer() {
  // Le rapport doit figer l'état AVANT l'import : sinon, une ligne tout
  // juste importée se retrouve réévaluée après coup et signalée à tort
  // comme rejetée pour doublon (son propre CIN existe désormais).
  const valides = lignesValides.value.map(l => l.donnees!).filter(Boolean)
  const rejetsSnapshot = lignesRejetees.value.map(l => ({ ligne: l.numeroLigne, motif: l.motif ?? 'Ligne invalide' }))

  emit('importer', valides)
  if (props.importId && memoriser.value) imports.memoriser(props.importId, { ...mapping })

  rapport.value = { importees: valides.length, rejets: rejetsSnapshot }
  entetes.value = []
  lignesBrutes.value = []
  reinitialiserChoix()
}

function telechargerModele() {
  const csv = (props.importId ? imports.modele(props.importId) : props.modele).join(';') + '\n'
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modele_import.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
