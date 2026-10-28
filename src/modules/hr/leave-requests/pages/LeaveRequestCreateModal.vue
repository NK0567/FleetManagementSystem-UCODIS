<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import LeaveRequestForm from '../components/LeaveRequestForm.vue'
import { leaveRequestService } from '../services/leaveRequestService'
import type { LeaveRequestApi } from '../types/leaveRequest.types'

const emit = defineEmits<{ close: []; created: [request: LeaveRequestApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof LeaveRequestForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: leaveRequestService.create,
  createErrorFallback: t('hr.leaveRequests.createError'),
  onCreated: (request) => {
    emit('created', request)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('hr.leaveRequests.new')"
    :banner-label="t('hr.leaveRequests.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <LeaveRequestForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
