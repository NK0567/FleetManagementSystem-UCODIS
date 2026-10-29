<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import {
  IMPORT_DEFAULT_COLUMNS,
  IMPORT_KINDS,
  importMappingIssues,
  type ImportKind,
  type ImportMapping,
  type ImportMappings
} from '../domain/importMappings'
import { fleetSettingsService } from '../services/fleetSettingsService'

/** For each import, the heading of the source file that feeds each field. */
const props = defineProps<{ mappings: ImportMappings; canEdit: boolean }>()
const emit = defineEmits<{
  saved: [kind: ImportKind, mapping: ImportMapping]
  'update:dirty': [dirty: boolean]
}>()

const { t } = useI18n()
const open = ref(false)
const kind = ref<ImportKind>('vehicles')
const draft = ref<ImportMapping>({})
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function reset() {
  draft.value = { ...(props.mappings[kind.value] ?? {}) }
}

watch([() => props.mappings, kind], reset, { immediate: true })

const fields = computed(() => Object.keys(IMPORT_DEFAULT_COLUMNS[kind.value]))
const clean = (mapping: ImportMapping) =>
  Object.fromEntries(Object.entries(mapping).filter(([, value]) => value.trim()))
const dirty = computed(
  () =>
    JSON.stringify(clean(draft.value)) !== JSON.stringify(clean(props.mappings[kind.value] ?? {}))
)
watch(dirty, (value) => emit('update:dirty', value))
const issues = computed(() => importMappingIssues(kind.value, clean(draft.value)))

async function save() {
  saving.value = true
  error.value = null
  success.value = null
  try {
    const saved = await fleetSettingsService.saveImportMapping(kind.value, clean(draft.value))
    emit('saved', kind.value, saved)
    success.value = t('fleet.settings.importMappings.saved')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.settings.saveError'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormSection v-model:open="open" :title="t('fleet.settings.importMappings.title')" :summary="[]">
    <div class="xl:col-span-2 min-w-0 space-y-3 text-sm" data-testid="import-mappings">
      <p class="text-muted-foreground">{{ t('fleet.settings.importMappings.hint') }}</p>
      <div class="flex flex-wrap gap-2" role="tablist">
        <button
          v-for="item in IMPORT_KINDS"
          :key="item"
          type="button"
          role="tab"
          :aria-selected="kind === item"
          class="cursor-pointer px-3 py-1.5 text-sm rounded border"
          :class="
            kind === item
              ? 'border-primary text-primary bg-primary/5'
              : 'border-border hover:bg-accent'
          "
          :disabled="dirty && kind !== item"
          @click="kind = item"
        >
          {{ t(`fleet.settings.importKind.${item}`) }}
        </button>
      </div>
      <FormAlerts
        :error="error"
        :success="success"
        @clear:error="error = null"
        @clear:success="success = null"
      />
      <table class="w-full text-sm border border-border rounded">
        <thead class="bg-muted/50 text-left">
          <tr>
            <th class="px-3 py-2 font-medium">{{ t('fleet.settings.importMappings.field') }}</th>
            <th class="px-3 py-2 font-medium">{{ t('fleet.settings.importMappings.heading') }}</th>
            <th class="px-3 py-2 font-medium">
              {{ t('fleet.settings.importMappings.defaults') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="field in fields" :key="field">
            <td class="px-3 py-1.5 text-card-foreground">
              {{ t(`fleet.settings.importField.${kind}.${field}`) }}
            </td>
            <td class="px-3 py-1.5">
              <FormInput
                :model-value="draft[field] ?? ''"
                :maxlength="60"
                :disabled="!canEdit"
                :placeholder="IMPORT_DEFAULT_COLUMNS[kind][field]![0]"
                @update:model-value="draft[field] = String($event ?? '')"
              />
            </td>
            <td class="px-3 py-1.5 text-xs text-muted-foreground">
              {{ IMPORT_DEFAULT_COLUMNS[kind][field]!.join(', ') }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="issues.length" class="text-destructive text-xs">
        {{ t(`fleet.settings.importMappings.issue.${issues[0]!.code}`) }}
      </p>
      <div v-if="canEdit" class="flex gap-2">
        <button
          type="button"
          class="cursor-pointer px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!dirty || saving || issues.length > 0"
          @click="save"
        >
          {{ t('common.save') }}
        </button>
        <button
          v-if="dirty"
          type="button"
          class="cursor-pointer px-3 py-1.5 text-sm border border-border rounded hover:bg-accent"
          @click="reset"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </FormSection>
</template>
