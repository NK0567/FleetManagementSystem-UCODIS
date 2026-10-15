<script setup lang="ts">
/** Grille de l'inspection périodique, paramétrable par l'entreprise. */
import { ref } from 'vue'
import { ShieldCheck } from '@lucide/vue'
import { useInspectionsStore } from '../../stores/inspections'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useInspectionsStore()
const nouveau = ref({ code: '', categorie: '', libelle: '' })
const erreur = ref('')
function ajouter() { const r = store.ajouterPoste(nouveau.value); erreur.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nouveau.value = { code: '', categorie: nouveau.value.categorie, libelle: '' } }
function basculer(code: string) { const r = store.basculerPoste(code); erreur.value = r.ok ? '' : r.motif ?? '' }
function majPoste(code: string, champ: 'categorie' | 'libelle', input: HTMLInputElement) {
  const r = store.majPoste(code, { [champ]: input.value }); erreur.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) input.value = store.grille.find(p => p.code === code)?.[champ] ?? ''
}
function majDelai(input: HTMLInputElement) {
  const r = store.majDelaiContreVisite(Number(input.value)); erreur.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) input.value = String(store.delaiContreVisiteJours)
}
</script>

<template>
  <div :class="L.card">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div :class="L.cardTitle" class="!mb-0"><ShieldCheck class="w-4 h-4 text-primary" /> Grille de l'inspection périodique</div>
      <label class="flex items-center gap-2 text-[12px]">Contre-visite sous
        <input :value="store.delaiContreVisiteJours" type="number" min="1" :class="F.fieldInput" class="!h-[30px] !w-[70px] !text-[12px]" @change="majDelai($event.target as HTMLInputElement)" /> jours</label>
    </div>
    <div class="grid grid-cols-[90px_180px_1fr_80px] gap-2 items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em] pb-1.5 border-b border-border max-sm:hidden">
      <span>Code</span><span>Catégorie</span><span>Poste</span><span>Actif</span>
    </div>
    <div v-for="p in store.grille" :key="p.code" class="grid grid-cols-[90px_180px_1fr_80px] gap-2 items-center py-1.5 border-b border-border/60 max-sm:grid-cols-1">
      <span class="text-xs font-mono">{{ p.code }}</span>
      <input :value="p.categorie" :class="F.fieldInput" class="!h-[30px] !text-[12px]" @change="majPoste(p.code, 'categorie', $event.target as HTMLInputElement)" />
      <input :value="p.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px]" @change="majPoste(p.code, 'libelle', $event.target as HTMLInputElement)" />
      <input type="checkbox" class="accent-primary" :checked="p.actif !== false" @change="basculer(p.code)" />
    </div>
    <div class="grid grid-cols-[90px_180px_1fr_auto] gap-2 items-center mt-3 max-sm:grid-cols-1">
      <input v-model="nouveau.code" :class="F.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Code" />
      <input v-model="nouveau.categorie" :class="F.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Catégorie" />
      <input v-model="nouveau.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Poste contrôlé" />
      <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouter">Ajouter</button>
    </div>
    <p v-if="erreur" class="text-[11px] text-danger mt-1.5">{{ erreur }}</p>
  </div>
</template>
