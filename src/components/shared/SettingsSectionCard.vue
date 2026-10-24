<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, PenLine, X } from '@lucide/vue'
import type { SettingField } from '@/core/utils/settingFields'

type Values = Record<string, unknown>
/** Field issues, plus any rule of the section that spans several fields. */
export interface SectionIssue {
  field: string
  code: string
  min?: number
  max?: number
}

const props = defineProps<{
  /** Translation prefix of the settings page, such as `fleet.settings`. */
  labelPrefix: string
  section: string
  fields: readonly SettingField[]
  values: Values
  validate: (values: Values) => SectionIssue[]
  canEdit: boolean
  saving: boolean
  /** Resolves to true once the server has accepted the values. */
  save: (values: Values) => Promise<boolean>
}>()
const emit = defineEmits<{ 'update:dirty': [dirty: boolean] }>()

const { t } = useI18n()

type Draft = Record<string, string | number | null>
const draft = ref<Draft | null>(null)
const isEditing = computed(() => draft.value !== null)
const shown = computed<Draft>(() => draft.value ?? ({ ...props.values } as Draft))

function toValues(values: Draft): Values {
  const result: Values = {}
  for (const field of props.fields) {
    const raw = values[field.key]
    if (field.kind === 'time') result[field.key] = String(raw ?? '').trim()
    else if (raw === '' || raw == null) result[field.key] = null
    else result[field.key] = Number(raw)
  }
  return result
}

const issues = computed(() => (draft.value ? props.validate(toValues(draft.value)) : []))

const isDirty = computed(
  () => !!draft.value && JSON.stringify(toValues(draft.value)) !== JSON.stringify(props.values)
)
watch(isDirty, (dirty) => emit('update:dirty', dirty))

function issueText(issue: SectionIssue): string {
  const field = props.fields.find((item) => item.key === issue.field)
  if (issue.code === 'outOfRange' && field && field.kind !== 'time') {
    return t(`${props.labelPrefix}.issue.outOfRange`, {
      min: issue.min ?? 0,
      max: issue.max ?? 0,
      unit: t(`${props.labelPrefix}.unit.${field.unit}`)
    })
  }
  return t(`${props.labelPrefix}.issue.${issue.code}`)
}

const issueMessages = computed(
  () => new Map(issues.value.map((issue) => [issue.field, issueText(issue)]))
)

function startEditing() {
  draft.value = { ...props.values } as Draft
}

async function submit() {
  if (!draft.value || issues.value.length > 0 || !isDirty.value) return
  if (await props.save(toValues(draft.value))) draft.value = null
}
</script>

<template>
  <section class="bg-card border border-border rounded">
    <header class="flex items-start justify-between gap-4 px-4 py-3 border-b border-border">
      <div>
        <h2 class="text-base font-semibold text-card-foreground">
          {{ t(`${labelPrefix}.section.${section}`) }}
        </h2>
        <p class="text-xs text-muted-foreground">
          {{ t(`${labelPrefix}.section.${section}.hint`) }}
        </p>
      </div>
      <div v-if="canEdit" class="flex items-center gap-2 shrink-0">
        <template v-if="isEditing">
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

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-3 px-4 py-4">
      <BaseFormField
        v-for="field in fields"
        :key="field.key"
        :field="field.key"
        :label="t(`${labelPrefix}.field.${section}.${field.key}`)"
        :required="field.kind === 'number'"
      >
        <div class="flex items-center gap-2">
          <div class="w-36 shrink-0">
            <FormInput
              v-model="shown[field.key]"
              :type="field.kind === 'time' ? 'time' : 'text'"
              :numeric-only="field.kind !== 'time'"
              :disabled="!isEditing || saving"
              :invalid="issueMessages.has(field.key)"
            />
          </div>
          <span v-if="field.kind !== 'time'" class="text-sm text-muted-foreground">
            {{ t(`${labelPrefix}.unit.${field.unit}`) }}
          </span>
        </div>
        <p v-if="issueMessages.has(field.key)" class="text-xs text-destructive mt-1">
          {{ issueMessages.get(field.key) }}
        </p>
      </BaseFormField>
    </div>
  </section>
</template>
