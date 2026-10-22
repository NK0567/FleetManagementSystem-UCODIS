<script setup lang="ts">
/** Onglet Imports et indicateurs de la configuration (FMS-PA-07) : correspondance
 *  des colonnes de chaque import, puis codes, libellés et cibles des indicateurs. */
import { ref } from 'vue'
import { FileUp, Target, Undo2 } from '@lucide/vue'
import { useImportsStore, IMPORTS, type ImportId } from '../../stores/imports'
import { useIndicateursStore, type CleIndicateur } from '../../stores/indicateurs'
import { useConfigurationStore } from '../../stores/configuration'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const imports = useImportsStore()
const indicateurs = useIndicateursStore()
const config = useConfigurationStore()

const importSel = ref<ImportId>('vehicules')
const erreurImport = ref('')
function definir(cle: string, ev: Event) {
  const champ = ev.target as HTMLInputElement
  const r = imports.definir(importSel.value, cle, champ.value)
  erreurImport.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) champ.value = imports.correspondances[importSel.value][cle] ?? ''
}

const erreurInd = ref('')
function majInd(cle: CleIndicateur, champ: 'code' | 'libelle' | 'cible', ev: Event) {
  const el = ev.target as HTMLInputElement
  const valeur = champ === 'cible' ? (el.value.trim() === '' ? null : Number(el.value)) : el.value
  const r = indicateurs.modifier(cle, { [champ]: valeur })
  erreurInd.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) { const i = indicateurs.get(cle); el.value = String(champ === 'cible' ? (i.cible ?? '') : i[champ]) }
}
const unite = (u: string) => u === 'par km' || u === 'par ordre' ? `${config.devise()} ${u}` : u
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div :class="L.card">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2"><FileUp class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Correspondance des colonnes à l'import</h2></div>
        <div class="flex gap-1 flex-wrap">
          <button v-for="(d, id) in IMPORTS" :key="id" type="button" class="px-2.5 py-1 rounded-md text-[12px] border-0 cursor-pointer"
            :class="importSel === id ? 'bg-primary text-white' : 'bg-background text-muted-foreground'" @click="importSel = id; erreurImport = ''">{{ d.libelle }}</button>
        </div>
      </div>
      <div class="grid grid-cols-[1fr_1.4fr] gap-x-4 text-[11px] font-semibold text-muted-foreground uppercase pb-1.5 border-b border-border max-sm:hidden">
        <span>Champ</span><span>Intitulé dans le fichier source</span>
      </div>
      <div v-for="c in IMPORTS[importSel].champs" :key="importSel + c.cle" class="grid grid-cols-[1fr_1.4fr] gap-x-4 items-center py-1.5 border-b border-border/60 max-sm:grid-cols-1">
        <span class="text-[13px]">{{ c.libelle }}<span v-if="c.requis" class="text-danger"> *</span></span>
        <input :value="imports.correspondances[importSel][c.cle] ?? ''" :class="F.fieldInput" class="!h-[32px] !text-[12px]" :placeholder="c.libelle" @change="definir(c.cle, $event)" />
      </div>
      <p v-if="erreurImport" class="text-[12px] text-danger mt-2">{{ erreurImport }}</p>
      <div class="flex justify-end mt-3"><button :class="F.btnOutline" class="!text-[12px]" @click="imports.reinitialiser(importSel)"><Undo2 class="w-3.5 h-3.5" /> Revenir aux libellés des champs</button></div>
    </div>

    <div :class="L.card">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2"><Target class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Indicateurs et cibles</h2></div>
        <button :class="F.btnOutline" class="!text-[12px]" @click="indicateurs.reinitialiser()"><Undo2 class="w-3.5 h-3.5" /> Valeurs de départ</button>
      </div>
      <p v-if="erreurInd" class="text-[12px] text-danger mb-2">{{ erreurInd }}</p>
      <div class="overflow-x-auto">
        <table :class="L.table" class="min-w-[900px]">
          <thead><tr><th :class="L.th">Code</th><th :class="L.th">Libellé</th><th :class="L.th">Cible</th><th :class="L.th">Définition</th></tr></thead>
          <tbody>
            <tr v-for="i in indicateurs.liste" :key="i.cle">
              <td :class="L.td"><input :value="i.code" :class="F.fieldInput" class="!h-[30px] !text-[12px] !w-[90px] font-mono uppercase" @change="majInd(i.cle, 'code', $event)" /></td>
              <td :class="L.td"><input :value="i.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px] min-w-[220px]" @change="majInd(i.cle, 'libelle', $event)" /></td>
              <td :class="L.td">
                <div class="flex items-center gap-1.5 whitespace-nowrap">
                  <span class="text-[12px] text-muted-foreground">{{ i.sens === 'haut' ? '≥' : '≤' }}</span>
                  <input :value="i.cible ?? ''" type="number" min="0" :class="F.fieldInput" class="!h-[30px] !text-[12px] !w-[90px]" placeholder="aucune" @change="majInd(i.cle, 'cible', $event)" />
                  <span class="text-[11px] text-muted-foreground">{{ unite(i.unite) }}</span>
                </div>
              </td>
              <td :class="L.td" class="text-[11px] text-muted-foreground max-w-[380px]">{{ i.definition }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
