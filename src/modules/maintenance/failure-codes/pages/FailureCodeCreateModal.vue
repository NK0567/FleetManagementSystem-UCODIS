<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import FailureCodeForm from '../components/FailureCodeForm.vue'
import { failureCodeService } from '../services/failureCodeService'
import type { FailureCodeApi } from '../types/failureCode.types'

const emit = defineEmits<{ close: []; created: [failureCode: FailureCodeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof FailureCodeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: failureCodeService.create,
  createErrorFallback: t('maintenance.failureCodes.createError'),
  onCreated: (failureCode) => {
    emit('created', failureCode)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.failureCodes.new')"
    :banner-label="t('maintenance.failureCodes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <FailureCodeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
