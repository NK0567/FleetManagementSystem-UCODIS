<script setup lang="ts">
/**
 * Choix d'un motif : la liste des codes motif paramétrée pour ce type de
 * motif quand elle existe, complétée d'un texte libre ; sinon le texte libre
 * seul. Le motif retenu (libellé du code, puis précision) et le code
 * remontent au parent.
 */
import { ref, computed, watch } from 'vue'
import * as cls from '../../lib/formClasses'
import { useControlesTransportStore } from '../../stores/controlesTransport'

const props = withDefaults(defineProps<{ typeMotif: string; placeholder?: string; /** Motif déjà saisi (modification) : « Libellé : précision » ou texte libre. */ initial?: string }>(), { placeholder: 'Motif (obligatoire)…', initial: '' })
const emit = defineEmits<{ change: [motif: string, code: string | undefined] }>()

const ctrl = useControlesTransportStore()
/** Codes motif proposés, seulement si ce type de motif existe et est actif. */
const codes = computed(() => ctrl.motifs('typesMotif').some(t => t.code === props.typeMotif) ? ctrl.motifs('codesMotif', props.typeMotif) : [])
const code = ref('')
const texte = ref('')
if (props.initial) {
  const c = codes.value.find(x => props.initial === x.libelle || props.initial.startsWith(`${x.libelle} : `))
  code.value = c?.code ?? ''
  texte.value = c ? props.initial.slice(c.libelle.length).replace(/^ : /, '') : props.initial
}
watch([code, texte], () => {
  const libelle = codes.value.find(c => c.code === code.value)?.libelle
  const precision = texte.value.trim()
  emit('change', libelle ? (precision ? `${libelle} : ${precision}` : libelle) : precision, libelle ? code.value : undefined)
})
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap flex-1 min-w-[220px]">
    <select v-if="codes.length" v-model="code" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] !w-auto min-w-[200px]">
      <option value="">Choisir un motif…</option>
      <option v-for="c in codes" :key="c.code" :value="c.code">{{ c.libelle }}</option>
    </select>
    <input v-model="texte" :class="cls.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[180px]" :placeholder="codes.length ? 'Précision (facultative)…' : placeholder" />
  </div>
</template>
