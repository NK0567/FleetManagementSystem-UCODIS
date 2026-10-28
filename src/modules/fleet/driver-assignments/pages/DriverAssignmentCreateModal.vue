<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DriverAssignmentForm from '../components/DriverAssignmentForm.vue'
import { driverAssignmentService } from '../services/driverAssignmentService'
import type { DriverAssignmentApi } from '../types/driverAssignment.types'

const emit = defineEmits<{ close: []; created: [driverAssignment: DriverAssignmentApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DriverAssignmentForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: driverAssignmentService.create,
  createErrorFallback: t('fleet.driverAssignments.createError'),
  onCreated: (driverAssignment) => {
    emit('created', driverAssignment)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.driverAssignments.new')"
    :banner-label="t('fleet.driverAssignments.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DriverAssignmentForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
