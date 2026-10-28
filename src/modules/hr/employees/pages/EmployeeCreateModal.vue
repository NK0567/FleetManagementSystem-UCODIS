<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import EmployeeForm from '../components/EmployeeForm.vue'
import { employeeService } from '../services/employeeService'
import type { EmployeeApi } from '../types/employee.types'

const emit = defineEmits<{ close: []; created: [employee: EmployeeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof EmployeeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: employeeService.create,
  createErrorFallback: t('hr.employees.createError'),
  onCreated: (employee) => {
    emit('created', employee)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('hr.employees.new')"
    :banner-label="t('hr.employees.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <EmployeeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
