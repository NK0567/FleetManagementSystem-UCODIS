<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { normalizeSearchText } from '@/utils/search'
import { buildOrgTree, filterOrgTree } from '../domain/orgTree'
import type { OrgUnitApi } from '../types/orgUnit.types'

const props = defineProps<{
  units: OrgUnitApi[]
  searchQuery: string
}>()
const emit = defineEmits<{ open: [no: string] }>()

const { t } = useI18n()

const query = computed(() => normalizeSearchText(props.searchQuery))

const roots = computed(() => {
  const tree = buildOrgTree(props.units)
  if (!query.value) return tree
  return filterOrgTree(tree, (unit) =>
    normalizeSearchText(`${unit.no} ${unit.name} ${unit.managerName}`).includes(query.value)
  )
})
</script>

<template>
  <div class="flex-1 min-h-0 overflow-y-auto mx-4 mb-4 border border-border rounded bg-card p-2">
    <ul v-if="roots.length">
      <OrgUnitTreeNode
        v-for="root in roots"
        :key="root.unit.no"
        :node="root"
        :depth="0"
        :expand-all="!!query"
        @open="emit('open', $event)"
      />
    </ul>
    <p v-else class="text-sm text-muted-foreground p-4">
      {{
        query
          ? t('hr.orgUnits.noSearchResults', { query: searchQuery })
          : t('hr.orgUnits.noResults')
      }}
    </p>
  </div>
</template>
