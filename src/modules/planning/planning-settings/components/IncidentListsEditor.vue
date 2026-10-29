<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, PenLine, Plus, Trash2, X } from '@lucide/vue'
import {
  INCIDENT_LISTS,
  incidentListIssues,
  type IncidentList,
  type IncidentSettings
} from '../domain/planningSettings'

/**
 * The incident types, reason types and reason codes used to cancel or deviate a delivery note
 * (TRS07-US06): kept by the administrator, read by the planners on their screens.
 */
const props = defineProps<{
  lists: IncidentSettings
  canEdit: boolean
  saving: boolean
  save: (lists: IncidentSettings) => Promise<boolean>
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean] }>()

const { t } = useI18n()
const draft = ref<IncidentSettings | null>(null)
const shown = computed(() => draft.value ?? props.lists)
const isDirty = computed(
  () => !!draft.value && JSON.stringify(draft.value) !== JSON.stringify(props.lists)
)
const issues = computed(() => (draft.value ? incidentListIssues(draft.value) : []))
watch(isDirty, (dirty) => emit('update:dirty', dirty))

function startEditing() {
  draft.value = structuredClone({
    incidentTypes: props.lists.incidentTypes,
    reasonTypes: props.lists.reasonTypes,
    reasonCodes: props.lists.reasonCodes
  })
}

function add(list: IncidentList) {
  if (!draft.value) return
  if (list === 'reasonCodes') {
    draft.value.reasonCodes.push({
      no: '',
      name: '',
      reasonTypeNo: draft.value.reasonTypes[0]?.no ?? '',
      active: true
    })
  } else draft.value[list].push({ no: '', name: '', active: true })
}

function remove(list: IncidentList, index: number) {
  draft.value?.[list].splice(index, 1)
}

async function submit() {
  if (draft.value && (await props.save(draft.value))) draft.value = null
}

const inputClass =
  'w-full h-8 px-2 text-sm border border-border rounded bg-background outline-none focus:border-primary disabled:bg-transparent disabled:border-transparent'
</script>

<template>
  <section class="bg-card border border-border rounded">
    <header class="flex items-start justify-between gap-4 px-4 py-3 border-b border-border">
      <div>
        <h2 class="text-base font-semibold text-card-foreground">
          {{ t('planning.settings.incidents.title') }}
        </h2>
        <p class="text-xs text-muted-foreground">{{ t('planning.settings.incidents.hint') }}</p>
      </div>
      <div v-if="canEdit" class="flex items-center gap-2 shrink-0">
        <template v-if="draft">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
            :disabled="saving"
            @click="draft = null"
          >
            <X class="w-4 h-4" /> {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="saving || !isDirty || issues.length > 0"
            @click="submit"
          >
            <Check class="w-4 h-4" /> {{ t('common.save') }}
          </button>
        </template>
        <button
          v-else
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
          @click="startEditing"
        >
          <PenLine class="w-4 h-4" /> {{ t('common.edit') }}
        </button>
      </div>
    </header>
    <p v-for="issue in issues" :key="issue" class="px-4 pt-3 text-xs text-destructive">
      {{ t(`planning.settings.incidents.issue.${issue}`) }}
    </p>
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 px-4 py-4">
      <div v-for="list in INCIDENT_LISTS" :key="list" class="min-w-0">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-card-foreground">
            {{ t(`planning.settings.incidents.${list}`) }}
          </h3>
          <button
            v-if="draft"
            type="button"
            class="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-accent"
            @click="add(list)"
          >
            <Plus class="w-3.5 h-3.5 text-primary" /> {{ t('planning.settings.incidents.add') }}
          </button>
        </div>
        <table class="w-full text-sm border border-border rounded">
          <thead>
            <tr class="bg-muted/40 text-xs text-muted-foreground">
              <th class="px-2 py-1.5 text-left font-semibold w-32">
                {{ t('planning.settings.incidents.code') }}
              </th>
              <th class="px-2 py-1.5 text-left font-semibold">
                {{ t('planning.settings.incidents.name') }}
              </th>
              <th v-if="list === 'reasonCodes'" class="px-2 py-1.5 text-left font-semibold">
                {{ t('planning.settings.incidents.reasonType') }}
              </th>
              <th class="px-2 py-1.5 text-center font-semibold w-16">
                {{ t('planning.settings.incidents.active') }}
              </th>
              <th v-if="draft" class="w-8" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="!shown[list].length">
              <td colspan="5" class="px-2 py-2 text-xs text-muted-foreground">
                {{ t('planning.settings.incidents.empty') }}
              </td>
            </tr>
            <tr v-for="(item, index) in shown[list]" :key="index" class="border-t border-border">
              <td class="px-1 py-1">
                <input
                  v-model="item.no"
                  :class="inputClass"
                  :disabled="!draft || saving"
                  maxlength="30"
                  :aria-label="t('planning.settings.incidents.code')"
                />
              </td>
              <td class="px-1 py-1">
                <input
                  v-model="item.name"
                  :class="inputClass"
                  :disabled="!draft || saving"
                  maxlength="80"
                  :aria-label="t('planning.settings.incidents.name')"
                />
              </td>
              <td v-if="list === 'reasonCodes'" class="px-1 py-1">
                <select
                  v-model="(item as { reasonTypeNo: string }).reasonTypeNo"
                  :class="inputClass"
                  :disabled="!draft || saving"
                  :aria-label="t('planning.settings.incidents.reasonType')"
                >
                  <option v-for="type in shown.reasonTypes" :key="type.no" :value="type.no">
                    {{ type.name || type.no }}
                  </option>
                </select>
              </td>
              <td class="px-1 py-1 text-center">
                <input
                  v-model="item.active"
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                  :disabled="!draft || saving"
                  :aria-label="t('planning.settings.incidents.active')"
                />
              </td>
              <td v-if="draft" class="px-1 py-1 text-center">
                <button
                  type="button"
                  class="cursor-pointer p-1 rounded text-destructive hover:bg-destructive/10"
                  :aria-label="t('planning.settings.incidents.remove')"
                  :title="t('planning.settings.incidents.remove')"
                  @click="remove(list, index)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
