<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { formatDateTime } from '@/utils/format'

defineProps<{
  record: {
    createdAt?: string
    createdBy?: string
    modifiedAt?: string
    modifiedBy?: string
  }
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
</script>

<template>
  <FormSection v-model:open="open" :title="t('common.audit.title')">
    <div class="space-y-3 min-w-0">
      <BaseFormField :label="t('common.audit.createdAt')">
        <FormInput :model-value="formatDateTime(record.createdAt)" disabled />
      </BaseFormField>
      <BaseFormField :label="t('common.audit.createdBy')">
        <FormInput :model-value="record.createdBy" disabled />
      </BaseFormField>
    </div>
    <div class="space-y-3 min-w-0">
      <BaseFormField :label="t('common.audit.modifiedAt')">
        <FormInput :model-value="formatDateTime(record.modifiedAt)" disabled />
      </BaseFormField>
      <BaseFormField :label="t('common.audit.modifiedBy')">
        <FormInput :model-value="record.modifiedBy" disabled />
      </BaseFormField>
    </div>
  </FormSection>
</template>
