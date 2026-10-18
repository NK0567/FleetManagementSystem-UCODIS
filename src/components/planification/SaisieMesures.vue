<script setup lang="ts">
/**
 * Saisie des mesures d'un carburant, compartiment par compartiment : volume,
 * température, densité et volume à 15 °C. Le volume à 15 °C du BSL ou du
 * relevé de dépotage, s'il est saisi, fait foi (« saisi ») ; sinon il se
 * calcule avec la méthode réglée dès que le volume et la température sont
 * saisis (« calculé »). À la livraison, un compartiment non dépoté (0 L)
 * demande son motif.
 */
import { ref, watch } from 'vue'
import * as cls from '../../lib/formClasses'
import type { MesureCompartiment } from '../../types'
import { useControlesTransportStore } from '../../stores/controlesTransport'

const props = defineProps<{ compartiments: { numero: number; libelle: string; produit?: string; volume?: number; densite?: number }[]; libelleVolume?: string; livraison?: boolean }>()
const emit = defineEmits<{ change: [mesures: Partial<MesureCompartiment>[]] }>()

interface Ligne { numero: number; volumeL: number | null; temperature: number | null; densite: number | null; volume15: number | null; motif: string }
const lignes = ref<Ligne[]>(props.compartiments.map(c => ({ numero: c.numero, volumeL: c.volume ?? null, temperature: null, densite: c.densite ?? null, volume15: null, motif: '' })))
const num = (x: unknown) => (x === '' || x == null || !Number.isFinite(Number(x)) ? undefined : Number(x))
const nonDepote = (l: Ligne) => !!props.livraison && num(l.volumeL) === 0
watch(lignes, ls => emit('change', ls.map(l => ({ numero: l.numero, volumeL: num(l.volumeL), temperature: num(l.temperature), densite: num(l.densite), volume15: num(l.volume15),
  motifNonDepote: nonDepote(l) ? l.motif : undefined }))), { deep: true, immediate: true })
const lbl = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const controles = useControlesTransportStore()
/** Origine du volume à 15 °C de la ligne : saisi, calculé (avec la valeur), coefficient absent, ou rien. */
function origine(l: Ligne, i: number): { mention: string; valeur?: number } | null {
  if (num(l.volume15) != null) return { mention: 'saisi' }
  const r = controles.apercuVolume15(num(l.volumeL), num(l.temperature), props.compartiments[i]?.produit)
  if (!r) return null
  return 'valeur' in r ? { mention: 'calculé', valeur: r.valeur } : { mention: r.raison }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-for="(l, i) in lignes" :key="l.numero" class="rounded-md border border-border px-3 py-2">
      <p class="text-[12px] font-medium text-foreground mb-1.5">{{ compartiments[i]?.libelle }}</p>
      <div class="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
        <label class="flex flex-col gap-1"><span :class="lbl">{{ libelleVolume ?? 'Volume (L)' }}</span>
          <input v-model.number="l.volumeL" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px]" /></label>
        <template v-if="!nonDepote(l)">
          <label class="flex flex-col gap-1"><span :class="lbl">Température (°C)</span>
            <input v-model.number="l.temperature" type="number" step="0.1" :class="cls.fieldInput" class="!h-[30px] !text-[12px]" /></label>
          <label class="flex flex-col gap-1"><span :class="lbl">Densité (kg/L)</span>
            <input v-model.number="l.densite" type="number" step="0.001" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px]" /></label>
          <label class="flex flex-col gap-1"><span :class="lbl">Volume à 15 °C (L)</span>
            <input v-model.number="l.volume15" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px]" :placeholder="origine(l, i)?.valeur != null ? origine(l, i)!.valeur!.toLocaleString('fr-FR') : ''" />
            <span v-if="origine(l, i)" class="text-[10px] text-muted-foreground" data-origine-15>{{ origine(l, i)!.valeur != null ? `${origine(l, i)!.valeur!.toLocaleString('fr-FR')} L calculé` : origine(l, i)!.mention }}</span></label>
        </template>
        <label v-else class="flex flex-col gap-1 col-span-3 max-sm:col-span-2"><span :class="lbl">Motif du compartiment non dépoté</span>
          <input v-model="l.motif" :class="cls.fieldInput" class="!h-[30px] !text-[12px]" placeholder="Pourquoi ce compartiment n'est pas dépoté…" /></label>
      </div>
    </div>
  </div>
</template>
