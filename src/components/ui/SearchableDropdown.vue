<template>
  <div class="relative" ref="racine">

    <button
      type="button"
      class="flex items-center gap-2 w-full border rounded-md bg-background cursor-pointer transition-colors text-left"
      :class="[
        compact ? 'h-[30px] px-2 text-xs' : 'h-[38px] px-2.5 text-[13px]',
        ouvert || choisi ? 'border-primary bg-card' : 'border-border hover:border-primary',
      ]"
      @click="basculer"
    >
      <template v-if="choisi">
        <span class="flex-1 text-foreground font-medium truncate">{{ choisi.label }}</span>
        <button type="button"
                class="flex items-center justify-center w-5 h-5 border-0 bg-border rounded-full cursor-pointer text-muted-foreground shrink-0 transition-colors hover:bg-danger-bg hover:text-danger"
                @click.stop="effacer">
          <X class="w-3 h-3" />
        </button>
      </template>
      <template v-else>
        <span class="flex-1 text-muted-foreground truncate">{{ placeholder }}</span>
        <ChevronDown class="w-3 h-3 text-muted-foreground transition-transform shrink-0" :class="{ 'rotate-180': ouvert }" />
      </template>
    </button>

    <div
      v-if="ouvert"
      class="absolute left-0 top-[calc(100%+4px)] z-[200] min-w-[240px] w-full bg-popover border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden"
    >
      <div class="relative p-2 pb-1 border-b border-border">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
        <input
          ref="champ" v-model="requete" type="text"
          class="w-full h-8 pl-8 pr-2.5 border border-border rounded-md bg-background text-[13px] text-foreground outline-none focus:border-primary"
          placeholder="Rechercher…" @keydown.escape="fermer"
        />
      </div>
      <div class="max-h-60 overflow-y-auto p-1">
        <button
          v-for="item in filtres" :key="item.id" type="button"
          class="flex items-center gap-2 w-full px-2 py-[7px] border-0 rounded-md bg-transparent text-left cursor-pointer transition-colors hover:bg-primary/10"
          @click="choisir(item)"
        >
          <span class="flex-1 flex flex-col gap-px min-w-0">
            <span class="text-[13px] font-medium text-foreground truncate">{{ item.label }}</span>
            <span v-if="item.sublabel" class="text-[11px] text-muted-foreground truncate">{{ item.sublabel }}</span>
          </span>
          <Check v-if="modelValue === item.id" class="w-3.5 h-3.5 text-primary shrink-0" />
        </button>
        <div v-if="filtres.length === 0" class="p-3.5 text-center text-[13px] text-muted-foreground">
          Aucun résultat{{ requete ? ` pour « ${requete} »` : '' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Check, ChevronDown, Search, X } from '@lucide/vue'

export interface DropdownItem { id: string; label: string; sublabel?: string }

const props = withDefaults(
  defineProps<{
    modelValue: string
    items: DropdownItem[]
    placeholder?: string
    compact?: boolean
  }>(),
  { placeholder: 'Sélectionner…', compact: false },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const racine = ref<HTMLElement | null>(null)
const champ = ref<HTMLInputElement | null>(null)
const ouvert = ref(false)
const requete = ref('')

const choisi = computed(() => props.items.find(i => i.id === props.modelValue) ?? null)

const filtres = computed(() => {
  const q = requete.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i =>
    i.label.toLowerCase().includes(q) || (i.sublabel ?? '').toLowerCase().includes(q),
  )
})

function basculer() {
  ouvert.value = !ouvert.value
  if (ouvert.value) nextTick(() => champ.value?.focus())
}
function fermer() { ouvert.value = false; requete.value = '' }
function choisir(i: DropdownItem) { emit('update:modelValue', i.id); fermer() }
function effacer() { emit('update:modelValue', ''); fermer() }

function surClicExterieur(e: MouseEvent) {
  if (ouvert.value && racine.value && !racine.value.contains(e.target as Node)) fermer()
}
onMounted(() => document.addEventListener('mousedown', surClicExterieur))
onBeforeUnmount(() => document.removeEventListener('mousedown', surClicExterieur))
</script>
