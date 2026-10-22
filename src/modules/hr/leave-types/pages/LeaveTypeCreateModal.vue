<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import LeaveTypeForm from '../components/LeaveTypeForm.vue'
import { leaveTypeService } from '../services/leaveTypeService'
import type { LeaveTypeApi } from '../types/leaveType.types'

const emit = defineEmits<{ close: []; created: [leaveType: LeaveTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof LeaveTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: leaveTypeService.create,
  createErrorFallback: t('hr.leaveTypes.createError'),
  onCreated: (leaveType) => {
    emit('created', leaveType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('hr.leaveTypes.new')"
    :banner-label="t('hr.leaveTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <LeaveTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
