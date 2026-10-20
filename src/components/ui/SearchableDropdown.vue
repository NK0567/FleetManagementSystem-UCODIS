<template>
  <div class="relative" ref="racine">
    <button
      ref="declencheur" type="button"
      role="combobox" :aria-expanded="ouvert" aria-haspopup="listbox"
      :disabled="disabled"
      class="flex items-center gap-2 w-full border rounded-md text-left outline-none transition-colors font-[inherit]"
      :class="[
        compact ? 'h-[30px] px-2 text-xs' : 'h-[38px] px-2.5 text-[13px]',
        disabled ? 'bg-background/60 border-border cursor-not-allowed opacity-70'
          : ouvert ? 'border-primary bg-card ring-2 ring-primary/15 cursor-pointer'
          : choisi ? 'border-primary/60 bg-card cursor-pointer hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/15'
          : 'border-border bg-background cursor-pointer hover:border-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15',
      ]"
      :title="choisi ? choisi.label + (choisi.sublabel ? ` · ${choisi.sublabel}` : '') : undefined"
      @click="basculer"
      @keydown="clavierDeclencheur"
    >
      <span v-if="choisi" class="flex-1 text-foreground font-medium truncate">{{ choisi.label }}</span>
      <span v-else class="flex-1 text-muted-foreground truncate">{{ placeholder }}</span>
      <span
        v-if="choisi && clearable && !disabled" role="button" tabindex="-1" title="Effacer le choix"
        class="flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground shrink-0 transition-colors hover:bg-danger-bg hover:text-danger"
        @click.stop="effacer" @mousedown.prevent
      ><X class="w-3 h-3" /></span>
      <ChevronDown class="w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0" :class="{ 'rotate-180': ouvert }" />
    </button>

    <!-- La liste s'ouvre au-dessus de tout (fenêtres, cartes, tableaux) :
         elle n'est jamais coupée par un conteneur et s'ouvre vers le haut
         quand la place manque en dessous. -->
    <Teleport to="body">
      <div
        v-if="ouvert" ref="panneau"
        class="fixed z-[3000] bg-popover border border-border rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.16)] overflow-hidden flex flex-col"
        :style="position"
        @mousedown.stop
      >
        <div v-if="avecRecherche" class="relative p-2 pb-1.5 border-b border-border shrink-0">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
          <input
            ref="champ" v-model="requete" type="text"
            class="w-full h-8 pl-8 pr-2.5 border border-border rounded-md bg-background text-[13px] text-foreground outline-none focus:border-primary"
            placeholder="Rechercher…" @keydown="clavierListe"
          />
        </div>
        <div ref="liste" role="listbox" class="max-h-60 overflow-y-auto p-1 min-h-0" :style="{ maxHeight: hauteurListe + 'px' }">
          <button
            v-for="(item, i) in filtres" :key="item.id" type="button" role="option"
            :aria-selected="modelValue === item.id" :data-index="i"
            class="flex items-center gap-2 w-full px-2 py-[7px] border-0 rounded-md text-left cursor-pointer transition-colors"
            :class="i === actif ? 'bg-primary/10' : modelValue === item.id ? 'bg-primary/5' : 'bg-transparent hover:bg-primary/10'"
            @mouseenter="actif = i" @click="choisir(item)"
          >
            <span class="flex-1 flex flex-col gap-px min-w-0">
              <span class="text-[13px] text-foreground truncate" :class="modelValue === item.id ? 'font-semibold' : 'font-medium'">{{ item.label }}</span>
              <span v-if="item.sublabel" class="text-[11px] text-muted-foreground truncate">{{ item.sublabel }}</span>
            </span>
            <Check v-if="modelValue === item.id" class="w-3.5 h-3.5 text-primary shrink-0" />
          </button>
          <div v-if="filtres.length === 0" class="p-3.5 text-center text-[13px] text-muted-foreground">
            <template v-if="!items.length">{{ vide || 'Aucun élément à proposer.' }}</template>
            <template v-else>Aucun résultat{{ requete ? ` pour « ${requete} »` : '' }}</template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { Check, ChevronDown, Search, X } from '@lucide/vue'

export interface DropdownItem { id: string; label: string; sublabel?: string }

