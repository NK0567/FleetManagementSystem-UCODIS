<script lang="ts" setup>
import { ref } from 'vue'
import { ChevronRight, Users } from '@lucide/vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { OrgUnitNode } from '../domain/orgTree'
import type { OrgUnitApi } from '../types/orgUnit.types'

const props = defineProps<{
  node: OrgUnitNode<OrgUnitApi>
  depth: number
  /** Open every branch, e.g. while a search is active. */
  expandAll: boolean
}>()
const emit = defineEmits<{ open: [no: string] }>()

const optionsStore = useOptionsStore()
const expanded = ref(props.depth < 2)
</script>

<template>
  <li>
    <div
      class="flex items-center gap-2 py-1.5 pr-3 rounded hover:bg-accent cursor-pointer"
      :style="{ paddingLeft: `${depth * 1.5 + 0.5}rem` }"
      @click="emit('open', node.unit.no)"
    >
      <button
        type="button"
        class="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-muted shrink-0"
        :class="node.children.length ? '' : 'invisible'"
        :aria-expanded="expanded || expandAll"
        @click.stop="expanded = !expanded"
      >
        <ChevronRight
          class="w-4 h-4 transition-transform"
          :class="expanded || expandAll ? 'rotate-90' : ''"
        />
      </button>
      <span class="text-primary font-medium text-sm w-16 shrink-0">{{ node.unit.no }}</span>
      <span class="text-sm text-card-foreground truncate">{{ node.unit.name }}</span>
      <span class="text-xs text-muted-foreground shrink-0">
        {{ optionsStore.getOptionLabel('orgUnitType', node.unit.type) }}
      </span>
      <OrgUnitStatusPill
        v-if="node.unit.status !== 'validated'"
        :status="node.unit.status"
        class="shrink-0"
      />
      <span class="ml-auto flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span class="truncate max-w-48">{{ node.unit.managerName }}</span>
        <span class="inline-flex items-center gap-1 w-12 justify-end">
          <Users class="w-3.5 h-3.5" /> {{ node.unit.totalHeadcount }}
        </span>
      </span>
    </div>
    <ul v-if="node.children.length && (expanded || expandAll)">
      <OrgUnitTreeNode
        v-for="child in node.children"
        :key="child.unit.no"
        :node="child"
        :depth="depth + 1"
        :expand-all="expandAll"
        @open="emit('open', $event)"
      />
    </ul>
  </li>
</template>
