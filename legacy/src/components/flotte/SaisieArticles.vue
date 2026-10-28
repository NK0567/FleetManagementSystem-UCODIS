<template>
  <div class="flex flex-col gap-1.5">
    <div v-for="a in articles" :key="a.id" class="flex flex-col gap-1">
      <label class="flex items-center gap-2 text-[12px] text-foreground cursor-pointer w-fit">
        <input type="checkbox" v-model="livre[a.id]" class="w-4 h-4 accent-primary" />
        <span :class="livre[a.id] ? '' : 'line-through text-muted-foreground'">{{ a.libelle }}</span>
      </label>
      <input v-if="!livre[a.id]" v-model="motifs[a.id]" :class="fieldInput" class="!h-[30px] !text-[12px] ml-6" placeholder="Pourquoi cet article n'est-il pas livré ?…" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Saisie, article par article, de ce qui est effectivement reçu : chaque
 * article d'une ligne a son propre sort, un seul article en anomalie ne
 * bloque pas la livraison des autres. Sert au chauffeur comme au client,
 * qui confirment la réception de la même façon.
 */
import { reactive, watch } from 'vue'
import type { ArticleLigne } from '../../types'
import { fieldInput } from '../../lib/formClasses'

const props = defineProps<{ articles: ArticleLigne[] }>()
const emit = defineEmits<{ (e: 'change', v: { nonLivres: { id: string; motif: string }[]; valide: boolean }): void }>()

const livre = reactive<Record<string, boolean>>({})
const motifs = reactive<Record<string, string>>({})
props.articles.forEach(a => { livre[a.id] = true; motifs[a.id] = '' })

function emettre() {
  const nonLivres = props.articles.filter(a => !livre[a.id]).map(a => ({ id: a.id, motif: motifs[a.id] ?? '' }))
  const auMoinsUnLivre = nonLivres.length < props.articles.length
  emit('change', { nonLivres, valide: auMoinsUnLivre && nonLivres.every(n => n.motif.trim()) })
}
watch([livre, motifs], emettre, { deep: true, immediate: true })
</script>
