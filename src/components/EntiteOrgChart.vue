<template>
  <div class="orgchart-wrap">
    <div class="orgchart-toolbar">
      <span class="orgchart-hint">
        <MousePointer2 class="w-3.5 h-3.5" />
        Faites glisser · Molette pour zoomer · Clic sur un nœud pour le détail
      </span>
    </div>

    <div class="orgchart-body">
      <Vue3OrgChart v-if="donnees.length" :data="donnees">
        <template #node="{ item, children, open, toggleChildren }">
          <div
            class="org-node"
            :class="`org-node--${item.type}`"
            @click.stop="emit('ouvrir', item.id)"
          >
            <div class="org-node__code-badge">{{ item.code }}</div>

            <div class="org-node__header">
              <UserAvatar v-if="item.responsableNom" :nom="item.responsableNom" taille="sm" />
              <div class="org-node__info">
                <div class="org-node__name">{{ item.nom }}</div>
                <div class="org-node__responsible">{{ item.responsableNom ?? '-' }}</div>
              </div>
            </div>

            <div class="org-node__footer">
              <span class="org-node__headcount">
                <Users class="w-3 h-3 inline-block align-[-1px]" /> {{ item.effectifReel }}
              </span>
              <span
                v-if="item.statut === 'a_valider'"
                class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning-bg text-warning"
              >À valider</span>
            </div>

            <button
              v-if="children.length"
              class="org-node__toggle"
              @click.stop="toggleChildren"
            >
              <Minus v-if="open" class="w-2.5 h-2.5" />
              <Plus v-else class="w-2.5 h-2.5" />
            </button>
          </div>
        </template>
      </Vue3OrgChart>

      <div v-else class="orgchart-empty">
        <Network class="w-9 h-9" />
        Aucune entité à afficher
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Organigramme glisser/zoomer, repris de vue3-org-chart comme dans les
 * autres projets bâtis sur le socle FMS. Le style des nœuds (bordure d'accent, badge de
 * code, pastille effectif) reprend le composant de référence, avec le
 * rouge UCODIS à la place du vert.
 */
import { computed } from 'vue'
import { Vue3OrgChart } from 'vue3-org-chart'
import 'vue3-org-chart/dist/style.css'
import { Minus, MousePointer2, Network, Plus, Users } from '@lucide/vue'
import UserAvatar from './ui/UserAvatar.vue'
import { useEntiteStore } from '../stores/entites'
import { usePersonnelStore } from '../stores/personnel'
import type { Entite } from '../types'

const emit = defineEmits<{ ouvrir: [id: string] }>()

const entites = useEntiteStore()
const personnel = usePersonnelStore()

/*
 * vue3-org-chart attend un tableau PLAT · chaque nœud porte son propre
 * parentId, la hiérarchie se déduit de cette relation, pas de tableaux
 * children imbriqués.
 */
interface NoeudOrgChart extends Entite {
  effectifReel: number
}

const donnees = computed<NoeudOrgChart[]>(() =>
  entites.liste.map(e => ({ ...e, effectifReel: personnel.parEntite(e.id).length })),
)
</script>

<style scoped>
.orgchart-wrap {
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  border-radius: 8px;
  border: 0.5px solid var(--color-border);
  overflow: hidden;
}

.orgchart-toolbar {
  padding: 8px 14px;
  background: var(--color-card);
  border-bottom: 0.5px solid var(--color-border);
}

.orgchart-hint {
  font-size: 11px;
  color: var(--color-muted-foreground);
  display: flex;
  align-items: center;
  gap: 5px;
}

.orgchart-body {
  min-height: 500px;
}

.orgchart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--color-muted-foreground);
  gap: 10px;
}

/* ── Nœud ── */
.org-node {
  position: relative;
  width: 190px;
  border-radius: 10px;
  padding: 10px 12px 14px;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10);
  box-sizing: border-box;
}
.org-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
}

.org-node--direction {
  background: #C23A32;
  color: #fff;
}
.org-node--service {
  background: var(--color-primary);
  color: #fff;
}
.org-node--equipe {
  background: var(--color-card);
  color: var(--color-foreground);
  border: 1.5px solid #6B7280;
}

.org-node__code-badge {
  position: absolute;
  top: 7px;
  right: 9px;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.22);
  color: inherit;
}
.org-node--equipe .org-node__code-badge {
  background: #F3F4F6;
  color: #6B7280;
}

.org-node__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-right: 28px;
}

.org-node__info { flex: 1; min-width: 0; }
.org-node__name {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.org-node__responsible {
  font-size: 10px;
  opacity: 0.75;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.org-node__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}
.org-node--equipe .org-node__footer {
  border-top-color: var(--color-border);
}

.org-node__headcount {
  font-size: 10px;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 3px;
}

.org-node__toggle {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  background: var(--color-card);
  color: var(--color-primary);
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  transition: background 0.12s;
}
.org-node--equipe .org-node__toggle {
  border-color: #6B7280;
  color: #6B7280;
}
.org-node__toggle:hover { background: rgba(232, 69, 60, 0.08); }

:deep(.vue3-org-chart-container) {
  --vue3-org-chart-line-color: var(--color-primary);
}
</style>