const props = withDefaults(
  defineProps<{
    modelValue: string
    items: DropdownItem[]
    placeholder?: string
    compact?: boolean
    /** Message affiché quand la liste est vide (rien à proposer). */
    vide?: string
    disabled?: boolean
    /** Petite croix pour effacer le choix. */
    clearable?: boolean
  }>(),
  { placeholder: 'Sélectionner…', compact: false, disabled: false, clearable: true },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const racine = ref<HTMLElement | null>(null)
const declencheur = ref<HTMLElement | null>(null)
const panneau = ref<HTMLElement | null>(null)
const liste = ref<HTMLElement | null>(null)
const champ = ref<HTMLInputElement | null>(null)
const ouvert = ref(false)
const requete = ref('')
const actif = ref(-1)
const position = ref<Record<string, string>>({})
const hauteurListe = ref(240)

const choisi = computed(() => props.items.find(i => i.id === props.modelValue) ?? null)
/** La recherche n'apparaît que lorsqu'elle sert : au-delà de 7 choix. */
const avecRecherche = computed(() => props.items.length > 7)

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtres = computed(() => {
  const q = sansAccents(requete.value.trim())
  if (!q) return props.items
  return props.items.filter(i => sansAccents(i.label).includes(q) || sansAccents(i.sublabel ?? '').includes(q))
})
watch(filtres, () => { actif.value = filtres.value.length ? 0 : -1 })

/** Place la liste sous le champ, ou au-dessus quand la place manque. */
function placer() {
  const el = declencheur.value; if (!el) return
  const r = el.getBoundingClientRect()
  const largeur = Math.max(r.width, 240)
  const gauche = Math.min(Math.max(8, r.left), window.innerWidth - largeur - 8)
  const enDessous = window.innerHeight - r.bottom - 12
  const auDessus = r.top - 12
  const entete = avecRecherche.value ? 46 : 0
  const versLeHaut = enDessous < 200 && auDessus > enDessous
  const dispo = (versLeHaut ? auDessus : enDessous) - entete - 4
  hauteurListe.value = Math.max(120, Math.min(240, dispo))
  position.value = versLeHaut
    ? { left: `${gauche}px`, width: `${largeur}px`, bottom: `${window.innerHeight - r.top + 4}px` }
    : { left: `${gauche}px`, width: `${largeur}px`, top: `${r.bottom + 4}px` }
}

function ouvrir() {
  if (props.disabled || ouvert.value) return
  ouvert.value = true
  const i = filtres.value.findIndex(x => x.id === props.modelValue)
  actif.value = i >= 0 ? i : filtres.value.length ? 0 : -1
  placer()
  nextTick(() => { (avecRecherche.value ? champ.value : declencheur.value)?.focus(); defiler() })
}
function fermer(rendreFocus = false) {
  ouvert.value = false; requete.value = ''
  if (rendreFocus) declencheur.value?.focus()
}
function basculer() { ouvert.value ? fermer() : ouvrir() }
function choisir(i: DropdownItem) { emit('update:modelValue', i.id); fermer(true) }
function effacer() { emit('update:modelValue', ''); fermer() }

function defiler() {
  nextTick(() => liste.value?.querySelector<HTMLElement>(`[data-index="${actif.value}"]`)?.scrollIntoView({ block: 'nearest' }))
}
/** Flèches, Entrée, Échap et Tab, depuis le champ de recherche ou le champ fermé. */
function clavierListe(e: KeyboardEvent) {
  const n = filtres.value.length
  if (e.key === 'ArrowDown') { e.preventDefault(); if (n) { actif.value = (actif.value + 1) % n; defiler() } }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) { actif.value = (actif.value - 1 + n) % n; defiler() } }
  else if (e.key === 'Home') { e.preventDefault(); if (n) { actif.value = 0; defiler() } }
  else if (e.key === 'End') { e.preventDefault(); if (n) { actif.value = n - 1; defiler() } }
  else if (e.key === 'Enter') { e.preventDefault(); const it = filtres.value[actif.value]; if (it) choisir(it) }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(true) }
  else if (e.key === 'Tab') fermer()
}
function clavierDeclencheur(e: KeyboardEvent) {
  if (props.disabled) return
  if (!ouvert.value) {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); ouvrir() }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && choisi.value && props.clearable) { e.preventDefault(); effacer() }
    return
  }
  clavierListe(e)
}

function surClicExterieur(e: MouseEvent) {
  if (!ouvert.value) return
  const t = e.target as Node
  if (racine.value?.contains(t) || panneau.value?.contains(t)) return
  fermer()
}
/* La liste suit le champ quand la page ou une fenêtre défile, et se ferme
 * si le champ sort de l'écran. */
function suivre() {
  if (!ouvert.value || !declencheur.value) return
  const r = declencheur.value.getBoundingClientRect()
  if (r.bottom < 0 || r.top > window.innerHeight) fermer()
  else placer()
}
onMounted(() => {
  document.addEventListener('mousedown', surClicExterieur)
  window.addEventListener('scroll', suivre, true)
  window.addEventListener('resize', suivre)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', surClicExterieur)
  window.removeEventListener('scroll', suivre, true)
  window.removeEventListener('resize', suivre)
})
watch(() => props.disabled, d => { if (d) fermer() })
</script>
