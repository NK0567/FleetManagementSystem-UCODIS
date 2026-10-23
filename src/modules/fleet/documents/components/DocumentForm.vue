<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { documentTypeService, type DocumentTypeApi } from '@/modules/fleet/document-types'
import type { FileMeta } from '@/types/file.types'
import { todayIso } from '@/utils/date'
import { formatDate, formatDateTime } from '@/utils/format'
import { documentIssues, suggestedExpiry } from '../domain/document'
import type { DocumentApi, SubjectKind } from '../types/document.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DocumentApi>
    disabled?: boolean
    isNew?: boolean
    validationErrors?: string[]
  }>(),
  {
    initialData: () => ({}),
    disabled: false,
    isNew: false,
    validationErrors: () => []
  }
)

const { t } = useI18n()

/** The type decides whether the document ends, and its usual duration. */
const type = ref<DocumentTypeApi | null>(null)

const { draft, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    target: 'vehicle' as SubjectKind,
    subjectNo: '',
    documentTypeNo: '',
    number: '',
    detail: '',
    issueDate: null as string | null,
    expiryDate: null as string | null,
    noticeDays: null as number | null,
    fileNo: null as string | null
  }),
  createOnly: ['target', 'subjectNo', 'documentTypeNo'],
  required: ['target', 'subjectNo', 'documentTypeNo'],
  labelOf: (field) => t(`fleet.documents.form.${field}`),
  validate: (values) =>
    documentIssues(values, type.value?.validity ?? 'limited', todayIso()).map(
      (issue): FormValidationError => ({
        fieldKey: issue === 'issueInFuture' ? 'issueDate' : 'expiryDate',
        label: t(`fleet.documents.issue.${issue}`)
      })
    )
})

watch(
  () => draft.documentTypeNo,
  async (code) => {
    type.value = code ? await documentTypeService.getById(code).catch(() => null) : null
  },
  { immediate: true }
)

const limited = computed(() => (type.value?.validity ?? 'limited') === 'limited')

/** A new document proposes its end date from the usual duration of its type. */
watch(
  () => draft.issueDate,
  (issueDate) => {
    if (!props.isNew || draft.expiryDate) return
    draft.expiryDate = suggestedExpiry(issueDate, type.value?.durationMonths ?? null)
  }
)

watch(
  () => draft.target,
  (target, previous) => {
    if (props.isNew && previous && target !== previous) {
      draft.subjectNo = ''
      draft.documentTypeNo = ''
    }
  }
)

const subjectReference = computed(() => (draft.target === 'vehicle' ? 'vehicles' : 'employees'))
const typeReference = computed(() =>
  draft.target === 'vehicle' ? 'vehicleDocumentTypes' : 'personDocumentTypes'
)

const file = ref<FileMeta | null>(props.initialData.file ?? null)
watch(
  () => props.initialData.file,
  (value) => {
    file.value = value ?? null
  }
)

function onUploaded(uploaded: FileMeta) {
  file.value = uploaded
  draft.fileNo = uploaded.no
}

function onRemoved() {
  file.value = null
  draft.fileNo = null
}

const expandedSections = ref({ general: true, lifetime: true, status: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    target: 'general',
    subjectNo: 'general',
    documentTypeNo: 'general',
    issueDate: 'lifetime',
    expiryDate: 'lifetime'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.documents.form.general')"
      :summary="[initialData.documentTypeName, initialData.subjectName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="target" :label="t('fleet.documents.form.target')" :required="isNew">
          <OptionsSelect
            :model-value="draft.target"
            options-key="documentTarget"
            :hidden-values="['company']"
            :disabled="disabled || !isNew"
            @update:model-value="draft.target = String($event) as SubjectKind"
          />
        </BaseFormField>
        <BaseFormField
          field="subjectNo"
          :label="t('fleet.documents.form.subjectNo')"
          :required="isNew"
        >
          <ReferenceLookup
            :key="subjectReference"
            v-model="draft.subjectNo"
            :reference-key="subjectReference"
            :modal-title="t('fleet.documents.form.subjectNo')"
            :detail-path="draft.target === 'vehicle' ? '/fleet/vehicles' : '/hr/employees'"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('subjectNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="documentTypeNo"
          :label="t('fleet.documents.form.documentTypeNo')"
          :required="isNew"
        >
          <ReferenceLookup
            :key="typeReference"
            v-model="draft.documentTypeNo"
            :reference-key="typeReference"
            :modal-title="t('fleet.documents.form.documentTypeNo')"
            detail-path="/fleet/document-types"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('documentTypeNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.documents.form.number')">
          <FormInput v-model="draft.number" :maxlength="60" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.documents.form.detail')">
          <FormInput v-model="draft.detail" :maxlength="120" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.documents.form.detailHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.documents.form.file')">
          <FileAttachmentField
            :file="file"
            :disabled="disabled"
            @uploaded="onUploaded"
            @removed="onRemoved"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.lifetime"
      :title="t('fleet.documents.form.lifetime')"
      :summary="[formatDate(draft.expiryDate)]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="issueDate" :label="t('fleet.documents.form.issueDate')">
          <DateFormInput
            v-model="draft.issueDate"
            :disabled="disabled"
            :invalid="hasValidationError('issueDate')"
          />
        </BaseFormField>
        <BaseFormField
          v-if="limited"
          field="expiryDate"
          :label="t('fleet.documents.form.expiryDate')"
          required
        >
          <DateFormInput
            v-model="draft.expiryDate"
            :disabled="disabled"
            :invalid="hasValidationError('expiryDate')"
          />
        </BaseFormField>
        <p v-else class="text-sm text-muted-foreground">
          {{ t('fleet.documents.form.unlimited') }}
        </p>
      </div>
      <div v-if="limited" class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.documents.form.noticeDays')">
          <FormInput
            v-model="draft.noticeDays"
            type="number"
            :min="0"
            :max="365"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.documents.form.noticeDaysHint') }}
          </p>
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.documents.form.notifyOn')">
          <FormInput
            :model-value="
              t('fleet.documents.form.notifyOnValue', {
                date: formatDate(initialData.notifyOn ?? null),
                days: initialData.effectiveNoticeDays ?? 0
              })
            "
            disabled
          />
        </BaseFormField>
      </div>
    </FormSection>

    <template v-if="!isNew">
      <FormSection
        v-model:open="expandedSections.status"
        :title="t('fleet.documents.form.status')"
        :summary="[]"
      >
        <div class="space-y-3 min-w-0">
          <BaseFormField :label="t('fleet.documents.col.state')">
            <DocumentStatePill v-if="initialData.state" :state="initialData.state" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.documents.col.version')">
            <FormInput :model-value="initialData.version" disabled />
          </BaseFormField>
          <BaseFormField
            v-if="initialData.replacedByNo"
            :label="t('fleet.documents.form.replacedBy')"
          >
            <FormInput :model-value="initialData.replacedByNo" disabled />
          </BaseFormField>
        </div>
        <div v-if="initialData.declaredStatus" class="space-y-3 min-w-0">
          <BaseFormField :label="t('fleet.documents.form.declaredReason')">
            <p class="text-sm text-card-foreground">{{ initialData.declaredReason }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ formatDateTime(initialData.declaredAt) }} · {{ initialData.declaredBy }}
            </p>
          </BaseFormField>
        </div>
      </FormSection>

      <AuditFormSection v-model:open="expandedSections.audit" :record="initialData" />
    </template>
  </div>
</template>
