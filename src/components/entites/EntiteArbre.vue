<script setup lang="ts">
/**
 * Nœud d'arbre des entités · reprise fidèle du composant OrgNode des
 * autres projets bâtis sur le socle FMS : carte avec bordure d'accent selon le type,
 * badge de code, icône, effectif, et connecteurs de hiérarchie en CSS
 * (les traits ne s'expriment pas avec des classes utilitaires).
 *
 * Le déplié/replié est partagé entre tous les nœuds via provide/inject,
 * comme dans la référence, pour permettre « Tout déplier / Tout replier »
 * depuis l'écran parent.
 */
import { computed, inject, type Ref } from 'vue'
import { Building2, ChevronDown, ChevronRight, LayoutGrid, User, Users, Wrench } from '@lucide/vue'
import { useEntiteStore } from '../../stores/entites'
import { usePersonnelStore } from '../../stores/personnel'
import type { Entite } from '../../types'

defineOptions({ name: 'EntiteArbre' })

const props = defineProps<{ entite: Entite }>()
const emit = defineEmits<{ ouvrir: [id: string] }>()

const entites = useEntiteStore()
const personnel = usePersonnelStore()

const collapsedIds = inject<Ref<string[]>>('entite-collapsed')!
const toggleCollapse = inject<(id: string) => void>('entite-toggle')!

const enfants = computed(() => entites.enfants(props.entite.id))
const hasChildren = computed(() => enfants.value.length > 0)
const isCollapsed = computed(() => collapsedIds.value.includes(props.entite.id))
function toggle() { toggleCollapse(props.entite.id) }

const effectif = computed(() => personnel.parEntite(props.entite.id).length)

const actBtn =
  'px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer border-0 whitespace-nowrap inline-flex items-center bg-background text-muted-foreground transition-colors hover:bg-neutral-bg hover:text-foreground'

const typeIcon = computed(() => {
  const map: Record<string, typeof Building2> = { direction: Building2, service: LayoutGrid, equipe: Wrench }
  return map[props.entite.type] ?? Building2
})

const cardBorder = computed(() => {
  const map: Record<string, string> = {
    direction: '4px solid var(--color-primary)',
    service: '3px solid #1D4ED8',
    equipe: '2px solid #6B7280',
  }
  return { borderLeft: map[props.entite.type] ?? '2px solid var(--color-border)' }
})

const typeColor = computed(() => {
  const map: Record<string, { background: string; color: string }> = {
    direction: { background: 'rgba(232,69,60,0.10)', color: 'var(--color-primary)' },
    service: { background: '#DBEAFE', color: '#1D4ED8' },
    equipe: { background: '#F3F4F6', color: '#6B7280' },
  }
  return map[props.entite.type] ?? { background: '#F3F4F6', color: '#6B7280' }
})
</script>

<template>
  <div class="flex flex-col min-w-max">

    <!-- ── Carte du nœud ── -->
    <div
      class="border border-border rounded-lg bg-card overflow-hidden transition-shadow min-w-[380px] max-w-[560px] hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
      :style="cardBorder"
    >
      <div class="flex items-center gap-2 px-3 py-2.5">

        <!-- Toggle collapse -->
        <button
          v-if="hasChildren"
          class="w-[22px] h-[22px] border-0 bg-transparent cursor-pointer text-muted-foreground rounded flex items-center justify-center shrink-0 transition-colors hover:bg-background hover:text-foreground"
          :title="isCollapsed ? 'Déplier' : 'Replier'"
          @click.stop="toggle"
        >
          <ChevronRight v-if="isCollapsed" class="w-3.5 h-3.5" />
          <ChevronDown v-else class="w-3.5 h-3.5" />
        </button>
        <div v-else class="w-[22px] shrink-0"></div>

        <!-- Icône type -->
        <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0" :style="typeColor">
          <component :is="typeIcon" class="w-3.5 h-3.5" />
        </div>

        <!-- Code badge -->
        <span
          class="text-[10px] font-bold px-[7px] py-0.5 rounded whitespace-nowrap shrink-0 tracking-[0.04em]"
          :style="typeColor"
        >{{ entite.code }}</span>

        <!-- Nom + responsable -->
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{{ entite.nom }}</div>
          <div v-if="entite.responsableNom" class="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <User class="w-[11px] h-[11px]" /> {{ entite.responsableNom }}
          </div>
        </div>

        <!-- Méta droite -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-[11px] text-muted-foreground flex items-center gap-[3px]">
            <Users class="w-[11px] h-[11px]" /> {{ effectif }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex gap-1 shrink-0">
          <button :class="actBtn" @click.stop="emit('ouvrir', entite.id)">Voir →</button>
        </div>
      </div>
    </div>

    <!-- ── Enfants (récursif) ── -->
    <div v-if="hasChildren && !isCollapsed" class="org-children">
      <div v-for="child in enfants" :key="child.id" class="org-child">
        <EntiteArbre :entite="child" @ouvrir="emit('ouvrir', $event)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Connecteurs d'arbre · pseudo-éléments non exprimables en utilitaires Tailwind */
.org-children {
  margin-left: 32px;
  padding-left: 22px;
  border-left: 2px solid rgba(232, 69, 60, 0.18);
  margin-top: 6px;
  padding-bottom: 2px;
}
.org-child {
  position: relative;
  margin-top: 8px;
}
.org-child::before {
  content: '';
  position: absolute;
  left: -22px;
  top: 22px;
  width: 22px;
  height: 2px;
  background: rgba(232, 69, 60, 0.18);
}
.org-child:last-child::after {
  content: '';
  position: absolute;
  left: -24px;
  top: 23px;
  bottom: -10px;
  width: 4px;
  background: var(--color-card);
}
</style>
