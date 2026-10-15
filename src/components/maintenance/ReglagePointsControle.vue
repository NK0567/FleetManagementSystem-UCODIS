<script setup lang="ts">
/** Liste des points de contrôle par moment, réglable par l'entreprise. */
import { ref } from 'vue'
import { ClipboardCheck, Trash2 } from '@lucide/vue'
import { useControlesVehiculeStore, LIB_MOMENT_CONTROLE, type MomentControle } from '../../stores/controlesVehicule'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const controles = useControlesVehiculeStore()
const momentPoints = ref<MomentControle>('retour_voyage')
const nouveauPoint = ref({ code: '', libelle: '', bloquant: false })
const erreurPoint = ref('')
function ajouterPoint() {
  const r = controles.ajouterPoint(momentPoints.value, nouveauPoint.value)
  erreurPoint.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouveauPoint.value = { code: '', libelle: '', bloquant: false }
}
function majLibellePoint(code: string, champ: HTMLInputElement) {
  const r = controles.modifierPoint(momentPoints.value, code, { libelle: champ.value })
  erreurPoint.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) champ.value = controles.points[momentPoints.value].find(x => x.code === code)?.libelle ?? ''
}
function retirerPoint(code: string) {
  const r = controles.supprimerPoint(momentPoints.value, code)
  erreurPoint.value = r.ok ? '' : r.motif ?? ''
}
</script>

<template>
  <div :class="L.card">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div :class="L.cardTitle" class="!mb-0"><ClipboardCheck class="w-4 h-4 text-primary" /> Points de contrôle du véhicule</div>
      <div class="flex gap-1.5">
        <button v-for="(lib, m) in LIB_MOMENT_CONTROLE" :key="m" class="px-2.5 py-1 rounded-md text-[12px] border-0 cursor-pointer"
          :class="momentPoints === m ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-background'" @click="momentPoints = m">{{ lib }}</button>
      </div>
    </div>
    <div class="grid grid-cols-[90px_1fr_110px_32px] gap-2 items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em] pb-1.5 border-b border-border max-sm:hidden">
      <span>Code</span><span>Libellé</span><span>Bloquant</span><span></span>
    </div>
    <div v-for="pt in controles.points[momentPoints]" :key="pt.code" class="grid grid-cols-[90px_1fr_110px_32px] gap-2 items-center py-1.5 border-b border-border/60 max-sm:grid-cols-1">
      <span class="text-xs font-mono">{{ pt.code }}</span>
      <input :value="pt.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px]" @change="majLibellePoint(pt.code, ($event.target as HTMLInputElement))" />
      <label class="flex items-center gap-1.5 text-[12px] text-foreground cursor-pointer"><input type="checkbox" class="accent-primary" :checked="pt.bloquant" @change="controles.modifierPoint(momentPoints, pt.code, { bloquant: ($event.target as HTMLInputElement).checked })" /> Bloquant</label>
      <button class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Retirer ce point" @click="retirerPoint(pt.code)"><Trash2 class="w-3.5 h-3.5" /></button>
    </div>
    <div class="grid grid-cols-[90px_1fr_110px_auto] gap-2 items-center mt-3 max-sm:grid-cols-1">
      <input v-model="nouveauPoint.code" :class="F.fieldInput" class="!h-[32px] !text-[12px] uppercase" placeholder="Code" maxlength="5" />
      <input v-model="nouveauPoint.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Libellé du point" />
      <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="nouveauPoint.bloquant" type="checkbox" class="accent-primary" /> Bloquant</label>
      <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterPoint">Ajouter</button>
    </div>
    <p v-if="erreurPoint" class="text-[11px] text-danger mt-1.5">{{ erreurPoint }}</p>
  </div>
</template>
