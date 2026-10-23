<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { documentTypeService, type DocumentTypeApi } from '@/modules/fleet/document-types'
import { documentIssues, suggestedExpiry } from '@/modules/fleet/documents'
import type { FileMeta } from '@/types/file.types'
import { todayIso } from '@/utils/date'
import { formatDate, formatDateTime } from '@/utils/format'
import type { CompanyDocumentApi } from '../types/companyDocument.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<CompanyDocumentApi>
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

const type = ref<DocumentTypeApi | null>(null)

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    name: '',
    documentTypeNo: '',
    orgUnitNo: null as string | null,
    keywords: [] as string[],
    issueDate: '',
    expiryDate: null as string | null,
    fileNo: null as string | null,
    supersedesNo: null as string | null
  }),
  createOnly: ['documentTypeNo', 'supersedesNo'],
  required: ['name', 'documentTypeNo', 'issueDate', 'fileNo'],
  labelOf: (field) => t(`fleet.companyDocuments.form.${field}`),
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

watch(
  () => draft.issueDate,
  (issueDate) => {
    if (!props.isNew || draft.expiryDate) return
    draft.expiryDate = suggestedExpiry(issueDate || null, type.value?.durationMonths ?? null)
  }
)

const keywordText = computed({
  get: () => draft.keywords.join(', '),
  set: (text: string) => {
    draft.keywords = text
      .split(',')
      .map((word) => word.trim())
      .filter(Boolean)
  }
})

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

const expandedSections = ref({ general: true, lifetime: true, review: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    name: 'general',
    documentTypeNo: 'general',
    fileNo: 'general',
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
      :title="t('fleet.companyDocuments.form.general')"
      :summary="[draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="name"
          :label="t('fleet.companyDocuments.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="documentTypeNo"
          :label="t('fleet.companyDocuments.form.documentTypeNo')"
          :required="isNew"
        >
          <ReferenceLookup
            v-model="draft.documentTypeNo"
            reference-key="companyDocumentTypes"
            :modal-title="t('fleet.companyDocuments.form.documentTypeNo')"
            detail-path="/fleet/document-types"
            :disabled="disabled || !isNew || !!draft.supersedesNo"
            :invalid="hasValidationError('documentTypeNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.companyDocuments.form.orgUnitNo')">
          <ReferenceLookup
            v-model="draft.orgUnitNo"
            reference-key="orgUnits"
            :modal-title="t('fleet.companyDocuments.form.orgUnitNo')"
            detail-path="/hr/org-units"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.companyDocuments.form.keywords')">
          <FormInput v-model="keywordText" :maxlength="200" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.companyDocuments.form.keywordsHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          field="fileNo"
          :label="t('fleet.companyDocuments.form.fileNo')"
          :required="isRequired('fileNo')"
        >
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
      :title="t('fleet.companyDocuments.form.lifetime')"
      :summary="[formatDate(draft.expiryDate)]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="issueDate"
          :label="t('fleet.companyDocuments.form.issueDate')"
          :required="isRequired('issueDate')"
        >
          <DateFormInput
            v-model="draft.issueDate"
            :disabled="disabled"
            :invalid="hasValidationError('issueDate')"
          />
        </BaseFormField>
        <BaseFormField
          v-if="limited"
          field="expiryDate"
          :label="t('fleet.companyDocuments.form.expiryDate')"
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
      <div v-if="!isNew && initialData.notifyOn" class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.documents.form.notifyOn')">
          <FormInput
            :model-value="
              t('fleet.documents.form.notifyOnValue', {
                date: formatDate(initialData.notifyOn),
                days: initialData.effectiveNoticeDays ?? 0
              })
            "
            disabled
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew || draft.supersedesNo"
      v-model:open="expandedSections.review"
      :title="t('fleet.companyDocuments.form.review')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField v-if="!isNew" :label="t('fleet.companyDocuments.form.depositedBy')">
          <FormInput
            :model-value="`${initialData.createdBy ?? ''} · ${formatDateTime(initialData.createdAt ?? null)}`"
            disabled
          />
        </BaseFormField>
        <BaseFormField
          v-if="initialData.decidedBy"
          :label="t('fleet.companyDocuments.form.decidedBy')"
        >
          <FormInput
            :model-value="`${initialData.decidedBy} · ${formatDateTime(initialData.decidedAt ?? null)}`"
            disabled
          />
        </BaseFormField>
        <BaseFormField
          v-if="initialData.decisionReason"
          :label="t('fleet.companyDocuments.form.decisionReason')"
        >
          <p class="text-sm text-card-foreground">{{ initialData.decisionReason }}</p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField v-if="!isNew" :label="t('fleet.companyDocuments.col.version')">
          <FormInput :model-value="initialData.version" disabled />
        </BaseFormField>
        <BaseFormField
          v-if="draft.supersedesNo"
          :label="t('fleet.companyDocuments.form.supersedesNo')"
        >
          <FormInput :model-value="draft.supersedesNo" disabled />
          <p v-if="isNew" class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.companyDocuments.form.supersedesHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          v-if="initialData.replacedByNo"
          :label="t('fleet.companyDocuments.form.replacedBy')"
        >
          <FormInput :model-value="initialData.replacedByNo" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
