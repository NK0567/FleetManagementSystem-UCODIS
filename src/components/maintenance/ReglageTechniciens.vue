<script setup lang="ts">
/** Compétences de l'atelier, compétence requise par sous-système et techniciens. */
import { ref } from 'vue'
import { Trash2, Users } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useNomenclatureStore } from '../../stores/nomenclature'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useMaintenanceStore()
const nomenclature = useNomenclatureStore()
const nvComp = ref(''); const erreurComp = ref('')
function ajouterComp() { const r = store.ajouterCompetence(nvComp.value); erreurComp.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nvComp.value = '' }
function renommerComp(code: string, champ: HTMLInputElement) {
  const r = store.renommerCompetence(code, champ.value); erreurComp.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) champ.value = store.libelleCompetence(code)
}
function supprimerComp(code: string) { const r = store.supprimerCompetence(code); erreurComp.value = r.ok ? '' : r.motif ?? '' }
const nvTech = ref({ nom: '', competences: [] as string[] }); const erreurTech = ref('')
function ajouterTech() { const r = store.ajouterTechnicien(nvTech.value.nom, nvTech.value.competences); erreurTech.value = r.ok ? '' : r.motif ?? ''; if (r.ok) nvTech.value = { nom: '', competences: [] } }
function basculer(nom: string, code: string) { const r = store.basculerCompetenceTechnicien(nom, code); erreurTech.value = r.ok ? '' : r.motif ?? '' }
</script>

<template>
  <div :class="L.card">
    <div :class="L.cardTitle"><Users class="w-4 h-4 text-primary" /> Compétences et techniciens</div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div>
        <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Compétences</p>
        <div v-for="c in store.competences" :key="c.code" class="flex items-center gap-1 py-1 border-b border-border/60">
          <input :value="c.libelle" :class="F.fieldInput" class="!h-[30px] !text-[12px] flex-1" @change="renommerComp(c.code, $event.target as HTMLInputElement)" />
          <button type="button" class="w-7 h-7 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Supprimer" @click="supprimerComp(c.code)"><Trash2 class="w-3.5 h-3.5" /></button>
        </div>
        <div class="flex gap-2 mt-2"><input v-model="nvComp" :class="F.fieldInput" class="!h-[30px] !text-[12px] flex-1" placeholder="Nouvelle compétence" /><button :class="F.btnPrimary" class="!py-1 !text-[12px]" @click="ajouterComp">Ajouter</button></div>
        <p v-if="erreurComp" class="text-[11px] text-danger mt-1">{{ erreurComp }}</p>
      </div>
      <div>
        <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Compétence requise par sous-système</p>
        <div v-for="ss in nomenclature.listes.sousSystemes.filter(x => x.actif)" :key="ss.code" class="flex items-center gap-2 py-1 border-b border-border/60">
          <span class="text-[12px] flex-1">{{ ss.libelle }}</span>
          <select v-model="store.competenceParSousSysteme[ss.code]" :class="F.fieldSelect" class="!h-[30px] !text-[12px] !w-[140px]">
            <option v-for="c in store.competences" :key="c.code" :value="c.code">{{ c.libelle }}</option>
          </select>
        </div>
      </div>
      <div>
        <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Techniciens de l'atelier interne</p>
        <div v-for="t in store.techniciens" :key="t.nom" class="py-1.5 border-b border-border/60">
          <div class="flex items-center gap-2"><span class="text-[12px] font-medium flex-1">{{ t.nom }}</span>
            <label class="flex items-center gap-1 text-[11px]"><input v-model="t.actif" type="checkbox" class="accent-primary" /> Actif</label></div>
          <div class="flex flex-wrap gap-1 mt-1">
            <button v-for="c in store.competences" :key="c.code" type="button" class="px-2 py-0.5 rounded-full text-[10px] border-0 cursor-pointer"
              :class="t.competences.includes(c.code) ? 'bg-primary/10 text-primary font-medium' : 'bg-background text-muted-foreground'" @click="basculer(t.nom, c.code)">{{ c.libelle }}</button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5 mt-2">
          <input v-model="nvTech.nom" :class="F.fieldInput" class="!h-[30px] !text-[12px]" placeholder="Nom du technicien" />
          <div class="flex flex-wrap gap-1">
            <label v-for="c in store.competences" :key="c.code" class="flex items-center gap-1 text-[11px]"><input v-model="nvTech.competences" type="checkbox" :value="c.code" class="accent-primary" /> {{ c.libelle }}</label>
          </div>
          <button :class="F.btnPrimary" class="!py-1 !text-[12px] self-start" @click="ajouterTech">Ajouter le technicien</button>
        </div>
        <p v-if="erreurTech" class="text-[11px] text-danger mt-1">{{ erreurTech }}</p>
      </div>
    </div>
  </div>
</template>
