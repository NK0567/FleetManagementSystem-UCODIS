<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Minus, MousePointer2, Plus, Users } from '@lucide/vue'
import { Vue3OrgChart, type OrgChartNode } from 'vue3-org-chart'
import 'vue3-org-chart/dist/style.css'
import type { OrgUnitApi } from '../types/orgUnit.types'

const props = defineProps<{ units: OrgUnitApi[] }>()
const emit = defineEmits<{ open: [no: string] }>()

const { t } = useI18n()

type ChartNode = OrgChartNode & { unit: OrgUnitApi }

const nodes = computed<ChartNode[]>(() =>
  props.units.map((unit) => ({ id: unit.no, parentId: unit.parentNo, unit }))
)

/** The chart reads its data once: a new key remounts it whenever the structure changes. */
const chartKey = computed(() =>
  props.units.map((unit) => `${unit.no}:${unit.parentNo}:${unit.modifiedAt}`).join('|')
)

const unitOf = (item: OrgChartNode) => (item as ChartNode).unit
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col mx-4 mb-4 border border-border rounded bg-background">
    <p
      class="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-card flex items-center gap-1.5"
    >
      <MousePointer2 class="w-3.5 h-3.5" /> {{ t('hr.orgUnits.chartHint') }}
    </p>
    <div class="flex-1 min-h-125">
      <Vue3OrgChart v-if="nodes.length" :key="chartKey" :data="nodes">
        <template #node="{ item, children, open, toggleChildren }">
          <div
            class="org-node relative w-56 bg-card border border-border border-t-4 border-t-primary rounded-md shadow-sm px-3 pt-3 pb-2 text-left cursor-pointer hover:shadow-md transition"
            @click.stop="emit('open', unitOf(item).no)"
          >
            <span
              class="absolute -top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded"
            >
              {{ unitOf(item).no }}
            </span>
            <p class="text-sm font-semibold text-card-foreground truncate">
              {{ unitOf(item).name }}
            </p>
            <p class="text-xs text-muted-foreground truncate">
              {{ unitOf(item).managerName || '-' }}
            </p>
            <div class="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1">
                <Users class="w-3 h-3" /> {{ unitOf(item).totalHeadcount }}
              </span>
              <OrgUnitStatusPill
                v-if="unitOf(item).status !== 'validated'"
                :status="unitOf(item).status"
              />
            </div>
            <button
              v-if="children.length"
              type="button"
              class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary"
              :aria-expanded="open"
              @click.stop="toggleChildren"
            >
              <Minus v-if="open" class="w-3 h-3" />
              <Plus v-else class="w-3 h-3" />
            </button>
          </div>
        </template>
      </Vue3OrgChart>
    </div>
  </div>
</template>
