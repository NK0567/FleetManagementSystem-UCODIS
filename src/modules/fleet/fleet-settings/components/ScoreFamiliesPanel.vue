<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import {
  SCORE_SOURCES,
  scoreFamiliesIssues,
  type ScoreFamilyRule,
  type ScoreSource
} from '@/modules/fleet/drivers/domain/driverScore'
import { fleetSettingsService } from '../services/fleetSettingsService'

/** The families of the driving score: code, label, weight and what each one counts. */
const props = defineProps<{ families: ScoreFamilyRule[]; canEdit: boolean }>()
const emit = defineEmits<{
  saved: [families: ScoreFamilyRule[]]
  'update:dirty': [dirty: boolean]
}>()

const { t } = useI18n()
const open = ref(false)
const draft = ref<ScoreFamilyRule[]>([])
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const copy = (families: readonly ScoreFamilyRule[]) =>
  families.map((family) => ({ ...family, sources: [...family.sources] }))

watch(
  () => props.families,
  (families) => {
    draft.value = copy(families)
  },
  { immediate: true }
)

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.families))
watch(dirty, (value) => emit('update:dirty', value))

const issues = computed(() => scoreFamiliesIssues(draft.value))
const totalWeight = computed(() =>
  draft.value.reduce((sum, family) => sum + (family.weight || 0), 0)
)

function toggleSource(family: ScoreFamilyRule, source: ScoreSource, checked: boolean) {
  family.sources = checked
    ? [...family.sources, source]
    : family.sources.filter((item) => item !== source)
}

function addFamily() {
  draft.value.push({ code: '', label: '', weight: 0, sources: [] })
}

function removeFamily(index: number) {
  draft.value.splice(index, 1)
}

/** Which family already counts a source, to show it taken elsewhere. */
function ownerOf(source: ScoreSource, except: number): string | null {
  const owner = draft.value.find(
    (family, index) => index !== except && family.sources.includes(source)
  )
  return owner ? owner.label || owner.code : null
}

async function save() {
  saving.value = true
  error.value = null
  success.value = null
  try {
    const saved = await fleetSettingsService.saveScoreFamilies(draft.value)
    emit('saved', saved)
    success.value = t('fleet.settings.scoreFamilies.saved')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.settings.saveError'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormSection
    v-model:open="open"
    :title="t('fleet.settings.scoreFamilies.title')"
    :summary="[t('fleet.settings.scoreFamilies.count', families.length)]"
  >
    <div class="xl:col-span-2 min-w-0 space-y-3 text-sm" data-testid="score-families">
      <p class="text-muted-foreground">{{ t('fleet.settings.scoreFamilies.hint') }}</p>
      <p class="text-muted-foreground">
        <span class="font-medium text-card-foreground">
          {{ t('fleet.settings.scoreFamilies.formulaTitle') }}
        </span>
        {{ t('fleet.settings.scoreFamilies.formula') }}
      </p>
      <FormAlerts
        :error="error"
        :success="success"
        @clear:error="error = null"
        @clear:success="success = null"
      />
      <div
        v-for="(family, index) in draft"
        :key="index"
        class="border border-border rounded p-3 space-y-2"
      >
        <div class="flex flex-wrap items-end gap-3">
          <BaseFormField :label="t('fleet.settings.scoreFamilies.code')" required>
            <FormInput v-model="family.code" :maxlength="20" :disabled="!canEdit" class="w-36" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.settings.scoreFamilies.label')" required>
            <FormInput v-model="family.label" :maxlength="60" :disabled="!canEdit" class="w-64" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.settings.scoreFamilies.weight')" required>
            <FormInput
              v-model="family.weight"
              type="number"
              :min="0"
              :max="100"
              :disabled="!canEdit"
              class="w-24"
            />
          </BaseFormField>
          <p class="text-xs text-muted-foreground pb-2">
            {{
              t('fleet.settings.scoreFamilies.share', {
                share: totalWeight > 0 ? Math.round(((family.weight || 0) * 100) / totalWeight) : 0
              })
            }}
          </p>
          <button
            v-if="canEdit"
            type="button"
            class="cursor-pointer ml-auto inline-flex items-center gap-1 text-xs text-destructive hover:underline pb-2"
            @click="removeFamily(index)"
          >
            <Trash2 class="w-4 h-4" /> {{ t('fleet.settings.scoreFamilies.remove') }}
          </button>
        </div>
        <div>
          <p class="text-xs text-muted-foreground mb-1">
            {{ t('fleet.settings.scoreFamilies.sources') }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <label
              v-for="source in SCORE_SOURCES"
              :key="source"
              class="flex items-start gap-2 text-sm text-card-foreground"
            >
              <input
                type="checkbox"
                class="h-4 w-4 mt-0.5 accent-primary"
                :checked="family.sources.includes(source)"
                :disabled="
                  !canEdit || (!family.sources.includes(source) && !!ownerOf(source, index))
                "
                @change="toggleSource(family, source, ($event.target as HTMLInputElement).checked)"
              />
              <span>
                {{ t(`fleet.settings.scoreSource.${source}`) }}
                <span class="block text-xs text-muted-foreground">
                  {{ t(`fleet.settings.scoreSource.${source}.formula`) }}
                  <template v-if="ownerOf(source, index)">
                    ·
                    {{
                      t('fleet.settings.scoreFamilies.takenBy', { family: ownerOf(source, index) })
                    }}
                  </template>
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
      <p v-if="issues.length && dirty" class="text-destructive text-xs">
        {{ t(`fleet.settings.scoreFamilies.issue.${issues[0]!.code}`) }}
      </p>
      <div v-if="canEdit" class="flex flex-wrap gap-2">
        <button
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent"
          @click="addFamily"
        >
          <Plus class="w-4 h-4 text-primary" /> {{ t('fleet.settings.scoreFamilies.add') }}
        </button>
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
          @click="draft = copy(families)"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </FormSection>
</template>
