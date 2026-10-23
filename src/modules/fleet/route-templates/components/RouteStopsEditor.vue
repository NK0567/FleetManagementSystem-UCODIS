<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import type { RouteStop, StopRole } from '../domain/routeTemplate'

const props = defineProps<{ disabled?: boolean }>()
const stops = defineModel<RouteStop[]>({ required: true })

const { t } = useI18n()

function update(index: number, patch: Partial<RouteStop>) {
  stops.value = stops.value.map((stop, position) =>
    position === index ? { ...stop, ...patch } : stop
  )
}

function move(index: number, offset: -1 | 1) {
  const target = index + offset
  if (target < 0 || target >= stops.value.length) return
  const next = [...stops.value]
  const [moved] = next.splice(index, 1)
  if (moved) next.splice(target, 0, moved)
  stops.value = next
}

function remove(index: number) {
  stops.value = stops.value.filter((_stop, position) => position !== index)
}

function add() {
  stops.value = [
    ...stops.value,
    { siteNo: '', role: 'delivery', plannedIntervalMin: 0, breakMin: 0 }
  ]
}

const minutes = (value: string | number) => Math.max(0, Number(value) || 0)
</script>

<template>
  <div class="space-y-2">
    <div class="overflow-x-auto border border-border rounded">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
            <th class="px-2 py-2 font-semibold w-8">#</th>
            <th class="px-2 py-2 font-semibold">{{ t('fleet.routeTemplates.stops.site') }}</th>
            <th class="px-2 py-2 font-semibold">{{ t('fleet.routeTemplates.stops.role') }}</th>
            <th class="px-2 py-2 font-semibold">{{ t('fleet.routeTemplates.stops.interval') }}</th>
            <th class="px-2 py-2 font-semibold">{{ t('fleet.routeTemplates.stops.break') }}</th>
            <th v-if="!props.disabled" class="w-28"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(stop, index) in stops" :key="index" class="border-t border-border align-top">
            <td class="px-2 py-2 text-muted-foreground">{{ index + 1 }}</td>
            <td class="px-2 py-2 min-w-72">
              <ReferenceLookup
                :model-value="stop.siteNo"
                reference-key="sites"
                :modal-title="t('fleet.routeTemplates.stops.site')"
                :disabled="props.disabled"
                @update:model-value="update(index, { siteNo: $event ?? '' })"
              />
            </td>
            <td class="px-2 py-2 min-w-40">
              <OptionsSelect
                :model-value="stop.role"
                options-key="stopRole"
                :disabled="props.disabled"
                @update:model-value="update(index, { role: String($event) as StopRole })"
              />
            </td>
            <td class="px-2 py-2 min-w-28">
              <FormInput
                :model-value="index === 0 ? 0 : stop.plannedIntervalMin"
                type="number"
                :min="0"
                :disabled="props.disabled || index === 0"
                @update:model-value="update(index, { plannedIntervalMin: minutes($event) })"
              />
            </td>
            <td class="px-2 py-2 min-w-28">
              <FormInput
                :model-value="stop.breakMin"
                type="number"
                :min="0"
                :disabled="props.disabled"
                @update:model-value="update(index, { breakMin: minutes($event) })"
              />
            </td>
            <td v-if="!props.disabled" class="px-2 py-2 whitespace-nowrap text-right">
              <button
                type="button"
                class="p-1.5 rounded hover:bg-accent disabled:opacity-40"
                :disabled="index === 0"
                :aria-label="t('fleet.routeTemplates.stops.moveUp')"
                @click="move(index, -1)"
              >
                <ArrowUp class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="p-1.5 rounded hover:bg-accent disabled:opacity-40"
                :disabled="index === stops.length - 1"
                :aria-label="t('fleet.routeTemplates.stops.moveDown')"
                @click="move(index, 1)"
              >
                <ArrowDown class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="p-1.5 text-destructive rounded hover:bg-destructive/10"
                :aria-label="t('fleet.routeTemplates.stops.remove')"
                @click="remove(index)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button
      v-if="!props.disabled"
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
      @click="add"
    >
      <Plus class="w-4 h-4" /> {{ t('fleet.routeTemplates.stops.add') }}
    </button>
  </div>
</template>
