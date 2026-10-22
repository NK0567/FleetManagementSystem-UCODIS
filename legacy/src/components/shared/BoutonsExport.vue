<script setup lang="ts">
/** Export d'un rapport en PDF ou en Excel ; le rapport est construit au clic. */
import { ref } from 'vue'
import { FileSpreadsheet, FileText } from '@lucide/vue'
import { exporterExcel, exporterPdf, type Rapport } from '../../lib/rapports'
import * as L from '../../lib/listClasses'

const props = defineProps<{ rapport: () => Rapport }>()
const enCours = ref<'' | 'pdf' | 'xlsx'>('')
const erreur = ref('')
async function exporter(format: 'pdf' | 'xlsx') {
  if (enCours.value) return
  enCours.value = format; erreur.value = ''
  try {
    const r = props.rapport()
    if (!r.sections.length) { erreur.value = 'Rien à exporter.'; return }
    await (format === 'pdf' ? exporterPdf(r) : exporterExcel(r))
  } catch (e) {
    erreur.value = `Export impossible : ${e instanceof Error ? e.message : String(e)}`
  } finally { enCours.value = '' }
}
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <button type="button" :class="L.btnOutline" :disabled="!!enCours" @click="exporter('pdf')"><FileText class="w-4 h-4" /> {{ enCours === 'pdf' ? 'Export…' : 'PDF' }}</button>
    <button type="button" :class="L.btnOutline" :disabled="!!enCours" @click="exporter('xlsx')"><FileSpreadsheet class="w-4 h-4" /> {{ enCours === 'xlsx' ? 'Export…' : 'Excel' }}</button>
    <span v-if="erreur" class="text-[12px] text-danger">{{ erreur }}</span>
  </div>
</template>
