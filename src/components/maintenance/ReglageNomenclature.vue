<script setup lang="ts">
/** Nomenclature de diagnostic des pannes, tenue par l'entreprise : systèmes,
 *  sous-systèmes rattachés à un système, modes de défaillance, causes racines. */
import { ref } from 'vue'
import { ListTree, Trash2, Undo2 } from '@lucide/vue'
import { useNomenclatureStore, LIB_LISTE_NOMENCLATURE, type ListeNomenclature } from '../../stores/nomenclature'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useNomenclatureStore()
const liste = ref<ListeNomenclature>('sousSystemes')
const nouveau = ref('')
const nouveauSysteme = ref('')
const erreur = ref('')
const PLACEHOLDER: Record<ListeNomenclature, string> = {
  systemes: 'Nouveau système', sousSystemes: 'Nouveau sous-système', modes: 'Nouveau mode de défaillance', causes: 'Nouvelle cause racine',
}
function resultat(r: { ok: boolean; motif?: string }) { erreur.value = r.ok ? '' : r.motif ?? ''; return r.ok }
function ajouter() { if (resultat(store.ajouter(liste.value, nouveau.value, nouveauSysteme.value || undefined))) nouveau.value = '' }
function supprimer(code: string) { resultat(store.supprimer(liste.value, code)) }
function basculer(code: string) { resultat(store.basculer(liste.value, code)) }
function renommer(code: string, champ: HTMLInputElement) {
  if (!resultat(store.renommer(liste.value, code, champ.value))) champ.value = store.listes[liste.value].find(e => e.code === code)?.libelle ?? ''
}
function rattacher(code: string, champ: HTMLSelectElement) {
  if (!resultat(store.rattacher(code, champ.value))) champ.value = store.listes.sousSystemes.find(e => e.code === code)?.systeme ?? ''
}
function changerListe(l: ListeNomenclature) { liste.value = l; erreur.value = ''; nouveau.value = '' }
</script>

<template>
  <div :class="L.card">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div :class="L.cardTitle" class="!mb-0"><ListTree class="w-4 h-4 text-primary" /> Nomenclature de diagnostic</div>
      <div class="flex gap-1 flex-wrap">
        <button v-for="(lib, l) in LIB_LISTE_NOMENCLATURE" :key="l" type="button" class="px-2.5 py-1 rounded-md text-[12px] border-0 cursor-pointer"
          :class="liste === l ? 'bg-primary text-white' : 'bg-background text-muted-foreground'" @click="changerListe(l)">{{ lib }}</button>
      </div>
    </div>
    <div v-for="e in store.listes[liste]" :key="e.code" class="flex items-center gap-2 py-1.5 border-b border-border/60 flex-wrap">
      <input :value="e.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[160px]" @change="renommer(e.code, $event.target as HTMLInputElement)" />
      <select v-if="liste === 'sousSystemes'" :value="e.systeme" :class="F.fieldSelect" class="!h-[30px] !text-[12px] !w-[200px]" title="Système" @change="rattacher(e.code, $event.target as HTMLSelectElement)">
        <option v-for="sy in store.listes.systemes" :key="sy.code" :value="sy.code" :disabled="!sy.actif">{{ sy.libelle }}</option>
      </select>
      <span class="text-[11px] text-muted-foreground w-[90px] text-right">{{ store.utilisations(liste, e.code) ? `${store.utilisations(liste, e.code)} usage(s)` : 'non utilisé' }}</span>
      <button type="button" class="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer" :class="e.actif ? 'bg-success-bg text-success' : 'bg-background text-muted-foreground'" @click="basculer(e.code)">{{ e.actif ? 'Actif' : 'Inactif' }}</button>
      <button type="button" class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Supprimer" @click="supprimer(e.code)"><Trash2 class="w-3.5 h-3.5" /></button>
    </div>
    <div class="flex gap-2 mt-2 flex-wrap">
      <input v-model="nouveau" :class="F.fieldInput" class="!h-[32px] flex-1 min-w-[160px]" :placeholder="PLACEHOLDER[liste]" @keyup.enter="ajouter" />
      <select v-if="liste === 'sousSystemes'" v-model="nouveauSysteme" :class="F.fieldSelect" class="!h-[32px] !text-[12px] !w-[200px]">
        <option value="" disabled>Système…</option>
        <option v-for="sy in store.optSystemes" :key="sy.id" :value="sy.id">{{ sy.label }}</option>
      </select>
      <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouter">Ajouter</button>
    </div>
    <p v-if="erreur" class="text-[12px] text-danger mt-2">{{ erreur }}</p>
    <div class="flex justify-end mt-3"><button :class="F.btnOutline" class="!text-[12px]" @click="store.reinitialiser(liste); erreur = ''"><Undo2 class="w-3.5 h-3.5" /> Revenir à la nomenclature proposée</button></div>
  </div>
</template>
